import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { parseQrPayload } from "@/lib/id-cards";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScanLine, LogIn, LogOut, CameraOff, Keyboard } from "lucide-react";

export const Route = createFileRoute("/_admin/scanner")({
  ssr: false,
  component: ScannerPage,
  head: () => ({
    meta: [
      { title: "QR Gate Scanner | Bhest Brhain Academy" },
      { name: "description", content: "Scan student and staff QR ID cards with any phone camera to log gate check-in, check-out and mark attendance instantly." },
      { property: "og:title", content: "QR Gate Scanner" },
      { property: "og:description", content: "Instant camera-based attendance and gate logging for students and staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ScannerPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const [scanning, setScanning] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [lastResult, setLastResult] = useState<{ name: string; code: string; ok: boolean; note: string } | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const { data: logs = [] } = useQuery({
    queryKey: ["gate-logs"],
    queryFn: async () =>
      (await supabase.from("gate_logs").select("*").gte("scanned_at", `${today}T00:00:00`).order("scanned_at", { ascending: false }).limit(50)).data ?? [],
    refetchInterval: 10000,
  });

  async function handleCode(raw: string) {
    const parsed = parseQrPayload(raw) ?? (/^BBA[-A-Z0-9]+$/i.test(raw.trim())
      ? { kind: raw.trim().toUpperCase().startsWith("BBA-S") ? ("staff" as const) : ("student" as const), code: raw.trim().toUpperCase() }
      : null);

    if (!parsed) {
      setLastResult({ name: "Unrecognised code", code: raw.slice(0, 24), ok: false, note: "This is not a Bhest Brhain Academy ID." });
      return;
    }

    const now = Date.now();
    if (lastRef.current.code === parsed.code && now - lastRef.current.at < 4000) return;
    lastRef.current = { code: parsed.code, at: now };

    if (parsed.kind === "student") {
      const { data: student } = await supabase.from("students").select("id, full_name, class").eq("student_code", parsed.code).maybeSingle();
      if (!student) {
        setLastResult({ name: "Not found", code: parsed.code, ok: false, note: "No student holds this ID." });
        return;
      }
      const { error } = await supabase.from("gate_logs").insert({
        person_type: "student", person_code: parsed.code, student_id: student.id, direction, scanned_by: user?.id ?? null,
      });
      if (error) { toast.error("Scan could not be saved."); return; }

      let note = direction === "in" ? "Checked in" : "Checked out";
      if (direction === "in") {
        const { data: existing } = await supabase.from("attendance").select("id").eq("student_id", student.id).eq("date", today).maybeSingle();
        if (!existing) {
          const hour = new Date().getHours();
          const status = hour >= 8 ? "Late" : "Present";
          await supabase.from("attendance").insert({ student_id: student.id, date: today, status });
          note = `Checked in · attendance marked ${status}`;
          qc.invalidateQueries({ queryKey: ["attendance"] });
        } else {
          note = "Checked in · attendance already recorded";
        }
      }
      setLastResult({ name: student.full_name, code: parsed.code, ok: true, note: `${student.class} — ${note}` });
      toast.success(`${student.full_name} — ${note}`);
    } else {
      const { data: member } = await supabase.from("staff").select("id, full_name, role").eq("staff_code", parsed.code).maybeSingle();
      if (!member) {
        setLastResult({ name: "Not found", code: parsed.code, ok: false, note: "No staff member holds this ID." });
        return;
      }
      const { error } = await supabase.from("gate_logs").insert({
        person_type: "staff", person_code: parsed.code, staff_id: member.id, direction, scanned_by: user?.id ?? null,
      });
      if (error) { toast.error("Scan could not be saved."); return; }
      setLastResult({ name: member.full_name, code: parsed.code, ok: true, note: `${member.role} — ${direction === "in" ? "Checked in" : "Checked out"}` });
      toast.success(`${member.full_name} ${direction === "in" ? "checked in" : "checked out"}`);
    }
    qc.invalidateQueries({ queryKey: ["gate-logs"] });
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
          if (code?.data) void handleCode(code.data);
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function start() {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCamError("Camera access was blocked. Allow camera permission, or use the manual entry box below.");
    }
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <ScanLine className="h-6 w-6 text-primary" /> QR Gate Scanner
        </h1>
        <p className="text-sm text-muted-foreground">
          Point any phone camera at an ID card. Students are checked in and marked present automatically.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Live camera</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant={direction === "in" ? "default" : "outline"} onClick={() => setDirection("in")}>
                  <LogIn className="mr-1.5 h-4 w-4" /> Check in
                </Button>
                <Button size="sm" variant={direction === "out" ? "default" : "outline"} onClick={() => setDirection("out")}>
                  <LogOut className="mr-1.5 h-4 w-4" /> Check out
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted sm:aspect-video">
              <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${scanning ? "" : "hidden"}`} />
              <canvas ref={canvasRef} className="hidden" />
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <CameraOff className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{camError ?? "Camera is off."}</p>
                </div>
              )}
              {scanning && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="h-40 w-40 rounded-2xl border-4 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] sm:h-52 sm:w-52" />
                </div>
              )}
            </div>
            <Button onClick={scanning ? stop : start} className="w-full" variant={scanning ? "destructive" : "default"}>
              {scanning ? "Stop scanning" : "Start scanning"}
            </Button>

            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Keyboard className="h-3.5 w-3.5" /> Manual entry / USB scanner
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { void handleCode(manual.trim()); setManual(""); } }}
              >
                <Input placeholder="e.g. BBA0001" value={manual} onChange={(e) => setManual(e.target.value)} className="font-mono" />
                <Button type="submit" variant="secondary">Log</Button>
              </form>
            </div>

            {lastResult && (
              <div className={`rounded-lg border p-3 ${lastResult.ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"}`}>
                <p className="font-semibold">{lastResult.name}</p>
                <p className="text-xs text-muted-foreground">{lastResult.code} · {lastResult.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's gate activity</CardTitle>
            <CardDescription>{logs.length} scan{logs.length === 1 ? "" : "s"} logged today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">{l.person_code}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(l.scanned_at), "HH:mm")} · {l.person_type}</p>
                </div>
                <Badge variant={l.direction === "in" ? "default" : "secondary"} className="shrink-0">
                  {l.direction === "in" ? "IN" : "OUT"}
                </Badge>
              </div>
            ))}
            {logs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No scans yet today.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

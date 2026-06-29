import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cake, Music, Square } from "lucide-react";
import { playBirthdaySong, stopBirthdaySong } from "@/lib/birthday-song";

type Person = { id: string; full_name: string; dob: string | null; photo_url?: string | null; kind: "student" | "staff" };

function isBirthdayToday(dob: string | null): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  const today = new Date();
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function daysUntil(dob: string | null): number {
  if (!dob) return 999;
  const today = new Date();
  const d = new Date(dob);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
}

export function BirthdayCard({ people }: { people: Person[] }) {
  const today = useMemo(() => people.filter((p) => isBirthdayToday(p.dob)), [people]);
  const upcoming = useMemo(
    () => people.filter((p) => !isBirthdayToday(p.dob)).map((p) => ({ ...p, days: daysUntil(p.dob) })).sort((a, b) => a.days - b.days).slice(0, 3),
    [people],
  );
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (today.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % today.length), 5000);
    return () => clearInterval(t);
  }, [today.length]);

  useEffect(() => () => stopBirthdaySong(), []);

  async function toggle() {
    if (playing) { stopBirthdaySong(); setPlaying(false); return; }
    setPlaying(true);
    try { await playBirthdaySong(); } finally { setTimeout(() => setPlaying(false), 13000); }
  }

  const featured = today[idx];

  return (
    <Card className="overflow-hidden border-accent/40">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-accent/20 to-transparent">
        <CardTitle className="flex items-center gap-2"><Cake className="h-5 w-5 text-accent" />Birthday Corner</CardTitle>
        {today.length > 0 && (
          <Button size="sm" variant={playing ? "destructive" : "default"} onClick={toggle} className={playing ? "" : "bg-accent text-accent-foreground hover:bg-accent/90"}>
            {playing ? <><Square className="mr-1 h-3 w-3" />Stop</> : <><Music className="mr-1 h-3 w-3" />Play song</>}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {today.length === 0 && (
          <p className="text-sm text-muted-foreground">No birthdays today. 🎉 Upcoming:</p>
        )}
        {featured && (
          <div className="flex items-center gap-4 rounded-lg bg-gradient-to-br from-accent/15 via-background to-primary/10 p-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
              <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-accent shadow-lg">
                {featured.photo_url ? (
                  <img src={featured.photo_url} alt={featured.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-primary text-2xl text-primary-foreground">
                    {featured.full_name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-accent">🎂 Happy Birthday!</p>
              <p className="font-display text-xl font-bold text-foreground truncate">{featured.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{featured.kind}</p>
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coming up</p>
            {upcoming.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                <span className="truncate">{p.full_name}</span>
                <span className="text-xs text-accent font-medium">in {p.days}d</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

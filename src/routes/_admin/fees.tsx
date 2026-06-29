import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CLASSES, formatCedis } from "@/lib/format";
import { Printer } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_admin/fees")({ component: FeesPage });

function FeesPage() {
  const qc = useQueryClient();
  const { data: structures = [] } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => (await supabase.from("fee_structures").select("*").order("class")).data ?? [],
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => (await supabase.from("students").select("id,full_name,class,fee_balance").order("full_name")).data ?? [],
  });
  const { data: fees = [] } = useQuery({
    queryKey: ["fees-all"],
    queryFn: async () => (await supabase.from("fees").select("*,students(full_name,class)").order("payment_date", { ascending: false })).data ?? [],
  });

  // structure form
  const [sClass, setSClass] = useState("Primary 1");
  const [sAmount, setSAmount] = useState("");
  async function saveStructure() {
    const amt = Number(sAmount);
    if (!amt) return toast.error("Enter amount");
    const { error } = await supabase.from("fee_structures").upsert({ class: sClass, amount: amt }, { onConflict: "class" });
    if (error) return toast.error(error.message);
    toast.success("Fee structure saved");
    setSAmount("");
    qc.invalidateQueries({ queryKey: ["fee-structures"] });
  }

  // payment form
  const [pStudent, setPStudent] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pMethod, setPMethod] = useState("Cash");
  async function recordPayment() {
    const amt = Number(pAmount);
    if (!pStudent || !amt) return toast.error("Select student and amount");
    const student = students.find((s) => s.id === pStudent);
    if (!student) return;
    const newBalance = Math.max(0, Number(student.fee_balance) - amt);
    const receipt_no = "RCP-" + Date.now().toString(36).toUpperCase();
    const { data: feeRow, error } = await supabase.from("fees").insert({
      student_id: pStudent, amount_paid: amt, payment_method: pMethod, balance: newBalance, receipt_no,
    }).select("*,students(full_name,class)").single();
    if (error) return toast.error(error.message);
    await supabase.from("students").update({ fee_balance: newBalance }).eq("id", pStudent);
    toast.success("Payment recorded");
    setPAmount("");
    qc.invalidateQueries({ queryKey: ["fees-all"] });
    qc.invalidateQueries({ queryKey: ["students-list"] });
    qc.invalidateQueries({ queryKey: ["students"] });
    printReceipt(feeRow);
  }

  function printReceipt(fee: any) {
    const doc = new jsPDF();
    doc.setFillColor(28, 38, 78);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Akasanoma School — Payment Receipt", 14, 18);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    let y = 45;
    const rows: [string, string][] = [
      ["Receipt No", fee.receipt_no ?? "—"],
      ["Date", fee.payment_date],
      ["Student", fee.students?.full_name ?? ""],
      ["Class", fee.students?.class ?? ""],
      ["Method", fee.payment_method],
      ["Amount Paid", formatCedis(fee.amount_paid)],
      ["Balance", formatCedis(fee.balance)],
    ];
    rows.forEach(([k, v]) => { doc.text(`${k}:`, 14, y); doc.text(String(v), 70, y); y += 9; });
    doc.setDrawColor(212, 165, 55);
    doc.line(14, y + 5, 196, y + 5);
    doc.setFontSize(9);
    doc.text("Thank you for your payment.", 14, y + 14);
    doc.save(`receipt-${fee.receipt_no}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-bold">Fees</h1><p className="text-sm text-muted-foreground">Manage fees in Ghana cedis (₵)</p></div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Record Payment</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="balances">All Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>New Payment</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Student</Label>
                <Select value={pStudent} onValueChange={setPStudent}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.class} ({formatCedis(s.fee_balance)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (₵)</Label><Input type="number" value={pAmount} onChange={(e) => setPAmount(e.target.value)} /></div>
              <div>
                <Label>Method</Label>
                <Select value={pMethod} onValueChange={setPMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Cash", "Mobile Money", "Bank Transfer", "Cheque"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4"><Button onClick={recordPayment} className="bg-primary text-primary-foreground">Record Payment & Print Receipt</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Balance</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {fees.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.payment_date}</TableCell>
                      <TableCell>{f.students?.full_name}</TableCell>
                      <TableCell>{f.payment_method}</TableCell>
                      <TableCell className="font-mono">{formatCedis(f.amount_paid)}</TableCell>
                      <TableCell className="font-mono">{formatCedis(f.balance)}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => printReceipt(f)}><Printer className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures">
          <Card>
            <CardHeader><CardTitle>Set Fee per Class</CardTitle><CardDescription>e.g. Primary 1 = ₵1,500.00</CardDescription></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Class</Label>
                <Select value={sClass} onValueChange={setSClass}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (₵)</Label><Input type="number" value={sAmount} onChange={(e) => setSAmount(e.target.value)} /></div>
              <div className="flex items-end"><Button onClick={saveStructure} className="w-full bg-primary text-primary-foreground">Save</Button></div>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Current Structures</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>{structures.map((s: any) => (<TableRow key={s.id}><TableCell>{s.class}</TableCell><TableCell className="text-right font-mono">{formatCedis(s.amount)}</TableCell></TableRow>))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader><CardTitle>Outstanding Balances</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>{students.map((s) => (<TableRow key={s.id}><TableCell>{s.full_name}</TableCell><TableCell>{s.class}</TableCell><TableCell className="text-right font-mono">{formatCedis(s.fee_balance)}</TableCell></TableRow>))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

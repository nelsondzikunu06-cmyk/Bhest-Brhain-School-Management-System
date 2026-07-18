import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_student_fees",
  title: "Get student fees",
  description:
    "Return fee payment history and current balance for a student. RLS restricts parents to their own child's fees.",
  inputSchema: { student_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const [feesRes, studentRes] = await Promise.all([
      sb
        .from("fees")
        .select("amount_paid, balance, payment_date, payment_method, receipt_no")
        .eq("student_id", student_id)
        .order("payment_date", { ascending: false }),
      sb.from("students").select("full_name, class, fee_balance").eq("id", student_id).maybeSingle(),
    ]);
    if (feesRes.error) return { content: [{ type: "text", text: feesRes.error.message }], isError: true };
    if (studentRes.error) return { content: [{ type: "text", text: studentRes.error.message }], isError: true };
    const payload = { student: studentRes.data, payments: feesRes.data };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

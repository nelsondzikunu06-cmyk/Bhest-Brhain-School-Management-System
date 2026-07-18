import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_student_attendance",
  title: "Get student attendance",
  description:
    "Return attendance records for a student. RLS restricts parents to their own child's records.",
  inputSchema: {
    student_id: z.string().uuid(),
    from: z.string().optional().describe("ISO date (YYYY-MM-DD), inclusive."),
    to: z.string().optional().describe("ISO date (YYYY-MM-DD), inclusive."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_id, from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb.from("attendance").select("date, status").eq("student_id", student_id).order("date", { ascending: false });
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    const { data, error } = await q.limit(500);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { attendance: data },
    };
  },
});

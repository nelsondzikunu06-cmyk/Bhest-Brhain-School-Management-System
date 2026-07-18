import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_students",
  title: "List students",
  description:
    "List students visible to the signed-in user. Admins see all students; parents see only their linked children. Returns id, student_code, full name, class, and status.",
  inputSchema: {
    search: z.string().optional().describe("Optional case-insensitive substring match against full name."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("students")
      .select("id, student_code, full_name, class, status, fee_balance")
      .order("full_name")
      .limit(limit ?? 50);
    if (search) q = q.ilike("full_name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { students: data },
    };
  },
});

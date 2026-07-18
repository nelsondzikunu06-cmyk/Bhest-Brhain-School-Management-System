import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_student_grades",
  title: "Get student grades",
  description:
    "Return grades for a student. RLS enforces that parents can only read their own child's grades.",
  inputSchema: {
    student_id: z.string().uuid().describe("Student UUID (from list_students)."),
    term: z.string().optional(),
    academic_year: z.string().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_id, term, academic_year }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("grades")
      .select("subject, score, term, academic_year, teacher_comment")
      .eq("student_id", student_id);
    if (term) q = q.eq("term", term);
    if (academic_year) q = q.eq("academic_year", academic_year);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { grades: data },
    };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_announcement",
  title: "Create announcement",
  description:
    "Create a school-wide announcement. Only admins can create; RLS will reject non-admin callers.",
  inputSchema: {
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(4000),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, body }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("announcements")
      .insert({ title, body, created_by: ctx.getUserId() })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Announcement created: ${data?.id}` }],
      structuredContent: { announcement: data },
    };
  },
});

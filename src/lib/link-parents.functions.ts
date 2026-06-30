import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden");
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const target = email.toLowerCase().trim();
  let page = 1;
  // paginate just in case
  while (page < 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page++;
  }
  return null;
}

export const linkParentToStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ studentId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .select("id, parent_email, parent_user_id")
      .eq("id", data.studentId)
      .single();
    if (sErr) throw new Error(sErr.message);
    if (!student.parent_email) throw new Error("Student has no parent email set");

    const userId = await findUserIdByEmail(student.parent_email);
    if (!userId) {
      throw new Error(
        `No parent account found for ${student.parent_email}. Ask the parent to sign up first.`,
      );
    }

    // Ensure they have the parent role
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "parent" }, { onConflict: "user_id,role" });

    const { error: uErr } = await supabaseAdmin
      .from("students")
      .update({ parent_user_id: userId })
      .eq("id", data.studentId);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, userId };
  });

export const linkAllParents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id, parent_email")
      .is("parent_user_id", null)
      .not("parent_email", "is", null);
    if (error) throw new Error(error.message);

    let linked = 0;
    const missing: string[] = [];
    for (const s of students ?? []) {
      const uid = await findUserIdByEmail(s.parent_email as string);
      if (!uid) {
        missing.push(s.parent_email as string);
        continue;
      }
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: uid, role: "parent" }, { onConflict: "user_id,role" });
      const { error: uErr } = await supabaseAdmin
        .from("students")
        .update({ parent_user_id: uid })
        .eq("id", s.id);
      if (!uErr) linked++;
    }
    return { linked, missing };
  });

import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserRow } from "@/types";
import AdminUserTable from "./AdminUserTable";

export default async function AdminPage() {
  if (!(await isCurrentUserAdmin())) redirect("/");

  const admin = createAdminClient();

  const [{ data: authData, error: authError }, { data: profileRows, error: profileError }] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.from("profiles").select("id, username, is_admin, is_restricted, created_at"),
  ]);

  if (authError || profileError) {
    return (
      <div className="text-bad text-sm text-center py-12 bg-panel border border-border rounded-2xl">
        Couldn&apos;t load users: {authError?.message ?? profileError?.message}
      </div>
    );
  }

  const profileById = new Map((profileRows ?? []).map((p) => [p.id, p]));

  const users: AdminUserRow[] = authData.users.map((u) => {
    const profile = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? null,
      username: profile?.username ?? null,
      created_at: profile?.created_at ?? u.created_at,
      is_admin: profile?.is_admin ?? false,
      is_restricted: profile?.is_restricted ?? false,
      banned: Boolean(u.banned_until),
    };
  });

  return (
    <div>
      <h1 className="font-semibold text-lg mb-1">Admin</h1>
      <p className="text-sm text-muted mb-5">Manage user accounts.</p>
      <AdminUserTable users={users} />
    </div>
  );
}

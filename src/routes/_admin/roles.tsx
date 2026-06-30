import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsersWithRoles, adminSetRole } from "@/lib/roles.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_admin/roles")({
  component: RolesPage,
});

type AppRole = "admin" | "parent";

function RolesPage() {
  const { user } = useAuth();
  const list = useServerFn(listUsersWithRoles);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: () => list(),
  });

  const setRole = useMutation({
    mutationFn: async (vars: { userId: string; role: AppRole; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role", {
        _user_id: vars.userId,
        _role: vars.role,
        _grant: vars.grant,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.grant ? "Granted" : "Revoked"} ${vars.role}`);
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data ?? []).filter((u) => !q || u.email.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Grant or revoke admin access for users.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Users</CardTitle>
          <Input
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">
              {(error as Error).message === "Forbidden"
                ? "You do not have permission to view this list."
                : "Unable to load users. Please try again."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const isAdmin = u.roles.includes("admin");
                    const isParent = u.roles.includes("parent");
                    const isSelf = u.id === user?.id;
                    const busy = setRole.isPending && setRole.variables?.userId === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email || <span className="text-muted-foreground">—</span>}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 && (
                              <Badge variant="outline" className="text-muted-foreground">no role</Badge>
                            )}
                            {isAdmin && <Badge className="bg-primary text-primary-foreground">admin</Badge>}
                            {isParent && <Badge variant="secondary">parent</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {isAdmin ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy || isSelf}
                              onClick={() => setRole.mutate({ userId: u.id, role: "admin", grant: false })}
                              title={isSelf ? "You cannot revoke your own admin role" : "Revoke admin"}
                            >
                              <ShieldOff className="mr-1 h-3.5 w-3.5" />
                              Revoke admin
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => setRole.mutate({ userId: u.id, role: "admin", grant: true })}
                            >
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Make admin
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

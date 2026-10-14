"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Users, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function AdminTenantsPage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);

  // RBAC Access Guard: Strictly verify role === 'admin'
  useEffect(() => {
    if (!isBootstrapping) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "admin") {
        router.replace("/");
      }
    }
  }, [user, isBootstrapping, router]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.admin.getUsers();
      setUsersList(res);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
    }
  }, [user, loadUsers]);

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    setIsUpdatingRole(true);
    try {
      await api.admin.updateUserRole(targetUserId, newRole);
      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      });
      loadUsers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Role Update Failed",
        description: err.message || "Failed to update role",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  if (isBootstrapping || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs text-zinc-400">Verifying Platform Admin Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Platform Tenants & User Governance"
      description="Manage platform businesses, tenant products, user permissions and database roles"
      activeTab="tenants"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={loadUsers}
          disabled={isLoading}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      }
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            <span>Platform Tenant & User Administration</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Manage user roles strictly through the database role column (admin, user, demo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="p-3 font-semibold">User</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Tenant Products</th>
                  <th className="p-3 font-semibold">Total Feedback</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold text-right">Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{u.name || "User"}</td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">{u.email}</td>
                    <td className="p-3">{u.products_count}</td>
                    <td className="p-3">{u.feedback_count}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          u.role === "admin"
                            ? "bg-red-500/10 text-red-500 border-red-500/30 text-[10px]"
                            : u.role === "demo"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]"
                            : "text-muted-foreground text-[10px]"
                        }
                      >
                        {u.role?.toUpperCase() || "USER"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Select
                        defaultValue={u.role || "user"}
                        disabled={isUpdatingRole || (u.id === user.id)}
                        onValueChange={(val) => handleUpdateRole(u.id, val)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="demo">Demo</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

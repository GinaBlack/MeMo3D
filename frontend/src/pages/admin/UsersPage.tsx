import { useState } from "react";
import { Users, Search, MoreVertical, Shield, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

const mockUsers = [
  { id: 1, name: "Dr. Admin", email: "admin@memoprint.com", role: "admin", projects: 5, status: "Active", joined: "2025-01-15" },
  { id: 2, name: "Regina Ebai", email: "user@memoprint.com", role: "user", projects: 12, status: "Active", joined: "2025-06-01" },
  { id: 3, name: "Dr. Njoh Martin", email: "njoh@ubuea.cm", role: "user", projects: 8, status: "Active", joined: "2025-07-20" },
  { id: 4, name: "Nkemta Aline", email: "nkemta@ubuea.cm", role: "user", projects: 3, status: "Active", joined: "2025-09-10" },
  { id: 5, name: "Dr. Fon Peter", email: "fon@ubuea.cm", role: "user", projects: 15, status: "Inactive", joined: "2025-04-05" },
  { id: 6, name: "Tabi Grace", email: "tabi@ubuea.cm", role: "user", projects: 1, status: "Active", joined: "2026-01-12" },
];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const filtered = mockUsers.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">{mockUsers.length} registered users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Projects</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      }`}>
                        {user.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{user.projects}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{user.joined}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.status === "Active" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

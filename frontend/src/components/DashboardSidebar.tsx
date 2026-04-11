import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  Box,
  Download,
  Settings,
  LogOut,
  Users,
  Activity,
  Database,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useAuth, type UserRole } from "../contexts/AuthContext";
import { NavLink } from "../components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "../components/ui/sidebar";
import logo from "../assets/logo.png";

const userLinks = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Upload CT Scan", url: "/dashboard/upload", icon: Upload },
  { title: "My Projects", url: "/dashboard/projects", icon: FolderOpen },
  { title: "3D Viewer", url: "/dashboard/viewer", icon: Box },
  { title: "Exports", url: "/dashboard/exports", icon: Download },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const adminLinks = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "System Logs", url: "/admin/logs", icon: Activity },
  { title: "Datasets", url: "/admin/datasets", icon: Database },
  { title: "Evaluations", url: "/admin/evaluations", icon: ShieldCheck },
  { title: "Reports", url: "/admin/reports", icon: FileText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();

  const links = user?.role === "admin" ? adminLinks : userLinks;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <img src={logo} alt="MemoPrint" className="h-7 w-7 shrink-0" />
          {!collapsed && (
            <span className="font-heading text-base font-bold tracking-tight">
              Memo<span className="text-gradient">Print</span>
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{user?.role === "admin" ? "Administration" : "Workspace"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

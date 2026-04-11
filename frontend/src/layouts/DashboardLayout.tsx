import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Globe } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex items-center gap-1">
              <button
                onClick={toggleLang}
                className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" />
                {lang === "en" ? "FR" : "EN"}
              </button>
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

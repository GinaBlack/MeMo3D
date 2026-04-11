import { motion } from "framer-motion";
import { Upload, FolderOpen, Box, Download, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

const stats = [
  { label: "Projects", value: "12", icon: FolderOpen, change: "+3 this month" },
  { label: "CT Scans", value: "28", icon: Upload, change: "4 processing" },
  { label: "3D Models", value: "19", icon: Box, change: "2 pending" },
  { label: "Exports", value: "15", icon: Download, change: "Last: 2h ago" },
];

const recentProjects = [
  { id: 1, name: "Wrist Splint — Patient A", status: "Completed", date: "2026-03-10", progress: 100 },
  { id: 2, name: "Forearm Cast — Patient B", status: "Processing", date: "2026-03-09", progress: 65 },
  { id: 3, name: "Wrist Splint — Patient C", status: "Uploaded", date: "2026-03-08", progress: 20 },
  { id: 4, name: "Ankle Support — Patient D", status: "Draft", date: "2026-03-07", progress: 0 },
];

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Here's an overview of your workspace</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="shadow-card">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-accent">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick actions + Recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Projects</CardTitle>
            <Link to="/dashboard/projects">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                      <Box className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-primary"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        project.status === "Completed"
                          ? "bg-accent/10 text-accent"
                          : project.status === "Processing"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/dashboard/upload" className="block">
              <Button className="w-full justify-start bg-gradient-primary" size="lg">
                <Upload className="mr-2 h-4 w-4" /> Upload CT Scan
              </Button>
            </Link>
            <Link to="/dashboard/projects" className="block">
              <Button variant="outline" className="w-full justify-start" size="lg">
                <FolderOpen className="mr-2 h-4 w-4" /> Browse Projects
              </Button>
            </Link>
            <Link to="/dashboard/viewer" className="block">
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Box className="mr-2 h-4 w-4" /> Open 3D Viewer
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

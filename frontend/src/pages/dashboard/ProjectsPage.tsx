import { motion } from "framer-motion";
import { FolderOpen, Box, Calendar, MoreVertical, Plus } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";

const projects = [
  { id: 1, name: "Wrist Splint — Patient A", scans: 3, models: 2, status: "Completed", date: "2026-03-10", thumbnail: "🦴" },
  { id: 2, name: "Forearm Cast — Patient B", scans: 1, models: 1, status: "Processing", date: "2026-03-09", thumbnail: "🔬" },
  { id: 3, name: "Wrist Splint — Patient C", scans: 2, models: 0, status: "Uploaded", date: "2026-03-08", thumbnail: "📁" },
  { id: 4, name: "Ankle Support — Patient D", scans: 0, models: 0, status: "Draft", date: "2026-03-07", thumbnail: "📋" },
  { id: 5, name: "Custom Brace — Patient E", scans: 4, models: 3, status: "Completed", date: "2026-03-05", thumbnail: "🦴" },
  { id: 6, name: "Wrist Splint — Patient F", scans: 1, models: 1, status: "Exported", date: "2026-03-03", thumbnail: "✅" },
];

const statusColor: Record<string, string> = {
  Completed: "bg-accent/10 text-accent",
  Processing: "bg-primary/10 text-primary",
  Uploaded: "bg-yellow-500/10 text-yellow-600",
  Draft: "bg-secondary text-muted-foreground",
  Exported: "bg-accent/10 text-accent",
};

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Projects</h1>
          <p className="text-sm text-muted-foreground">{projects.length} projects total</p>
        </div>
        <Link to="/dashboard/upload">
          <Button className="bg-gradient-primary">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="cursor-pointer shadow-card transition-shadow hover:shadow-elevated">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-xl">
                    {project.thumbnail}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[project.status] || ""}`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="mb-1 text-sm font-semibold text-foreground">{project.name}</h3>
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" /> {project.scans} scans</span>
                  <span className="flex items-center gap-1"><Box className="h-3 w-3" /> {project.models} models</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="mr-1 h-3 w-3" /> {project.date}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

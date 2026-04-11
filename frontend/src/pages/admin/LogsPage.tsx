import { Activity, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
const logs = [
  { time: "2026-03-11 14:23:01", level: "INFO", user: "Regina E.", message: "CT scan uploaded: CT_Series_A1B2C3.dcm (24.3 MB)" },
  { time: "2026-03-11 14:20:45", level: "INFO", user: "System", message: "Segmentation pipeline started for project #12" },
  { time: "2026-03-11 14:18:30", level: "WARN", user: "System", message: "GPU memory above 80% threshold" },
  { time: "2026-03-11 14:15:12", level: "INFO", user: "Dr. Njoh", message: "3D reconstruction completed — 45,230 vertices" },
  { time: "2026-03-11 14:10:00", level: "INFO", user: "Nkemta A.", message: "STL file downloaded: wrist_splint_v2.stl" },
  { time: "2026-03-11 13:55:20", level: "ERROR", user: "System", message: "Segmentation failed for project #8 — invalid slice spacing" },
  { time: "2026-03-11 13:40:10", level: "INFO", user: "Dr. Fon", message: "New project created: Ankle Support — Patient D" },
  { time: "2026-03-11 13:30:00", level: "INFO", user: "System", message: "Daily backup completed successfully" },
];

const levelColors: Record<string, string> = {
  INFO: "text-primary bg-primary/10",
  WARN: "text-yellow-600 bg-yellow-500/10",
  ERROR: "text-destructive bg-destructive/10",
};

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">System Logs</h1>
          <p className="text-sm text-muted-foreground">Audit trail and system activity</p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-3.5 w-3.5" /> Filter
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="space-y-0 divide-y divide-border">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${levelColors[log.level] || ""}`}>
                  {log.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.user} • {log.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

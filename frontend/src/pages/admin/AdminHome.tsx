import { motion } from "framer-motion";
import { Users, Activity, Database, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const stats = [
  { label: "Total Users", value: "47", icon: Users, change: "+5 this week", color: "text-primary" },
  { label: "Active Sessions", value: "8", icon: Activity, change: "3 processing", color: "text-accent" },
  { label: "Datasets", value: "156", icon: Database, change: "12.4 GB total", color: "text-primary" },
  { label: "Evaluations", value: "89", icon: ShieldCheck, change: "Avg Dice: 0.91", color: "text-accent" },
];

const recentActivity = [
  { user: "Regina E.", action: "Uploaded CT scan dataset", time: "2 min ago", type: "upload" },
  { user: "Dr. Njoh", action: "Completed 3D reconstruction", time: "15 min ago", type: "process" },
  { user: "Nkemta A.", action: "Downloaded STL export", time: "1h ago", type: "export" },
  { user: "System", action: "Segmentation pipeline completed", time: "2h ago", type: "system" },
  { user: "Dr. Fon", action: "Created new project", time: "3h ago", type: "create" },
];

const alerts = [
  { message: "GPU memory utilization at 85%", severity: "warning" },
  { message: "2 segmentation jobs queued", severity: "info" },
];

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">System health and activity monitoring</p>
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
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {item.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{item.user}</span> {item.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">System Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border p-3 ${
                  alert.severity === "warning"
                    ? "border-yellow-500/20 bg-yellow-500/5"
                    : "border-primary/20 bg-primary/5"
                }`}
              >
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${alert.severity === "warning" ? "text-yellow-500" : "text-primary"}`} />
                <p className="text-sm text-foreground">{alert.message}</p>
              </div>
            ))}

            <div className="mt-4 rounded-lg border border-border p-4">
              <h4 className="mb-2 text-sm font-medium text-foreground">Pipeline Health</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU Usage</span>
                  <span className="font-medium text-foreground">42%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[42%] rounded-full bg-accent" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GPU Memory</span>
                  <span className="font-medium text-foreground">85%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[85%] rounded-full bg-yellow-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

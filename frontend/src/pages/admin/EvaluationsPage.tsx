import { ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const evaluations = [
  { id: 1, project: "Wrist Splint — Patient A", dice: 0.94, iou: 0.89, time: "32s", meshQuality: "High", date: "2026-03-10" },
  { id: 2, project: "Custom Brace — Patient E", dice: 0.91, iou: 0.85, time: "45s", meshQuality: "High", date: "2026-03-05" },
  { id: 3, project: "Wrist Splint — Patient F", dice: 0.88, iou: 0.81, time: "38s", meshQuality: "Medium", date: "2026-03-03" },
  { id: 4, project: "Forearm Cast — Patient B", dice: 0.92, iou: 0.87, time: "41s", meshQuality: "High", date: "2026-03-09" },
];

const qualityColor: Record<string, string> = {
  High: "bg-accent/10 text-accent",
  Medium: "bg-yellow-500/10 text-yellow-600",
  Low: "bg-destructive/10 text-destructive",
};

export default function EvaluationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Evaluations</h1>
        <p className="text-sm text-muted-foreground">Segmentation accuracy and mesh quality metrics</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">0.91</p>
            <p className="text-xs text-muted-foreground">Avg Dice Coefficient</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">0.86</p>
            <p className="text-xs text-muted-foreground">Avg IoU</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">39s</p>
            <p className="text-xs text-muted-foreground">Avg Pipeline Time</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">92%</p>
            <p className="text-xs text-muted-foreground">High Quality Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Evaluation Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dice</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">IoU</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quality</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev) => (
                  <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium text-foreground">{ev.project}</td>
                    <td className="px-4 py-3 text-foreground">{ev.dice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-foreground">{ev.iou.toFixed(2)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{ev.time}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${qualityColor[ev.meshQuality] || ""}`}>
                        {ev.meshQuality}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{ev.date}</td>
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

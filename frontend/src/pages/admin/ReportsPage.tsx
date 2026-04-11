import { FileText, Download, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const reports = [
  { title: "Monthly Usage Report — March 2026", type: "Usage", date: "2026-03-01", size: "1.2 MB" },
  { title: "Segmentation Accuracy Summary Q1 2026", type: "Evaluation", date: "2026-03-01", size: "890 KB" },
  { title: "User Activity Report — February 2026", type: "Usage", date: "2026-02-01", size: "1.1 MB" },
  { title: "System Performance Report", type: "System", date: "2026-02-15", size: "560 KB" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">System and evaluation reports</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Generated Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.map((report, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {report.type === "Evaluation" ? (
                    <BarChart3 className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{report.title}</p>
                  <p className="text-xs text-muted-foreground">{report.type} • {report.date} • {report.size}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-1 h-3.5 w-3.5" /> Export
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

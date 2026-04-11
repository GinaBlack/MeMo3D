import { Database, FileImage, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const datasets = [
  { id: 1, name: "CT_Series_A1B2C3", slices: 256, size: "24.3 MB", modality: "CT", user: "Regina E.", date: "2026-03-10" },
  { id: 2, name: "CT_Series_D4E5F6", slices: 312, size: "31.7 MB", modality: "CT", user: "Dr. Njoh", date: "2026-03-09" },
  { id: 3, name: "CT_Series_G7H8I9", slices: 198, size: "19.8 MB", modality: "CT", user: "Nkemta A.", date: "2026-03-08" },
  { id: 4, name: "CT_Series_J0K1L2", slices: 420, size: "42.1 MB", modality: "CT", user: "Dr. Fon", date: "2026-03-05" },
];

export default function DatasetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dataset Management</h1>
        <p className="text-sm text-muted-foreground">Manage uploaded CT scan datasets</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{datasets.length}</p>
            <p className="text-xs text-muted-foreground">Total Datasets</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">117.9 MB</p>
            <p className="text-xs text-muted-foreground">Total Storage</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">1,186</p>
            <p className="text-xs text-muted-foreground">Total Slices</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dataset</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Slices</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Size</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Uploaded by</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds) => (
                  <tr key={ds.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{ds.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{ds.slices}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ds.size}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{ds.user}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{ds.date}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
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

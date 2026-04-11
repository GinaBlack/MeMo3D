import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure platform settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Processing Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Max Upload Size (MB)</Label>
              <Input type="number" defaultValue={300} />
            </div>
            <div className="space-y-2">
              <Label>Max Concurrent Jobs</Label>
              <Input type="number" defaultValue={10} />
            </div>
            <div className="flex items-center justify-between">
              <Label>GPU Acceleration</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-anonymize Patient Data</Label>
              <Switch defaultChecked />
            </div>
            <Button className="bg-gradient-primary">Save Settings</Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Encrypt CT Scans at Rest</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Audit Logging</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Email OTP Verification</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" defaultValue={30} />
            </div>
            <Button variant="outline">Update Security</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

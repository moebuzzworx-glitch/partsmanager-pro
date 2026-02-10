'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, ShieldAlert, Radio } from "lucide-react";
import { useState } from "react";

export default function AdminSystemSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-headline font-bold">Platform Settings</h1>
        <p className="text-muted-foreground mt-2">Control global application behavior and availability</p>
      </div>

      <div className="grid gap-6">
        {/* Critical Controls */}
        <Card className="border-destructive/20 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  Availability & Maintenance
                </CardTitle>
                <CardDescription>Control access to the platform</CardDescription>
              </div>
              {maintenanceMode && <Badge variant="destructive">MAINTENANCE ACTIVE</Badge>}
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center justify-between space-x-4 border p-4 rounded-lg bg-destructive/5">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Lock the application for all non-admin users. They will see a "Under Maintenance" screen.
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
                className="data-[state=checked]:bg-destructive"
              />
            </div>

            <div className="flex items-center justify-between space-x-4 border p-4 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">User Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Control if new users can sign up.
                </p>
              </div>
              <Select defaultValue="open">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open to Everyone</SelectItem>
                  <SelectItem value="invite">Invite Only</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Communication */}
        <Card>
          <CardHeader>
            <CardTitle>Global Announcements</CardTitle>
            <CardDescription>Display a banner message to all active users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Announcement Message</Label>
              <Textarea placeholder="e.g. Scheduled downtime this Saturday at 2 AM UTC..." rows={3} />
              <p className="text-xs text-muted-foreground">Leave empty to disable the banner.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="banner-critical" />
                <Label htmlFor="banner-critical">Mark as Critical (Red Banner)</Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-4">
            <Button size="sm" className="ml-auto gap-2">
              <Save className="h-4 w-4" />
              Save Announcement
            </Button>
          </CardFooter>
        </Card>

        {/* Platform Limits (Info Only) */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Limits</CardTitle>
            <CardDescription>Current system configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Max Users</span>
                <div className="text-2xl font-bold">Unlimited</div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Storage</span>
                <div className="text-2xl font-bold">Autoscale</div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">API Rate Limit</span>
                <div className="text-2xl font-bold">10k / min</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

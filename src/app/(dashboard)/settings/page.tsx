"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Save, Shield, Bell } from "lucide-react";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  gender: "male" | "female" | "other" | null;
  avatar_url: string | null;
  role: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", gender: "" });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data as Profile);
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          gender: data.gender ?? "",
        });
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({
      full_name: form.full_name,
      phone: form.phone || null,
      address: form.address || null,
      gender: (form.gender as "male" | "female" | "other") || null,
    }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) return;
    setChangingPassword(true);
    const supabase = createClient();
    await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    setNewPassword("");
  }

  return (
    <div className="animate-fade-in">
      <Header title="Settings" subtitle="Manage your account preferences" />

      <div className="p-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            {profile && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="text-lg">{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{profile.full_name}</p>
                    <p className="text-xs text-[#64748B]">{profile.email}</p>
                    <p className="text-xs text-[#0F4C81] mt-0.5 capitalize">{profile.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Victoria Island, Lagos"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" loading={saving}>
                  <Save className="h-4 w-4" />
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#0F4C81]" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                />
              </div>
              <Button type="submit" variant="outline" loading={changingPassword} disabled={newPassword.length < 8}>
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#0F4C81]" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Assignment notifications", desc: "When you are assigned to a new case" },
                { label: "Performance reviews", desc: "When a new scorecard is submitted" },
                { label: "System announcements", desc: "Important platform updates from RAFFATI" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                    <p className="text-xs text-[#64748B]">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-[#E2E8F0] peer-checked:bg-[#0F4C81] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

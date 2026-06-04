"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TwoFactorSetup } from "@/components/settings/two-factor-setup";
import { TwoFactorManage } from "@/components/settings/two-factor-manage";
import {
  User,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Camera,
  Trash2,
} from "lucide-react";

interface ProfileData {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  profileImageUrl: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

interface OrgPolicy {
  twoFactorPolicy: string;
}

function SettingsSkeleton() {
  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <Skeleton className="h-8 w-40" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orgPolicy, setOrgPolicy] = useState<OrgPolicy>({ twoFactorPolicy: "optional" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [show2faModal, setShow2faModal] = useState(false);

  // Profile form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, orgRes] = await Promise.all([
        fetch("/api/portal/settings"),
        fetch("/api/organization"),
      ]);
      if (!profileRes.ok) {
        throw new Error("Failed to load settings");
      }
      const json = await profileRes.json();
      setProfile(json);
      setName(json.name || "");
      setPhone(json.phone || "");
      setCompany(json.company || "");

      if (orgRes.ok) {
        const orgJson = await orgRes.json();
        setOrgPolicy({
          twoFactorPolicy: (orgJson.twoFactorPolicy || "optional").toLowerCase(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchProfile());
  }, [fetchProfile]);

  useEffect(() => {
    if (!loading && profile && orgPolicy.twoFactorPolicy === "mandatory" && !profile.twoFactorEnabled) {
      setShow2faModal(true);
    }
  }, [loading, profile, orgPolicy]);

  const handleProfileSave = useCallback(async () => {
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const res = await fetch("/api/portal/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, company }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }

      const updated = await res.json();
      setProfile(updated);
      setProfileSuccess("Profile updated successfully");
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setProfileSaving(false);
    }
  }, [name, phone, company]);

  const handlePasswordSave = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const res = await fetch("/api/portal/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password changed successfully");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setPasswordSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/portal/settings/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload photo");
      }

      const { profileImageUrl } = await res.json();
      setProfile((prev) => prev ? { ...prev, profileImageUrl } : prev);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleAvatarRemove = useCallback(async () => {
    setAvatarUploading(true);
    setAvatarError("");

    try {
      const res = await fetch("/api/portal/settings/avatar", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove photo");
      }

      setProfile((prev) => prev ? { ...prev, profileImageUrl: null } : prev);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAvatarUploading(false);
    }
  }, []);

  const handleTwoFactorComplete = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleTwoFactorDisabled = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, password, and security settings
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profileError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            {profileSuccess && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{profileSuccess}</AlertDescription>
              </Alert>
            )}

            {/* Avatar Section */}
            <div className="flex items-center gap-4 pb-2">
              <div className="relative h-16 w-16 shrink-0">
                {profile?.profileImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={profile.profileImageUrl}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-[#B07D3A] flex items-center justify-center text-lg font-semibold text-white">
                    {profile?.name
                      ? profile.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "U"}
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    <Camera className="h-4 w-4 mr-1.5" />
                    Upload Photo
                  </Button>
                  {profile?.profileImageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAvatarRemove}
                      disabled={avatarUploading}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or GIF. Max 2MB.
                </p>
                {avatarError && (
                  <p className="text-xs text-destructive">{avatarError}</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                Contact your administrator to change your email address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleProfileSave} disabled={profileSaving}>
                {profileSaving && <Loader2 className="animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            {passwordSuccess && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{passwordSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handlePasswordSave}
                disabled={
                  passwordSaving ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {passwordSaving && <Loader2 className="animate-spin" />}
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <div id="two-factor-section" />
      {orgPolicy.twoFactorPolicy !== "disabled" && (
        <>
          <Separator />

          {orgPolicy.twoFactorPolicy === "mandatory" && !profile?.twoFactorEnabled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Required by your organization</AlertTitle>
              <AlertDescription>
                Your organization requires all users to set up two-factor authentication.
              </AlertDescription>
            </Alert>
          )}

          {profile?.twoFactorEnabled ? (
            <TwoFactorManage
              onDisabled={handleTwoFactorDisabled}
              disableDisabled={orgPolicy.twoFactorPolicy === "mandatory"}
            />
          ) : (
            <TwoFactorSetup onComplete={handleTwoFactorComplete} />
          )}
        </>
      )}

      <Dialog open={show2faModal} onOpenChange={setShow2faModal}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication Required</DialogTitle>
            <DialogDescription>
              Partners + Capital requires all accounts to enable two-factor authentication for your security. Please set up 2FA below to continue using your portal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => {
              setShow2faModal(false);
              document.getElementById("two-factor-section")?.scrollIntoView({ behavior: "smooth" });
            }}>
              Set Up 2FA Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  Mail,
  Lock,
  Bell,
  Trash2,
  Save,
  Loader2,
  Camera,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/SessionProvider";

export default function SettingsPage() {
  const { user, refresh: refreshAuth } = useAuth();

  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [notifications, setNotifications] = useState({
    emailNewLead: true,
    emailNewReview: true,
    emailWeeklyDigest: false,
    emailAgencyApproved: false,
    inAppNewLead: true,
  });
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  // Populate profile from auth user
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Fetch notification preferences on mount
  const fetchNotificationPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        const prefs = data.data ?? data;
        setNotifications({
          emailNewLead: prefs.email_new_lead ?? prefs.emailNewLead ?? true,
          emailNewReview: prefs.email_new_review ?? prefs.emailNewReview ?? true,
          emailWeeklyDigest:
            prefs.email_weekly_digest ?? prefs.emailWeeklyDigest ?? false,
          emailAgencyApproved:
            prefs.email_agency_approved ?? prefs.emailAgencyApproved ?? false,
          inAppNewLead: prefs.in_app_new_lead ?? prefs.inAppNewLead ?? true,
        });
        setNotificationsLoaded(true);
      }
    } catch {
      // silently fall back to defaults
    }
  }, []);

  useEffect(() => {
    fetchNotificationPrefs();
  }, [fetchNotificationPrefs]);

  // Save profile
  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ type: "success", text: "Profile updated successfully." });
        await refreshAuth();
      } else {
        setProfileMessage({
          type: "error",
          text: data.error || "Failed to update profile.",
        });
      }
    } catch {
      setProfileMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({
          type: "success",
          text: data.data?.message || "Password changed successfully.",
        });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        setPasswordMessage({
          type: "error",
          text: data.error || "Failed to change password.",
        });
      }
    } catch {
      setPasswordMessage({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Toggle a notification preference
  const handleToggleNotification = async (
    key: keyof typeof notifications,
    value: boolean
  ) => {
    // Optimistic update
    setNotifications((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        // Revert on failure
        setNotifications((prev) => ({ ...prev, [key]: !value }));
      }
    } catch {
      setNotifications((prev) => ({ ...prev, [key]: !value }));
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-gray-500">
          Manage your account preferences and security.
        </p>
      </div>

      {/* Profile Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
          <User className="w-5 h-5 text-brand" />
          Profile
        </h2>
        <div className="flex items-start gap-6 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-400">
              {(profile.name || "?")
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand text-white rounded-full flex items-center justify-center shadow-sm hover:bg-brand-dark transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Mail className="w-3.5 h-3.5 inline mr-1" />
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">
                Email cannot be changed. Contact support if you need to update
                it.
              </p>
            </div>
          </div>
        </div>
        {profileMessage && (
          <div
            className={`flex items-center gap-2 mb-4 text-sm ${
              profileMessage.type === "success"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {profileMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {profileMessage.text}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      {/* Password Change */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand" />
          Change Password
        </h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors pr-10"
              />
              <button
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
            />
          </div>
        </div>
        {passwordMessage && (
          <div
            className={`flex items-center gap-2 mt-4 text-sm ${
              passwordMessage.type === "success"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {passwordMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {passwordMessage.text}
          </div>
        )}
        <div className="flex justify-end mt-5">
          <button
            onClick={handleChangePassword}
            disabled={
              changingPassword ||
              !passwords.current ||
              !passwords.new ||
              passwords.new !== passwords.confirm
            }
            className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {changingPassword && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand" />
          Notification Preferences
        </h2>
        <div className="space-y-4">
          {[
            {
              key: "emailNewLead" as const,
              label: "New Lead Notifications",
              desc: "Get notified when a new lead matches your profile",
            },
            {
              key: "emailNewReview" as const,
              label: "New Review Notifications",
              desc: "Get notified when a client leaves a review",
            },
            {
              key: "emailWeeklyDigest" as const,
              label: "Weekly Digest",
              desc: "Receive a weekly summary of your analytics and activity",
            },
            {
              key: "emailAgencyApproved" as const,
              label: "Promotional Emails",
              desc: "Tips, feature updates, and special offers",
            },
            {
              key: "inAppNewLead" as const,
              label: "Security Alerts",
              desc: "Important notifications about your account security",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-2"
            >
              <div>
                <p className="text-sm font-medium text-navy">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() =>
                  handleToggleNotification(item.key, !notifications[item.key])
                }
                disabled={!notificationsLoaded}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notifications[item.key] ? "bg-brand" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    notifications[item.key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white rounded-xl border border-red-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. All your data,
          including your agency profile, reviews, and leads, will be permanently
          removed.
        </p>
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        ) : (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm font-medium text-red-700 mb-3">
              To delete your account, please contact our support team at{" "}
              <a
                href="mailto:support@listingproject.com"
                className="underline font-semibold"
              >
                support@listingproject.com
              </a>
              . Account deletion requires manual verification for security
              purposes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

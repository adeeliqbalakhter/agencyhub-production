"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Star,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  MessageSquare,
  Briefcase,
  LogOut,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/providers/SessionProvider";
import OnboardingModal from "@/components/onboarding-modal";
import { ToastProvider } from "@/components/ui/toast";

const sidebarLinks = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agency Profile", href: "/dashboard/profile", icon: Building2 },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Briefcase },
  { name: "Reviews", href: "/dashboard/reviews", icon: Star },
  { name: "Leads", href: "/dashboard/leads", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, loading } = useAuth();
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [agencyInitials, setAgencyInitials] = useState("--");
  const [loadingAgency, setLoadingAgency] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/signin");
      return;
    }
    if (user.role === "client" || user.role === "user") {
      router.replace("/client");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || user.role === "client" || user.role === "user") return;
    async function fetchAgency() {
      try {
        const res = await fetch("/api/agencies/mine");
        if (res.ok) {
          const json = await res.json();
          const agencyData = json.data?.agency;
          if (agencyData) {
            const name = agencyData.name || "My Agency";
            setAgencyName(name);
            setAgencyInitials(
              name
                .split(" ")
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            );
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoadingAgency(false);
      }
    }
    fetchAgency();
  }, [user]);

  if (loading || !user || user.role === "client" || user.role === "user") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const displayName = agencyName || "My Agency";

  return (
    <ToastProvider>
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {loadingAgency ? ".." : agencyInitials}
              </span>
            </div>
            <div>
              <p className="font-semibold text-navy text-sm">
                {loadingAgency ? (
                  <span className="inline-block w-24 h-4 bg-gray-200 rounded animate-pulse" />
                ) : (
                  displayName
                )}
              </p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-brand"
                    : "text-gray-600 hover:bg-gray-50 hover:text-navy"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 w-full transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3 overflow-x-auto">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-blue-50 text-brand"
                      : "text-gray-500 hover:text-navy"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6 lg:p-8">{children}</div>
      </div>

      {/* Onboarding Modal for new users */}
      {user && (
        <OnboardingModal
          userId={user.id}
          role={user.role}
          name={user.name}
        />
      )}
    </div>
    </ToastProvider>
  );
}

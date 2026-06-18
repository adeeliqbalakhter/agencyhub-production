"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Star,
  LogOut,
  Shield,
  Menu,
  X,
  FileText,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/SessionProvider";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Agencies", href: "/admin/agencies", icon: Building2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Leads", href: "/admin/leads", icon: FileText },
  { name: "Credits", href: "/admin/credits", icon: CreditCard },
  { name: "Reviews", href: "/admin/reviews", icon: Star },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-navy flex-col fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-navy-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">AgencyHub</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand text-white"
                    : "text-gray-300 hover:bg-navy-light hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-navy-light">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-navy-light w-full transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy flex flex-col transform transition-transform lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-navy-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">AgencyHub</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand text-white"
                    : "text-gray-300 hover:bg-navy-light hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-navy-light">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-navy-light w-full transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-gray-500 hover:text-navy"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-medium text-gray-500">
                Admin Panel
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">SA</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-navy">Super Admin</p>
                <p className="text-xs text-gray-500">admin@agencyhub.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

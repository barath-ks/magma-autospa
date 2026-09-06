"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2, 
  Layers, 
  Users, 
  LogOut, 
  ShieldCheck, 
  Home, 
  MapPin, 
  Sparkles,
  ExternalLink
} from "lucide-react";

export default function BranchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // If on login page, don't wrap with dashboard shell
  if (pathname === "/branch/login") {
    return <>{children}</>;
  }

  const branchName = session?.user?.name || "Main Branch";
  const branchCode = (session?.user as any)?.branch_code || (session?.user as any)?.login_id || "MAG-BRANCH-01";
  const branchAddress = (session?.user as any)?.address || "Branch Operations Floor";

  const navLinks = [
    { href: "/branch/dashboard", label: "Dashboard", icon: Home },
    { href: "/branch/bays", label: "Active Bay Queue", icon: Layers },
    { href: "/manager/customers", label: "Customers & Redemptions", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans flex flex-col">
      {/* Top Floor Bar */}
      <header className="border-b border-border-hairline bg-bg-panel px-6 py-3.5 flex justify-between items-center sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link href="/branch/dashboard" className="flex items-center gap-3">
            <div className="border-l-[3px] border-accent-copper pl-3">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg md:text-xl tracking-tight text-text-primary">Magma Autospa</h1>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-accent-copper/10 border border-accent-copper/30 text-accent-copper font-bold hidden sm:inline-block">
                  Branch Profile
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-text-secondary">
                <span className="text-accent-copper font-bold">{branchName}</span>
                <span>&bull;</span>
                <span>{branchCode}</span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 border-l border-border-hairline pl-4">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === "/branch/dashboard" && pathname === "/branch");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-bold transition-colors flex items-center gap-1.5 border ${
                    isActive
                      ? "bg-accent-copper/15 text-accent-copper border-accent-copper/40"
                      : "text-text-secondary hover:text-text-primary border-transparent hover:border-border-hairline"
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Session Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden lg:block">
            <div className="text-xs font-mono text-text-secondary flex items-center gap-1 justify-end">
              <MapPin size={11} className="text-accent-copper" />
              <span className="truncate max-w-[200px]">{branchAddress}</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
              &bull; Terminal Active
            </div>
          </div>

          <Link
            href="/branch/bays"
            className="md:hidden px-2.5 py-1.5 text-xs font-mono text-accent-copper border border-accent-copper/30 hover:bg-accent-copper/10 transition-colors flex items-center gap-1"
            title="Active Bays"
          >
            <Layers size={14} />
            <span className="text-[11px]">Bays</span>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/branch/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-text-secondary hover:text-accent-copper border border-border-hairline hover:border-accent-copper transition-colors"
            title="Sign out of Branch Terminal"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Users, LayoutDashboard, Activity, Calendar, ListOrdered } from "lucide-react";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(data => setBadgeCount(data.managerScheduleBadge || 0))
      .catch(e => console.error(e));
  }, [pathname]);

  const linkClass = (path: string) => {
    const isActive = pathname === path;
    if (isActive) {
      return "flex items-center gap-3 px-4 py-2.5 text-sm font-medium bg-bg-panel-elevated border-l-2 border-accent-gold text-text-primary transition-colors";
    }
    return "flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-panel-elevated transition-colors border-l-2 border-transparent";
  };

  return (
    <div className="h-screen overflow-hidden bg-bg-base font-sans text-text-primary flex selection:bg-accent-gold/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-bg-panel border-r border-border-hairline flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border-hairline">
          <Link href="/manager" className="block font-serif text-xl tracking-tight text-text-primary mb-1 hover:text-accent-gold transition-colors">
            Magma Autospa
          </Link>
          <div className="text-accent-gold font-mono text-[10px] uppercase tracking-[0.15em] font-bold">
            Manager Terminal
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-4 py-2 mt-4">Management</div>
          <Link href="/manager" className={linkClass("/manager")}>
            <LayoutDashboard size={16} /> Overview
          </Link>
          <Link href="/manager/schedule" className={linkClass("/manager/schedule")}>
            <Calendar size={16} /> 
            <span className="flex-1">Schedule</span>
            {badgeCount > 0 && (
              <span className="bg-accent-oxblood text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {badgeCount}
              </span>
            )}
          </Link>
          <Link href="/manager/analytics" className={linkClass("/manager/analytics")}>
            <Activity size={16} /> Branch Analytics
          </Link>
          <Link href="/manager/jobs" className={linkClass("/manager/jobs")}>
            <ListOrdered size={16} /> All Jobs
          </Link>
          <Link href="/manager/staff" className={linkClass("/manager/staff")}>
            <Users size={16} /> Manage Staff
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border-hairline space-y-2">
          <Link href="/profile" className="flex items-center justify-center gap-2 w-full text-xs font-bold text-text-primary hover:bg-bg-panel-elevated px-4 py-2.5 uppercase tracking-widest transition-colors border border-border-hairline">
            My Profile
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: "/" })} 
            className="w-full text-xs font-bold text-white bg-accent-gold hover:bg-opacity-90 px-4 py-2.5 uppercase tracking-widest transition-colors flex justify-center items-center gap-2"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

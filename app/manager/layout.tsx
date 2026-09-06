"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Users, LayoutDashboard, Activity, Calendar, ListOrdered, User, ArrowLeft, Gift, Layers } from "lucide-react";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/manager/login") {
    return <>{children}</>;
  }

  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isStaff = role === "staff";
  const isBranch = role === "branch";
  const isBranchOrStaff = isBranch || isStaff;

  const linkClass = (path: string) => {
    const isActive = pathname === path;
    const accentBorder = isBranchOrStaff ? "border-accent-copper" : "border-accent-gold";
    if (isActive) {
      return `flex items-center gap-3 px-4 py-2.5 text-sm font-medium bg-bg-panel-elevated border-l-2 ${accentBorder} text-text-primary transition-colors`;
    }
    return "flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-panel-elevated transition-colors border-l-2 border-transparent";
  };

  return (
    <div className={`h-screen overflow-hidden bg-bg-base font-sans text-text-primary flex ${isBranchOrStaff ? "selection:bg-accent-copper/30" : "selection:bg-accent-gold/30"}`}>
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-bg-panel border-r border-border-hairline flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border-hairline">
          <Link href={isBranchOrStaff ? "/branch/dashboard" : "/manager"} className={`block font-serif text-xl tracking-tight text-text-primary mb-1 hover:${isBranchOrStaff ? "text-accent-copper" : "text-accent-gold"} transition-colors`}>
            Magma Autospa
          </Link>
          <div className={`${isBranchOrStaff ? "text-accent-copper" : "text-accent-gold"} font-mono text-[10px] uppercase tracking-[0.15em] font-bold`}>
            {role === "branch" ? "Branch Profile" : isBranchOrStaff ? "Staff Terminal" : "Manager Terminal"}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {isBranchOrStaff ? (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-4 py-2 mt-4">Branch Navigation</div>
              <Link href="/branch/dashboard" className={linkClass("/branch/dashboard")}>
                <ArrowLeft size={16} /> Branch Dashboard
              </Link>
              <Link href="/branch/bays" className={linkClass("/branch/bays")}>
                <Layers size={16} /> Active Bay Queue
              </Link>
              <Link href="/manager/customers" className={linkClass("/manager/customers")}>
                <Gift size={16} /> Customers & Redemptions
              </Link>
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-4 py-2 mt-4">Management</div>
              <Link href="/manager" className={linkClass("/manager")}>
                <LayoutDashboard size={16} /> Overview
              </Link>
              <Link href="/branch/bays" className={linkClass("/branch/bays")}>
                <Layers size={16} /> Active Bay Queue
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
              <Link href="/manager/customers" className={linkClass("/manager/customers")}>
                <User size={16} /> Customers
              </Link>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-border-hairline space-y-2">
          <Link href="/profile" className="flex items-center justify-center gap-2 w-full text-xs font-bold text-text-primary hover:bg-bg-panel-elevated px-4 py-2.5 uppercase tracking-widest transition-colors border border-border-hairline">
            My Profile
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: isBranch ? "/branch/login" : "/manager/login" })} 
            className={`w-full text-xs font-bold text-white ${isBranchOrStaff ? "bg-accent-copper" : "bg-accent-gold"} hover:bg-opacity-90 px-4 py-2.5 uppercase tracking-widest transition-colors flex justify-center items-center gap-2`}
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

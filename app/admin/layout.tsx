"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Users, Building, Tag, Percent, Contact, LineChart, Gift } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const linkClass = (path: string) => {
    const isActive = pathname === path;
    if (isActive) {
      return "flex items-center gap-3 px-4 py-2.5 text-sm font-medium bg-bg-panel-elevated border-l-2 border-accent-oxblood text-text-primary transition-colors";
    }
    return "flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-panel-elevated transition-colors border-l-2 border-transparent";
  };

  return (
    <div className="h-screen overflow-hidden bg-bg-base font-sans text-text-primary flex selection:bg-accent-oxblood/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-bg-panel border-r border-border-hairline flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border-hairline">
          <Link href="/admin" className="block font-serif text-xl tracking-tight text-text-primary mb-1 hover:text-accent-oxblood transition-colors">
            Magma Autospa
          </Link>
          <div className="text-accent-oxblood font-mono text-[10px] uppercase tracking-[0.15em] font-bold">
            Admin Terminal
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-4 py-2 mt-4">System</div>
          <Link href="/admin/branches" className={linkClass("/admin/branches")}>
            <Building size={16} /> Branches
          </Link>
          <Link href="/admin/services" className={linkClass("/admin/services")}>
            <Tag size={16} /> Services & Pricing
          </Link>
          <Link href="/admin/offers" className={linkClass("/admin/offers")}>
            <Percent size={16} /> Offers & Combos
          </Link>
          <Link href="/admin/rewards" className={linkClass("/admin/rewards")}>
            <Gift size={16} /> Loyalty Rewards
          </Link>
          <Link href="/admin" className={linkClass("/admin")}>
            <Users size={16} /> Staff & Managers
          </Link>
          <Link href="/admin/customers" className={linkClass("/admin/customers")}>
            <Contact size={16} /> Customers
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border-hairline space-y-2">
          <Link href="/profile" className="flex items-center justify-center gap-2 w-full text-xs font-bold text-text-primary hover:bg-bg-panel-elevated px-4 py-2.5 uppercase tracking-widest transition-colors border border-border-hairline">
            My Profile
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: "/admin/login" })} 
            className="w-full text-xs font-bold text-white bg-accent-oxblood hover:bg-opacity-90 px-4 py-2.5 uppercase tracking-widest transition-colors flex justify-center items-center gap-2"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-bg-panel border-b border-border-hairline px-8 py-5 flex justify-end items-center">
          <div className="flex gap-6 items-center">
            {/* Header links reserved for future global actions */}
          </div>
        </header>

        <div className="flex-1 p-8 lg:p-12 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

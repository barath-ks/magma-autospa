"use client";
import { useState, useEffect } from "react";
import { Building, ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/branches")
      .then(res => res.json())
      .then(data => {
        if (data.branches) setBranches(data.branches);
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col h-full">
      <div className="w-full max-w-5xl mx-auto mb-8">
        <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Branches" }]} accentClass="hover:text-accent-oxblood" />
        <h1 className="text-3xl font-semibold text-text-primary mt-2">Branches</h1>
        <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Manage locations and branch-specific personnel</p>
      </div>

      <div className="w-full max-w-5xl mx-auto">
        {loading ? <p className="text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading branches...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map(branch => (
              <Link key={branch.id} href={`/admin/branches/${branch.id}`} className="group block panel p-6 border-l-[3px] border-l-transparent hover:border-l-accent-oxblood transition-all hover:bg-bg-panel-elevated cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded bg-bg-base border border-border-hairline flex items-center justify-center">
                    <Building size={20} className="text-text-secondary group-hover:text-accent-oxblood transition-colors" />
                  </div>
                  <ArrowRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">{branch.name}</h3>
                <p className="text-xs font-mono text-text-secondary uppercase tracking-widest">{branch.location}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

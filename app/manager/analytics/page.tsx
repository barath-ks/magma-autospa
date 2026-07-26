"use client";
import { Activity } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function AnalyticsPage() {
  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col items-center justify-center h-full">
      <div className="w-full self-start mb-auto">
        <Breadcrumbs items={[{ label: "Overview", href: "/manager" }, { label: "Branch Analytics" }]} accentClass="hover:text-accent-gold" />
      </div>
      <div className="panel p-12 flex flex-col items-center justify-center text-center max-w-md border-t-[3px] border-t-accent-gold mb-auto">
        <Activity size={48} className="text-text-secondary mb-6" strokeWidth={1} />
        <h1 className="text-xl font-semibold text-text-primary mb-2">Branch Analytics — Coming Soon</h1>
        <p className="text-sm text-text-secondary">This section will eventually provide deeper insights into revenue and throughput.</p>
      </div>
    </main>
  );
}

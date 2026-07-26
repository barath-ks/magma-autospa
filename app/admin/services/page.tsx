"use client";
import { Tag } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ServicesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full self-start mb-auto">
        <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Services & Pricing" }]} accentClass="hover:text-accent-oxblood" />
      </div>
      <div className="panel p-12 flex flex-col items-center justify-center text-center max-w-md border-t-[3px] border-t-accent-oxblood mb-auto">
        <Tag size={48} className="text-text-secondary mb-6" strokeWidth={1} />
        <h1 className="text-xl font-semibold text-text-primary mb-2">Services & Pricing — Coming Soon</h1>
        <p className="text-sm text-text-secondary">This section will eventually allow configuring core services, add-ons, and pricing logic.</p>
      </div>
    </div>
  );
}

"use client";
import { Contact } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function CustomersPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full self-start mb-auto">
        <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Customers" }]} accentClass="hover:text-accent-oxblood" />
      </div>
      <div className="panel p-12 flex flex-col items-center justify-center text-center max-w-md border-t-[3px] border-t-accent-oxblood mb-auto">
        <Contact size={48} className="text-text-secondary mb-6" strokeWidth={1} />
        <h1 className="text-xl font-semibold text-text-primary mb-2">Customer Lookup — Coming Soon</h1>
        <p className="text-sm text-text-secondary">This section will eventually allow global lookup of customer history across all branches.</p>
      </div>
    </div>
  );
}

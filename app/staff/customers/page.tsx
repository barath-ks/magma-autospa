"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/staff/customers?search=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (data.customers) setCustomers(data.customers);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    const debounce = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <Breadcrumbs items={[{ label: "Overview", href: "/staff" }, { label: "Customers" }]} accentClass="hover:text-accent-copper" />
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Customer Lookup</h1>
          <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Search client history and service records.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 font-bold text-xs uppercase tracking-widest bg-accent-copper text-white hover:bg-opacity-90 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-text-secondary" />
        </div>
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH BY NAME, PHONE, OR VEHICLE NUMBER..."
          className="w-full bg-bg-panel border border-border-hairline p-4 pl-12 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors placeholder:text-text-secondary/50 uppercase tracking-widest"
        />
      </div>

      <div className="space-y-3">
        {loading && <div className="text-text-secondary text-sm font-mono uppercase tracking-widest animate-pulse">Scanning database...</div>}
        {!loading && customers.length === 0 && (
          <div className="panel p-8 text-center text-text-secondary text-sm font-mono uppercase tracking-widest">
            No records found matching your query.
          </div>
        )}
        {!loading && customers.map(c => (
          <Link key={c.id} href={`/staff/customers/${c.id}`} className="block">
            <div className="panel p-5 border-l-[3px] border-l-transparent hover:border-l-accent-copper hover:bg-bg-panel-elevated transition-colors flex justify-between items-center group cursor-pointer">
              <div className="flex gap-12">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5 mb-1"><User size={12}/> Client</div>
                  <div className="text-sm font-medium text-text-primary group-hover:text-accent-copper transition-colors">{c.name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5 mb-1"><Phone size={12}/> Contact</div>
                  <div className="text-sm font-mono text-text-primary">{c.phone}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5 mb-1"><Car size={12}/> Vehicle</div>
                  <div className="text-sm font-mono text-text-primary">{c.vehicle_number || "N/A"} <span className="text-text-secondary font-sans ml-2">{c.vehicle_model}</span></div>
                </div>
              </div>
              <div className="text-accent-copper opacity-0 group-hover:opacity-100 transition-opacity font-mono text-xs uppercase tracking-widest">
                View Profile &rarr;
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isModalOpen && <NewCustomerModal onClose={() => setIsModalOpen(false)} onSuccess={(c) => { setIsModalOpen(false); setCustomers(prev => [c, ...prev]); }} />}
    </main>
  );
}

function NewCustomerModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (c: any) => void }) {
  const [formData, setFormData] = useState({ name: "", phone: "", vehicle_number: "", vehicle_model: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/staff/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (res.ok) {
      onSuccess(data);
    } else {
      setError(data.error || "System Error");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="panel border-l-[3px] border-l-accent-copper p-8 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">New Client Registration</h3>
        <p className="text-xs font-mono text-text-secondary mb-8 uppercase tracking-wider">Initialize customer profile</p>
        
        {error && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-6 p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Full Name *</label>
              <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Phone Number *</label>
              <input required type="tel" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Number</label>
              <input type="text" value={formData.vehicle_number} onChange={e=>setFormData({...formData, vehicle_number: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors uppercase" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Vehicle Model</label>
              <input type="text" value={formData.vehicle_model} onChange={e=>setFormData({...formData, vehicle_model: e.target.value})} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-copper focus:outline-none transition-colors" placeholder="e.g. Porsche 911 GT3" />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-border-hairline">
            <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-copper text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
              {loading ? "Executing..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

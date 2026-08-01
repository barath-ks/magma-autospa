"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatCurrency } from "@/lib/format";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services");
      const data = await res.json();
      if (data.services) setServices(data.services);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingService(null);
    setName("");
    setDescription("");
    setPrice("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (service: any) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description);
    setPrice(service.price.toString());
        setIsActive(Boolean(service.is_active));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      name, 
      description, 
      price: Number(price), 
            is_active: isActive 
    };

    try {
      const url = editingService 
        ? `/api/admin/services/${editingService.id}`
        : "/api/admin/services";
      
      const res = await fetch(url, {
        method: editingService ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setModalOpen(false);
        fetchServices();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this service?")) return;
    
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      if (res.ok) fetchServices();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Services & Pricing" }]} accentClass="hover:text-accent-oxblood" />
          <h1 className="text-3xl font-semibold text-text-primary mt-2">Services & Pricing</h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Manage global services and base pricing for all branches.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-accent-oxblood text-white text-xs font-bold uppercase tracking-widest hover:bg-opacity-90 transition-colors">
          <Plus size={14} /> Add Service
        </button>
      </div>

      {loading ? (
        <p className="text-sm font-mono text-text-secondary uppercase tracking-widest">Loading catalog...</p>
      ) : (
        <div className="panel overflow-hidden border-l-[3px] border-l-accent-oxblood">
          <table className="w-full text-left">
            <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Name & Description</th>
                <th className="p-4">Price</th>
                                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel">
              {services.map(s => (
                <tr key={s.id} className="hover:bg-bg-panel-elevated transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-medium text-text-primary">{s.name}</div>
                    <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">{s.description || "No description"}</div>
                  </td>
                  <td className="p-4 font-mono text-sm text-text-primary">{formatCurrency(s.price)}</td>
                                    <td className="p-4">
                    {s.is_active ? 
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#4ade80]"><CheckCircle2 size={12}/> Active</span> : 
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-text-secondary"><XCircle size={12}/> Inactive</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditModal(s)} className="p-2 text-text-secondary hover:text-accent-oxblood transition-colors inline-block"><Edit2 size={14}/></button>
                    {s.is_active ? (
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-text-secondary hover:text-accent-oxblood transition-colors inline-block ml-2"><Trash2 size={14}/></button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-text-secondary uppercase tracking-widest text-sm">No services found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-6 text-text-primary">{editingService ? "Edit Service" : "Add Service"}</h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Service Name *</label>
                <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Description</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Price (₹) *</label>
                  <input required type="number" step="0.01" min="0.01" value={price} onChange={e=>setPrice(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
                </div>
              </div>
              {editingService && (
                <div className="flex items-center pt-2">
                  <input type="checkbox" id="isActive" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="h-4 w-4 bg-bg-base border-border-hairline-strong accent-accent-oxblood focus:ring-0 cursor-pointer" />
                  <label htmlFor="isActive" className="ml-2 text-xs font-medium text-text-secondary cursor-pointer">Service is active</label>
                </div>
              )}
              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

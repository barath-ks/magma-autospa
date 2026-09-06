"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, MapPin, Tag, Clock, Globe, ShieldCheck, X } from "lucide-react";

interface Branch {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  points_earned: number;
  duration_minutes: number | null;
  category: string | null;
  branch_id: string | null;
  branch_name: string | null;
  is_active: number;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({ 
    id: "", 
    name: "", 
    description: "", 
    price: 0, 
    points_earned: 10,
    duration_minutes: "", 
    category: "", 
    branch_id: "", 
    is_active: true 
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resServices, resBranches] = await Promise.all([
        fetch("/api/admin/services").then((res) => res.json()),
        fetch("/api/admin/branches").then((res) => res.json()),
      ]);

      if (resServices.services) setServices(resServices.services);
      if (resBranches.branches) setBranches(resBranches.branches);
    } catch (e) {
      console.error("Error fetching data", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      id: "", 
      name: "", 
      description: "", 
      price: 0, 
      points_earned: 10,
      duration_minutes: "", 
      category: "", 
      branch_id: "", 
      is_active: true 
    });
    setFormError("");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          points_earned: Number(formData.points_earned),
          duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : undefined,
          category: formData.category || undefined,
          branch_id: formData.branch_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create service");
      } else {
        setIsAddOpen(false);
        resetForm();
        fetchData(); 
      }
    } catch (err: any) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch(`/api/admin/services/${formData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          points_earned: Number(formData.points_earned),
          duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : null,
          category: formData.category || null,
          branch_id: formData.branch_id || null,
          is_active: formData.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to update service");
      } else {
        setIsEditOpen(false);
        resetForm();
        fetchData(); 
      }
    } catch (err: any) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (svc: Service) => {
    setFormData({
      id: svc.id,
      name: svc.name,
      description: svc.description || "",
      price: svc.price,
      points_earned: svc.points_earned,
      duration_minutes: svc.duration_minutes ? svc.duration_minutes.toString() : "",
      category: svc.category || "",
      branch_id: svc.branch_id || "",
      is_active: svc.is_active === 1,
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this service?")) return;
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-inter">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-l-[3px] border-[#800020] pl-4">
          <div>
            <h1 className="text-3xl font-fraunces font-semibold tracking-tight">Services & Pricing</h1>
            <p className="text-gray-400 mt-1">Manage service catalog, duration, pricing, and branch availability.</p>
          </div>
          <button
            onClick={() => { resetForm(); setIsAddOpen(true); }}
            className="flex items-center gap-2 bg-[#121212] border border-white/10 hover:border-white/30 text-white px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading services...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div key={s.id} className={`bg-[#121212] border border-white/10 p-5 flex flex-col relative ${s.is_active ? '' : 'opacity-60 grayscale'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-fraunces text-xl font-medium">{s.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {s.branch_id ? (
                        <span className="flex items-center gap-1 font-mono text-xs text-[#800020] bg-[#800020]/10 px-2 py-0.5 rounded-sm">
                          <MapPin className="w-3 h-3" /> {s.branch_name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-sm">
                          <Globe className="w-3 h-3" /> Global
                        </span>
                      )}
                      
                      {!s.is_active && (
                        <span className="text-[10px] uppercase tracking-wider text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded-sm">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-white transition-colors" title="Edit Service">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {s.is_active && (
                      <button onClick={() => handleDelete(s.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Deactivate Service">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 flex-grow text-sm text-gray-300">
                  <p className="line-clamp-2 text-gray-400 text-xs mb-2">{s.description || "No description provided."}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/5 p-2">
                      <Tag className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="font-mono text-green-400">${s.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/5 p-2">
                      <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="font-mono">{s.duration_minutes ? `${s.duration_minutes}m` : "--"}</span>
                    </div>
                  </div>
                  
                  {s.category && (
                    <div className="pt-2 flex items-center text-xs text-gray-500 uppercase tracking-wider">
                      Category: <span className="ml-2 font-semibold text-gray-300">{s.category}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-white/10 p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-fraunces">Create New Service</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            {formError && <div className="bg-red-950/50 border border-red-900/50 text-red-200 text-sm p-3 mb-4 rounded-sm">{formError}</div>}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Service Name</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-[#800020] font-medium mb-1">Branch Scope</label>
                  <select 
                    value={formData.branch_id} 
                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]"
                  >
                    <option value="">Global (All Branches)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Base Price ($)</label>
                  <input required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duration (Minutes)</label>
                  <input type="number" min="0" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" placeholder="e.g. 45" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" placeholder="e.g. SUV, Detailing" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Points Earned</label>
                  <input required type="number" min="0" value={formData.points_earned} onChange={e => setFormData({ ...formData, points_earned: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020] resize-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 text-sm bg-white text-black hover:bg-gray-200 disabled:opacity-50">
                  {formLoading ? "Creating..." : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-white/10 p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6 border-l-[3px] border-[#800020] pl-3">
              <h2 className="text-xl font-fraunces">Edit Service</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            {formError && <div className="bg-red-950/50 border border-red-900/50 text-red-200 text-sm p-3 mb-4 rounded-sm">{formError}</div>}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Service Name</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-[#800020] font-medium mb-1">Branch Scope</label>
                  <select 
                    value={formData.branch_id} 
                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]"
                  >
                    <option value="">Global (All Branches)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Base Price ($)</label>
                  <input required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duration (Minutes)</label>
                  <input type="number" min="0" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" placeholder="e.g. 45" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" placeholder="e.g. SUV, Detailing" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Points Earned</label>
                  <input required type="number" min="0" value={formData.points_earned} onChange={e => setFormData({ ...formData, points_earned: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020] resize-none" />
                </div>
              </div>
              
              <div className="pt-2 flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                <label htmlFor="is_active" className="text-sm text-gray-300">Service is Active</label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 text-sm bg-white text-black hover:bg-gray-200 disabled:opacity-50">
                  {formLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

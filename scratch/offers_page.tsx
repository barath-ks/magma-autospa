"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatCurrency } from "@/lib/format";

export default function OffersCombosPage() {
  const [activeTab, setActiveTab] = useState<"offers" | "combos">("offers");
  
  const [services, setServices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  
  const [serviceOffers, setServiceOffers] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Offer Modal State
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [offerServiceId, setOfferServiceId] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerIsActive, setOfferIsActive] = useState(true);

  // Combo Modal State
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any>(null);
  const [comboName, setComboName] = useState("");
  const [comboDescription, setComboDescription] = useState("");
  const [comboPrice, setComboPrice] = useState("");
  const [comboServices, setComboServices] = useState<string[]>([]);
  const [comboIsActive, setComboIsActive] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchData();
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const branchesRes = await fetch("/api/admin/branches");
      const branchesData = await branchesRes.json();
      if (branchesData.branches) {
        setBranches(branchesData.branches);
        if (branchesData.branches.length > 0) {
          setSelectedBranch(branchesData.branches[0].id);
        } else {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const [servicesRes, offersRes, combosRes] = await Promise.all([
        fetch(`/api/admin/services?branch_id=${selectedBranch}`),
        fetch(`/api/admin/service-offers?branch_id=${selectedBranch}`),
        fetch(`/api/admin/combos?branch_id=${selectedBranch}`)
      ]);
      const servicesData = await servicesRes.json();
      const offersData = await offersRes.json();
      const combosData = await combosRes.json();
      
      if (servicesData.services) setServices(servicesData.services.filter((s:any) => s.is_active));
      if (offersData.serviceOffers) setServiceOffers(offersData.serviceOffers);
      if (combosData.combos) setCombos(combosData.combos);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // --- Offers Handlers ---
  const openAddOffer = () => {
    setEditingOffer(null);
    setOfferServiceId(services[0]?.id || "");
    setOfferPrice("");
    setOfferIsActive(true);
    setOfferModalOpen(true);
  };

  const openEditOffer = (offer: any) => {
    setEditingOffer(offer);
    setOfferServiceId(offer.service_id);
    setOfferPrice(offer.offer_price.toString());
    setOfferIsActive(Boolean(offer.is_active));
    setOfferModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setSaving(true);
    
    const payload = { 
      service_id: offerServiceId, 
      offer_price: Number(offerPrice), 
      branch_id: selectedBranch,
      is_active: offerIsActive 
    };

    try {
      const url = editingOffer ? `/api/admin/service-offers/${editingOffer.id}` : "/api/admin/service-offers";
      const res = await fetch(url, {
        method: editingOffer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setOfferModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDeleteOffer = async (id: string) => {
    if (!selectedBranch) return;
    if (!confirm("Are you sure you want to deactivate this offer?")) return;
    try {
      const res = await fetch(`/api/admin/service-offers/${id}?branch_id=${selectedBranch}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else alert((await res.json()).error);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReactivateOffer = async (id: string) => {
    if (!selectedBranch) return;
    if (!confirm("Are you sure you want to reactivate this offer?")) return;
    try {
      const res = await fetch(`/api/admin/service-offers/${id}/reactivate`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: selectedBranch })
      });
      if (res.ok) fetchData();
      else alert((await res.json()).error);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Combos Handlers ---
  const openAddCombo = () => {
    setEditingCombo(null);
    setComboName("");
    setComboDescription("");
    setComboPrice("");
    setComboServices([]);
    setComboIsActive(true);
    setComboModalOpen(true);
  };

  const openEditCombo = (combo: any) => {
    setEditingCombo(combo);
    setComboName(combo.name);
    setComboDescription(combo.description);
    setComboPrice(combo.bundle_price.toString());
    setComboServices(combo.services.map((s:any) => s.id));
    setComboIsActive(Boolean(combo.is_active));
    setComboModalOpen(true);
  };

  const handleToggleComboService = (serviceId: string) => {
    setComboServices(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    if (comboServices.length < 2) {
      alert("A combo must include at least 2 services.");
      return;
    }
    
    setSaving(true);
    const payload = { 
      name: comboName,
      description: comboDescription,
      bundle_price: Number(comboPrice), 
      branch_id: selectedBranch,
      services: comboServices,
      is_active: comboIsActive 
    };

    try {
      const url = editingCombo ? `/api/admin/combos/${editingCombo.id}` : "/api/admin/combos";
      const res = await fetch(url, {
        method: editingCombo ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setComboModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDeleteCombo = async (id: string) => {
    if (!selectedBranch) return;
    if (!confirm("Are you sure you want to deactivate this combo?")) return;
    try {
      const res = await fetch(`/api/admin/combos/${id}?branch_id=${selectedBranch}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else alert((await res.json()).error);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReactivateCombo = async (id: string) => {
    if (!selectedBranch) return;
    if (!confirm("Are you sure you want to reactivate this combo?")) return;
    try {
      const res = await fetch(`/api/admin/combos/${id}/reactivate`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: selectedBranch })
      });
      if (res.ok) fetchData();
      else alert((await res.json()).error);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Offers & Combos" }]} accentClass="hover:text-accent-oxblood" />
          <h1 className="text-3xl font-semibold text-text-primary mt-2">Offers & Combos</h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Manage special service prices and bundles per branch.</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-bg-panel border border-border-hairline p-2 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            {branches.length === 0 && <option value="">No branches found</option>}
          </select>
          <button 
            disabled={!selectedBranch}
            onClick={activeTab === 'offers' ? openAddOffer : openAddCombo} 
            className="flex items-center gap-2 px-4 py-2 bg-accent-oxblood text-white text-xs font-bold uppercase tracking-widest hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> Add {activeTab === 'offers' ? 'Offer' : 'Combo'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border-hairline">
        <button 
          onClick={() => setActiveTab('offers')} 
          className={`pb-3 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'offers' ? 'border-b-2 border-accent-oxblood text-accent-oxblood' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Service Offers
        </button>
        <button 
          onClick={() => setActiveTab('combos')} 
          className={`pb-3 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'combos' ? 'border-b-2 border-accent-oxblood text-accent-oxblood' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Combos
        </button>
      </div>

      {loading ? (
        <p className="text-sm font-mono text-text-secondary uppercase tracking-widest">Loading catalog...</p>
      ) : !selectedBranch ? (
        <p className="text-sm font-mono text-text-secondary uppercase tracking-widest">Please create a branch first.</p>
      ) : activeTab === 'offers' ? (
        <div className="panel overflow-hidden border-l-[3px] border-l-accent-oxblood">
          <table className="w-full text-left">
            <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Service</th>
                <th className="p-4">Offer Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel">
              {serviceOffers.map(o => (
                <tr key={o.id} className="hover:bg-bg-panel-elevated transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-medium text-text-primary">{o.service_name}</div>
                    <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider line-through">Original: {formatCurrency(o.original_price)}</div>
                  </td>
                  <td className="p-4 font-mono text-sm text-accent-gold">{formatCurrency(o.offer_price)}</td>
                  <td className="p-4">
                    {o.is_active ? 
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#4ade80]"><CheckCircle2 size={12}/> Active</span> : 
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-text-secondary"><XCircle size={12}/> Inactive</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditOffer(o)} className="p-2 text-text-secondary hover:text-accent-oxblood transition-colors inline-block"><Edit2 size={14}/></button>
                    {o.is_active ? (
                      <button onClick={() => handleDeleteOffer(o.id)} className="p-2 text-text-secondary hover:text-accent-oxblood transition-colors inline-block ml-2"><Trash2 size={14}/></button>
                    ) : (
                      <button onClick={() => handleReactivateOffer(o.id)} className="p-2 text-text-secondary hover:text-[#4ade80] transition-colors inline-block ml-2"><RotateCcw size={14}/></button>
                    )}
                  </td>
                </tr>
              ))}
              {serviceOffers.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-text-secondary uppercase tracking-widest text-sm">No service offers found for this branch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel overflow-hidden border-l-[3px] border-l-accent-oxblood">
          <table className="w-full text-left">
            <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Combo Name</th>
                <th className="p-4">Included Services</th>
                <th className="p-4">Bundle Price</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel">
              {combos.map(c => (
                <tr key={c.id} className="hover:bg-bg-panel-elevated transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-medium text-text-primary">{c.name}</div>
                    <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">{c.description || "No description"}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.services.map((s:any) => (
                        <span key={s.id} className="bg-bg-base border border-border-hairline-strong px-2 py-1 text-[10px] uppercase tracking-wider font-medium text-text-secondary">{s.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm text-accent-gold">{formatCurrency(c.bundle_price)}</td>
                  <td className="p-4">
                    {c.is_active ? 
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#4ade80]"><CheckCircle2 size={12}/> Active</span> : 
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-text-secondary"><XCircle size={12}/> Inactive</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditCombo(c)} className="p-2 text-text-secondary hover:text-accent-oxblood transition-colors inline-block"><Edit2 size={14}/></button>
                    {c.is_active ? (
                      <button onClick={() => handleDeleteCombo(c.id)} className="p-2 text-text-secondary hover:text-accent-oxblood transition-colors inline-block ml-2"><Trash2 size={14}/></button>
                    ) : (
                      <button onClick={() => handleReactivateCombo(c.id)} className="p-2 text-text-secondary hover:text-[#4ade80] transition-colors inline-block ml-2"><RotateCcw size={14}/></button>
                    )}
                  </td>
                </tr>
              ))}
              {combos.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-text-secondary uppercase tracking-widest text-sm">No combos found for this branch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Offer Modal */}
      {offerModalOpen && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-6 text-text-primary">{editingOffer ? "Edit Offer" : "Add Offer"}</h3>
            <form onSubmit={handleSaveOffer} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Base Service *</label>
                <select required value={offerServiceId} onChange={e=>setOfferServiceId(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors">
                  <option value="" disabled>Select a service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} (Original: {formatCurrency(s.price)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Offer Price (₹) *</label>
                <input required type="number" step="0.01" min="0.01" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
              </div>
              {editingOffer && (
                <div className="flex items-center pt-2">
                  <input type="checkbox" id="offerIsActive" checked={offerIsActive} onChange={e=>setOfferIsActive(e.target.checked)} className="h-4 w-4 bg-bg-base border-border-hairline-strong accent-accent-oxblood focus:ring-0 cursor-pointer" />
                  <label htmlFor="offerIsActive" className="ml-2 text-xs font-medium text-text-secondary cursor-pointer">Offer is active</label>
                </div>
              )}
              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setOfferModalOpen(false)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !offerServiceId} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Combo Modal */}
      {comboModalOpen && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-lg max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-semibold mb-6 text-text-primary">{editingCombo ? "Edit Combo" : "Add Combo"}</h3>
            <form onSubmit={handleSaveCombo} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Combo Name *</label>
                <input required type="text" value={comboName} onChange={e=>setComboName(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Description</label>
                <textarea value={comboDescription} onChange={e=>setComboDescription(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" rows={2} />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Included Services (Select at least 2) *</label>
                <div className="bg-bg-panel border border-border-hairline-strong p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-auto">
                  {services.map(s => (
                    <label key={s.id} className="flex items-start gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={comboServices.includes(s.id)}
                        onChange={() => handleToggleComboService(s.id)}
                        className="mt-1 h-4 w-4 bg-bg-base border-border-hairline-strong accent-accent-oxblood focus:ring-0 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary group-hover:text-accent-oxblood transition-colors">{s.name}</span>
                        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">{formatCurrency(s.price)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Bundle Price (₹) *</label>
                <input required type="number" step="0.01" min="0.01" value={comboPrice} onChange={e=>setComboPrice(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
              </div>

              {editingCombo && (
                <div className="flex items-center pt-2">
                  <input type="checkbox" id="comboIsActive" checked={comboIsActive} onChange={e=>setComboIsActive(e.target.checked)} className="h-4 w-4 bg-bg-base border-border-hairline-strong accent-accent-oxblood focus:ring-0 cursor-pointer" />
                  <label htmlFor="comboIsActive" className="ml-2 text-xs font-medium text-text-secondary cursor-pointer">Combo is active</label>
                </div>
              )}
              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setComboModalOpen(false)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={saving || comboServices.length < 2} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save Combo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, MapPin, Globe, Calendar, Tag, Gift, Percent, Layers, X, Target } from "lucide-react";

interface Branch { id: string; name: string; }
interface Service { id: string; name: string; branch_id: string | null; }

interface Offer {
  id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'flat' | 'multiplier' | 'reward';
  discount_value: number;
  points_required: number;
  min_spend: number;
  start_date: string | null;
  end_date: string | null;
  branch_id: string | null;
  branch_name: string | null;
  is_active: number;
}

interface Combo {
  id: string;
  name: string;
  description: string;
  bundle_price: number;
  start_date: string | null;
  end_date: string | null;
  branch_id: string | null;
  branch_name: string | null;
  is_active: number;
  services: { service_id: string; service_name: string }[];
}

export default function AdminOffersPage() {
  const [activeTab, setActiveTab] = useState<'offers' | 'combos'>('offers');
  const [loading, setLoading] = useState(true);
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Modals
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [isEditOfferOpen, setIsEditOfferOpen] = useState(false);
  const [isAddComboOpen, setIsAddComboOpen] = useState(false);
  const [isEditComboOpen, setIsEditComboOpen] = useState(false);

  // Forms
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [offerForm, setOfferForm] = useState({
    id: "", name: "", description: "", discount_type: "reward", discount_value: 0, 
    points_required: 0, min_spend: 0, start_date: "", end_date: "", branch_id: "", is_active: true
  });

  const [comboForm, setComboForm] = useState({
    id: "", name: "", description: "", bundle_price: 0, start_date: "", 
    end_date: "", branch_id: "", service_ids: [] as string[], is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resOffers, resCombos, resBranches, resServices] = await Promise.all([
        fetch("/api/admin/offers").then(r => r.json()),
        fetch("/api/admin/combos").then(r => r.json()),
        fetch("/api/admin/branches").then(r => r.json()),
        fetch("/api/admin/services").then(r => r.json())
      ]);

      if (resOffers.offers) setOffers(resOffers.offers);
      if (resCombos.combos) setCombos(resCombos.combos);
      if (resBranches.branches) setBranches(resBranches.branches);
      if (resServices.services) setServices(resServices.services);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetOfferForm = () => {
    setOfferForm({ id: "", name: "", description: "", discount_type: "reward", discount_value: 0, points_required: 0, min_spend: 0, start_date: "", end_date: "", branch_id: "", is_active: true });
    setFormError("");
  };

  const resetComboForm = () => {
    setComboForm({ id: "", name: "", description: "", bundle_price: 0, start_date: "", end_date: "", branch_id: "", service_ids: [], is_active: true });
    setFormError("");
  };

  // OFFER HANDLERS
  const handleOfferSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const payload = {
      name: offerForm.name,
      description: offerForm.description || undefined,
      discount_type: offerForm.discount_type,
      discount_value: Number(offerForm.discount_value),
      points_required: Number(offerForm.points_required),
      min_spend: Number(offerForm.min_spend),
      start_date: offerForm.start_date ? new Date(offerForm.start_date).toISOString() : null,
      end_date: offerForm.end_date ? new Date(offerForm.end_date).toISOString() : null,
      branch_id: offerForm.branch_id || null,
      ...(isEdit && { is_active: offerForm.is_active })
    };

    try {
      const url = isEdit ? `/api/admin/offers/${offerForm.id}` : "/api/admin/offers";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) setFormError(data.error || "Failed to save offer");
      else {
        isEdit ? setIsEditOfferOpen(false) : setIsAddOfferOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditOffer = (o: Offer) => {
    setOfferForm({
      id: o.id, name: o.name, description: o.description || "",
      discount_type: o.discount_type, discount_value: o.discount_value || 0,
      points_required: o.points_required || 0, min_spend: o.min_spend || 0,
      start_date: o.start_date ? o.start_date.split('T')[0] : "",
      end_date: o.end_date ? o.end_date.split('T')[0] : "",
      branch_id: o.branch_id || "", is_active: o.is_active === 1
    });
    setIsEditOfferOpen(true);
  };

  // COMBO HANDLERS
  const handleComboSubmit = async (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    setFormError("");
    
    if (comboForm.service_ids.length < 2) {
      setFormError("Please select at least 2 services for a combo.");
      return;
    }
    
    setFormLoading(true);

    const payload = {
      name: comboForm.name,
      description: comboForm.description || undefined,
      bundle_price: Number(comboForm.bundle_price),
      start_date: comboForm.start_date ? new Date(comboForm.start_date).toISOString() : null,
      end_date: comboForm.end_date ? new Date(comboForm.end_date).toISOString() : null,
      branch_id: comboForm.branch_id || null,
      service_ids: comboForm.service_ids,
      ...(isEdit && { is_active: comboForm.is_active })
    };

    try {
      const url = isEdit ? `/api/admin/combos/${comboForm.id}` : "/api/admin/combos";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) setFormError(data.error || "Failed to save combo");
      else {
        isEdit ? setIsEditComboOpen(false) : setIsAddComboOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditCombo = (c: Combo) => {
    setComboForm({
      id: c.id, name: c.name, description: c.description || "",
      bundle_price: c.bundle_price,
      start_date: c.start_date ? c.start_date.split('T')[0] : "",
      end_date: c.end_date ? c.end_date.split('T')[0] : "",
      branch_id: c.branch_id || "", is_active: c.is_active === 1,
      service_ids: c.services.map(s => s.service_id)
    });
    setIsEditComboOpen(true);
  };

  const toggleComboService = (svcId: string) => {
    setComboForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(svcId) 
        ? prev.service_ids.filter(id => id !== svcId)
        : [...prev.service_ids, svcId]
    }));
  };

  const handleDelete = async (type: 'offer' | 'combo', id: string) => {
    if (!confirm(`Are you sure you want to deactivate this ${type}?`)) return;
    try {
      const res = await fetch(`/api/admin/${type}s/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const formatDate = (isoStr: string | null) => isoStr ? new Date(isoStr).toLocaleDateString() : 'Forever';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-inter">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-l-[3px] border-[#800020] pl-4">
          <div>
            <h1 className="text-3xl font-fraunces font-semibold tracking-tight">Offers & Combos</h1>
            <p className="text-gray-400 mt-1">Manage promotional discounts, loyalty rewards, and service bundles.</p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'offers' ? (
              <button onClick={() => { resetOfferForm(); setIsAddOfferOpen(true); }} className="flex items-center gap-2 bg-[#121212] border border-white/10 hover:border-white/30 text-white px-4 py-2 text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add Offer
              </button>
            ) : (
              <button onClick={() => { resetComboForm(); setIsAddComboOpen(true); }} className="flex items-center gap-2 bg-[#121212] border border-white/10 hover:border-white/30 text-white px-4 py-2 text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add Combo
              </button>
            )}
          </div>
        </div>

        <div className="flex border-b border-white/10 mb-6">
          <button onClick={() => setActiveTab('offers')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'offers' ? 'border-b-2 border-[#800020] text-white' : 'text-gray-500 hover:text-gray-300'}`}>Promotional Offers</button>
          <button onClick={() => setActiveTab('combos')} className={`px-6 py-3 font-medium transition-colors ${activeTab === 'combos' ? 'border-b-2 border-[#800020] text-white' : 'text-gray-500 hover:text-gray-300'}`}>Service Combos</button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading data...</div>
        ) : activeTab === 'offers' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map(o => (
              <div key={o.id} className={`bg-[#121212] border border-white/10 p-5 flex flex-col relative ${o.is_active ? '' : 'opacity-60 grayscale'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-fraunces text-xl font-medium">{o.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {o.branch_id ? (
                        <span className="flex items-center gap-1 font-mono text-xs text-[#800020] bg-[#800020]/10 px-2 py-0.5 rounded-sm"><MapPin className="w-3 h-3" /> {o.branch_name}</span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-sm"><Globe className="w-3 h-3" /> Global</span>
                      )}
                      {!o.is_active && <span className="text-[10px] uppercase tracking-wider text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded-sm">Inactive</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditOffer(o)} className="text-gray-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                    {o.is_active && <button onClick={() => handleDelete('offer', o.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                <div className="space-y-3 flex-grow text-sm text-gray-300">
                  <p className="line-clamp-2 text-gray-400 text-xs mb-2">{o.description}</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/5 p-2">
                      {o.discount_type === 'percentage' && <Percent className="w-4 h-4 text-green-400 shrink-0" />}
                      {o.discount_type === 'flat' && <Tag className="w-4 h-4 text-green-400 shrink-0" />}
                      {o.discount_type === 'multiplier' && <Layers className="w-4 h-4 text-purple-400 shrink-0" />}
                      {o.discount_type === 'reward' && <Gift className="w-4 h-4 text-yellow-500 shrink-0" />}
                      <span className="font-mono">
                        {o.discount_type === 'percentage' ? `${o.discount_value}% OFF` : ''}
                        {o.discount_type === 'flat' ? `$${o.discount_value} OFF` : ''}
                        {o.discount_type === 'multiplier' ? `${o.discount_value}x Pts` : ''}
                        {o.discount_type === 'reward' ? 'Reward' : ''}
                      </span>
                    </div>
                    {o.points_required > 0 && (
                      <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/5 p-2">
                        <Gift className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span className="font-mono">{o.points_required} pts</span>
                      </div>
                    )}
                  </div>
                  {(o.start_date || o.end_date) && (
                    <div className="pt-2 flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span className="font-mono">{formatDate(o.start_date)} - {formatDate(o.end_date)}</span>
                    </div>
                  )}
                  {o.min_spend > 0 && (
                    <div className="pt-1 flex items-center gap-2 text-xs text-gray-400">
                      <Target className="w-3 h-3" /> Min Spend: <span className="font-mono text-gray-200">${o.min_spend}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {combos.map(c => (
              <div key={c.id} className={`bg-[#121212] border border-white/10 p-5 flex flex-col relative ${c.is_active ? '' : 'opacity-60 grayscale'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-fraunces text-xl font-medium">{c.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {c.branch_id ? (
                        <span className="flex items-center gap-1 font-mono text-xs text-[#800020] bg-[#800020]/10 px-2 py-0.5 rounded-sm"><MapPin className="w-3 h-3" /> {c.branch_name}</span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-sm"><Globe className="w-3 h-3" /> Global</span>
                      )}
                      {!c.is_active && <span className="text-[10px] uppercase tracking-wider text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded-sm">Inactive</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditCombo(c)} className="text-gray-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                    {c.is_active && <button onClick={() => handleDelete('combo', c.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                <div className="space-y-3 flex-grow text-sm text-gray-300">
                  <p className="line-clamp-2 text-gray-400 text-xs mb-2">{c.description}</p>
                  <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/5 p-2 mb-2 w-fit">
                    <Tag className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="font-mono text-green-400">${c.bundle_price.toFixed(2)}</span>
                  </div>
                  {(c.start_date || c.end_date) && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <Calendar className="w-3 h-3" />
                      <span className="font-mono">{formatDate(c.start_date)} - {formatDate(c.end_date)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Included Services:</p>
                    <ul className="list-disc list-inside text-xs text-gray-300 space-y-0.5">
                      {c.services.map(s => <li key={s.service_id}>{s.service_name}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offer Modal */}
      {(isAddOfferOpen || isEditOfferOpen) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-white/10 p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-l-[3px] border-[#800020] pl-3">
              <h2 className="text-xl font-fraunces">{isEditOfferOpen ? "Edit Offer" : "Create Offer"}</h2>
              <button onClick={() => { setIsAddOfferOpen(false); setIsEditOfferOpen(false); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            {formError && <div className="bg-red-950/50 border border-red-900/50 text-red-200 text-sm p-3 mb-4 rounded-sm">{formError}</div>}

            <form onSubmit={e => handleOfferSubmit(e, isEditOfferOpen)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Offer Name</label>
                  <input required value={offerForm.name} onChange={e => setOfferForm({ ...offerForm, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-[#800020] font-medium mb-1">Branch Scope</label>
                  <select value={offerForm.branch_id} onChange={e => setOfferForm({ ...offerForm, branch_id: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]">
                    <option value="">Global (All Branches)</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select value={offerForm.discount_type} onChange={e => setOfferForm({ ...offerForm, discount_type: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]">
                    <option value="reward">Loyalty Reward (Points Only)</option>
                    <option value="percentage">Percentage Discount</option>
                    <option value="flat">Flat Amount Discount</option>
                    <option value="multiplier">Points Multiplier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Value (%, $, or X)</label>
                  <input type="number" step="0.01" min="0" value={offerForm.discount_value} onChange={e => setOfferForm({ ...offerForm, discount_value: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" disabled={offerForm.discount_type === 'reward'} />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Points Required to Redeem</label>
                  <input type="number" min="0" value={offerForm.points_required} onChange={e => setOfferForm({ ...offerForm, points_required: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Minimum Spend ($)</label>
                  <input type="number" min="0" value={offerForm.min_spend} onChange={e => setOfferForm({ ...offerForm, min_spend: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input type="date" value={offerForm.start_date} onChange={e => setOfferForm({ ...offerForm, start_date: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input type="date" value={offerForm.end_date} onChange={e => setOfferForm({ ...offerForm, end_date: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea rows={2} value={offerForm.description} onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020] resize-none" />
                </div>
              </div>
              
              {isEditOfferOpen && (
                <div className="pt-2 flex items-center gap-2">
                  <input type="checkbox" id="is_active_offer" checked={offerForm.is_active} onChange={e => setOfferForm({ ...offerForm, is_active: e.target.checked })} />
                  <label htmlFor="is_active_offer" className="text-sm text-gray-300">Offer is Active</label>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => { setIsAddOfferOpen(false); setIsEditOfferOpen(false); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 text-sm bg-white text-black hover:bg-gray-200 disabled:opacity-50">
                  {formLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Combo Modal */}
      {(isAddComboOpen || isEditComboOpen) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-white/10 p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-l-[3px] border-[#800020] pl-3">
              <h2 className="text-xl font-fraunces">{isEditComboOpen ? "Edit Combo" : "Create Combo"}</h2>
              <button onClick={() => { setIsAddComboOpen(false); setIsEditComboOpen(false); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            {formError && <div className="bg-red-950/50 border border-red-900/50 text-red-200 text-sm p-3 mb-4 rounded-sm">{formError}</div>}

            <form onSubmit={e => handleComboSubmit(e, isEditComboOpen)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Combo Name</label>
                  <input required value={comboForm.name} onChange={e => setComboForm({ ...comboForm, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-[#800020] font-medium mb-1">Branch Scope</label>
                  <select value={comboForm.branch_id} onChange={e => setComboForm({ ...comboForm, branch_id: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]">
                    <option value="">Global (All Branches)</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Bundle Price ($)</label>
                  <input required type="number" step="0.01" min="0" value={comboForm.bundle_price} onChange={e => setComboForm({ ...comboForm, bundle_price: Number(e.target.value) })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input type="date" value={comboForm.start_date} onChange={e => setComboForm({ ...comboForm, start_date: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input type="date" value={comboForm.end_date} onChange={e => setComboForm({ ...comboForm, end_date: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea rows={2} value={comboForm.description} onChange={e => setComboForm({ ...comboForm, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020] resize-none" />
                </div>

                <div className="col-span-2 mt-2">
                  <label className="block text-sm text-[#800020] font-medium mb-2">Select Services (Min 2)</label>
                  <div className="max-h-40 overflow-y-auto bg-[#0a0a0a] border border-white/10 p-2 space-y-1">
                    {services.filter(s => !comboForm.branch_id || !s.branch_id || s.branch_id === comboForm.branch_id).map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-1 hover:bg-white/5 cursor-pointer">
                        <input type="checkbox" checked={comboForm.service_ids.includes(s.id)} onChange={() => toggleComboService(s.id)} />
                        <span className="text-sm">{s.name} {s.branch_id ? '(Branch)' : '(Global)'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              {isEditComboOpen && (
                <div className="pt-2 flex items-center gap-2">
                  <input type="checkbox" id="is_active_combo" checked={comboForm.is_active} onChange={e => setComboForm({ ...comboForm, is_active: e.target.checked })} />
                  <label htmlFor="is_active_combo" className="text-sm text-gray-300">Combo is Active</label>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => { setIsAddComboOpen(false); setIsEditComboOpen(false); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 text-sm bg-white text-black hover:bg-gray-200 disabled:opacity-50">
                  {formLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

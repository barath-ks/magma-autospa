"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Gift, 
  Award, 
  Globe, 
  MapPin, 
  Search, 
  AlertCircle, 
  X, 
  Sparkles,
  Coins,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Branch {
  id: string;
  name: string;
  code?: string;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  branch_id: string | null;
  branch_name: string | null;
  is_active: number | boolean;
  created_at?: string;
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete modal states
  const [deleteConfirmReward, setDeleteConfirmReward] = useState<Reward | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsRequired, setPointsRequired] = useState("");
  const [branchId, setBranchId] = useState(""); // "" denotes All Branches (Global)
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, branchesRes] = await Promise.all([
        fetch("/api/admin/rewards"),
        fetch("/api/admin/branches")
      ]);

      if (rewardsRes.ok) {
        const rewardsData = await rewardsRes.json();
        setRewards(rewardsData.rewards || []);
      }

      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData.branches || []);
      }
    } catch (err) {
      console.error("Error fetching rewards/branches:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingReward(null);
    setName("");
    setDescription("");
    setPointsRequired("");
    setBranchId(""); // Default to All Branches
    setIsActive(true);
    setModalError("");
    setModalOpen(true);
  };

  const openEditModal = (reward: Reward) => {
    setEditingReward(reward);
    setName(reward.name || "");
    setDescription(reward.description || "");
    setPointsRequired(String(reward.points_required || ""));
    setBranchId(reward.branch_id || "");
    setIsActive(Boolean(reward.is_active));
    setModalError("");
    setModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    const parsedPoints = Number(pointsRequired);
    if (isNaN(parsedPoints) || parsedPoints <= 0) {
      setModalError("Points cost must be a positive number greater than 0");
      return;
    }

    if (!name.trim()) {
      setModalError("Reward name is required");
      return;
    }

    setModalSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      points_required: parsedPoints,
      branch_id: branchId && branchId.trim() !== "" ? branchId.trim() : null,
      is_active: isActive
    };

    try {
      const url = editingReward 
        ? `/api/admin/rewards/${editingReward.id}` 
        : "/api/admin/rewards";
      
      const res = await fetch(url, {
        method: editingReward ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || "Failed to save reward");
        setModalSaving(false);
        return;
      }

      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error("Error saving reward:", err);
      setModalError(err?.message || "An unexpected error occurred while saving");
    } finally {
      setModalSaving(false);
    }
  };

  const handleToggleActive = async (reward: Reward) => {
    try {
      const nextStatus = !reward.is_active;
      const res = await fetch(`/api/admin/rewards/${reward.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus })
      });

      if (res.ok) {
        setRewards(prev =>
          prev.map(r => r.id === reward.id ? { ...r, is_active: nextStatus ? 1 : 0 } : r)
        );
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update reward status");
      }
    } catch (err) {
      console.error("Error toggling reward status:", err);
    }
  };

  const handleDeleteReward = async () => {
    if (!deleteConfirmReward) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/rewards/${deleteConfirmReward.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setDeleteConfirmReward(null);
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete reward");
      }
    } catch (err) {
      console.error("Error deleting reward:", err);
      alert("Failed to delete reward");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered rewards
  const filteredRewards = useMemo(() => {
    return rewards.filter(r => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesDesc = (r.description || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Branch filter
      if (selectedBranch !== "ALL") {
        if (selectedBranch === "GLOBAL") {
          if (r.branch_id !== null) return false;
        } else {
          if (r.branch_id !== selectedBranch) return false;
        }
      }

      // Status filter
      if (statusFilter === "ACTIVE" && !r.is_active) return false;
      if (statusFilter === "INACTIVE" && Boolean(r.is_active)) return false;

      return true;
    });
  }, [rewards, searchQuery, selectedBranch, statusFilter]);

  // Quick stats
  const activeCount = useMemo(() => rewards.filter(r => Boolean(r.is_active)).length, [rewards]);
  const globalCount = useMemo(() => rewards.filter(r => r.branch_id === null).length, [rewards]);
  const avgPoints = useMemo(() => {
    if (rewards.length === 0) return 0;
    const total = rewards.reduce((sum, r) => sum + (r.points_required || 0), 0);
    return Math.round(total / rewards.length);
  }, [rewards]);

  return (
    <main className="flex-1 p-6 md:p-8 lg:p-12 overflow-auto bg-bg-base text-text-primary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <Breadcrumbs 
            items={[{ label: "System", href: "/admin" }, { label: "Loyalty Rewards" }]} 
            accentClass="hover:text-accent-oxblood" 
          />
          <h1 className="text-3xl font-semibold text-text-primary mt-2 flex items-center gap-3">
            <Gift className="text-accent-oxblood" size={28} />
            Loyalty Rewards
          </h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">
            Configure customer point redemption rewards, point pricing, and branch availability.
          </p>
        </div>
        <button 
          onClick={openAddModal} 
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-oxblood text-white text-xs font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg hover:shadow-accent-oxblood/20 cursor-pointer active:scale-95"
        >
          <Plus size={16} /> Add Loyalty Reward
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="panel p-5 border-l-[3px] border-l-accent-oxblood">
          <div className="flex items-center justify-between text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">
            <span>Total Rewards</span>
            <Gift size={14} className="text-accent-oxblood" />
          </div>
          <div className="text-2xl font-mono font-bold text-text-primary">{rewards.length}</div>
          <div className="text-[11px] text-text-secondary mt-1">Configured catalog</div>
        </div>

        <div className="panel p-5 border-l-[3px] border-l-[#4ade80]">
          <div className="flex items-center justify-between text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">
            <span>Active Rewards</span>
            <CheckCircle2 size={14} className="text-[#4ade80]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#4ade80]">{activeCount}</div>
          <div className="text-[11px] text-text-secondary mt-1">Available for redemption</div>
        </div>

        <div className="panel p-5 border-l-[3px] border-l-accent-copper">
          <div className="flex items-center justify-between text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">
            <span>Global Scope</span>
            <Globe size={14} className="text-accent-copper" />
          </div>
          <div className="text-2xl font-mono font-bold text-text-primary">{globalCount}</div>
          <div className="text-[11px] text-text-secondary mt-1">All branches accepted</div>
        </div>

        <div className="panel p-5 border-l-[3px] border-l-accent-gold">
          <div className="flex items-center justify-between text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">
            <span>Avg Points Cost</span>
            <Coins size={14} className="text-accent-gold" />
          </div>
          <div className="text-2xl font-mono font-bold text-accent-gold">{avgPoints} <span className="text-xs font-normal text-text-secondary">pts</span></div>
          <div className="text-[11px] text-text-secondary mt-1">Per redemption</div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="panel p-16 text-center border-l-[3px] border-l-accent-oxblood">
          <div className="animate-spin w-8 h-8 border-2 border-accent-oxblood border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm font-mono text-text-secondary uppercase tracking-widest">
            Loading loyalty rewards catalog...
          </p>
        </div>
      ) : rewards.length === 0 ? (
        /* Empty State: Clean Rebuilt Initial Screen */
        <div className="panel p-12 md:p-16 text-center border-l-[3px] border-l-accent-oxblood bg-bg-panel-elevated/40">
          <div className="w-16 h-16 rounded-full bg-accent-oxblood/10 border border-accent-oxblood/30 flex items-center justify-center mx-auto mb-6 text-accent-oxblood">
            <Gift size={32} />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-text-primary mb-2">
            No Loyalty Rewards Configured Yet
          </h2>
          <p className="text-text-secondary max-w-md mx-auto text-sm mb-8 leading-relaxed">
            The loyalty reward catalog is completely clean. When customers earn points on wash and detailing services, they can redeem them for rewards you create here.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-oxblood text-white text-xs font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg hover:shadow-accent-oxblood/20 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> Add First Loyalty Reward
          </button>
        </div>
      ) : (
        <>
          {/* Filters and Search Bar */}
          <div className="panel p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-border-hairline">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search rewards by name or description..."
                className="w-full bg-bg-base border border-border-hairline-strong pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/60 focus:border-accent-oxblood focus:outline-none transition-colors"
              />
            </div>

            {/* Scope and Status Selectors */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Branch Scope Dropdown */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary text-[10px] uppercase tracking-wider font-bold">Scope:</span>
                <select
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="bg-bg-base border border-border-hairline-strong px-3 py-2 text-xs text-text-primary focus:border-accent-oxblood focus:outline-none transition-colors"
                >
                  <option value="ALL">All Scopes</option>
                  <option value="GLOBAL">Global (All Branches)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>Branch: {b.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Buttons */}
              <div className="inline-flex border border-border-hairline-strong p-0.5 bg-bg-base">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold transition-colors ${
                    statusFilter === "ALL" 
                      ? "bg-accent-oxblood text-white" 
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold transition-colors ${
                    statusFilter === "ACTIVE" 
                      ? "bg-accent-oxblood text-white" 
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("INACTIVE")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold transition-colors ${
                    statusFilter === "INACTIVE" 
                      ? "bg-accent-oxblood text-white" 
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Rewards List Table */}
          <div className="panel overflow-hidden border-l-[3px] border-l-accent-oxblood">
            {filteredRewards.length === 0 ? (
              <div className="p-12 text-center text-text-secondary">
                <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs uppercase tracking-widest font-mono">No rewards match your filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
                    <tr>
                      <th className="p-4 pl-6">Reward Name & Description</th>
                      <th className="p-4">Branch Scope</th>
                      <th className="p-4">Points Required</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline bg-bg-panel text-sm">
                    {filteredRewards.map(reward => {
                      const isRewardActive = Boolean(reward.is_active);
                      return (
                        <tr 
                          key={reward.id} 
                          className="hover:bg-bg-panel-elevated/70 transition-colors group"
                        >
                          {/* Name & Description */}
                          <td className="p-4 pl-6">
                            <div className="font-semibold text-text-primary flex items-center gap-2">
                              <span>{reward.name}</span>
                            </div>
                            <div className="text-xs text-text-secondary mt-1 line-clamp-1 max-w-md">
                              {reward.description ? reward.description : <span className="italic opacity-60">No description provided</span>}
                            </div>
                          </td>

                          {/* Scope */}
                          <td className="p-4">
                            {reward.branch_id ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono bg-bg-base border border-border-hairline text-text-primary">
                                <MapPin size={12} className="text-accent-copper" />
                                {reward.branch_name || "Specific Branch"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono bg-accent-copper/10 border border-accent-copper/30 text-accent-copper">
                                <Globe size={12} />
                                All Branches (Global)
                              </span>
                            )}
                          </td>

                          {/* Points Required */}
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold text-accent-gold bg-accent-gold/10 border border-accent-gold/25">
                              <Coins size={13} />
                              {reward.points_required.toLocaleString()} PTS
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(reward)}
                              title="Click to toggle status"
                              className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer group/toggle"
                            >
                              {isRewardActive ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/30 px-2.5 py-0.5 group-hover/toggle:border-[#4ade80]">
                                  <CheckCircle2 size={12} /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-text-secondary bg-bg-base border border-border-hairline px-2.5 py-0.5 group-hover/toggle:border-text-primary">
                                  <XCircle size={12} /> Inactive
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => openEditModal(reward)} 
                                title="Edit Reward"
                                className="p-2 text-text-secondary hover:text-white hover:bg-bg-panel-elevated transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmReward(reward)} 
                                title="Delete Reward"
                                className="p-2 text-text-secondary hover:text-accent-oxblood hover:bg-bg-panel-elevated transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Reward Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-oxblood p-6 md:p-8 w-full max-w-lg bg-bg-panel shadow-2xl relative">
            <button 
              onClick={() => setModalOpen(false)} 
              className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-accent-oxblood" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent-oxblood">
                Loyalty Module
              </span>
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-6">
              {editingReward ? "Edit Loyalty Reward" : "Create New Loyalty Reward"}
            </h3>

            {modalError && (
              <div className="mb-6 p-3.5 bg-accent-oxblood/10 border border-accent-oxblood/40 text-accent-oxblood text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveReward} className="space-y-5">
              {/* Reward Name */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">
                  Reward Name <span className="text-accent-oxblood">*</span>
                </label>
                <input 
                  required 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Full Exterior Foam Wash"
                  className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors placeholder:text-text-secondary/50" 
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">
                  Description <span className="text-text-secondary/60 text-[9px] font-normal">(optional)</span>
                </label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="e.g. Complete exterior foam wash including high-pressure rinse and tire dressing."
                  className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-xs focus:border-accent-oxblood focus:outline-none transition-colors placeholder:text-text-secondary/50" 
                  rows={3} 
                />
              </div>

              {/* Points Cost & Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">
                    Points Cost <span className="text-accent-oxblood">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      step="1"
                      value={pointsRequired} 
                      onChange={e => setPointsRequired(e.target.value)} 
                      placeholder="100"
                      className="w-full bg-bg-base border border-border-hairline-strong p-3 pr-10 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-accent-gold">
                      PTS
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">
                    Branch Availability
                  </label>
                  <select 
                    value={branchId} 
                    onChange={e => setBranchId(e.target.value)} 
                    className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-xs focus:border-accent-oxblood focus:outline-none transition-colors"
                  >
                    <option value="">All Branches (Global)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={isActive} 
                  onChange={e => setIsActive(e.target.checked)} 
                  className="h-4 w-4 bg-bg-base border-border-hairline-strong accent-accent-oxblood focus:ring-0 cursor-pointer" 
                />
                <label htmlFor="isActive" className="text-xs font-medium text-text-primary cursor-pointer select-none">
                  Reward is active and available for customer redemptions
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border-hairline">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={modalSaving} 
                  className="px-6 py-2 text-xs font-bold uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {modalSaving ? "Saving..." : editingReward ? "Update Reward" : "Create Reward"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReward && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-oxblood p-6 md:p-8 w-full max-w-md bg-bg-panel shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4 text-accent-oxblood">
              <div className="w-10 h-10 rounded-full bg-accent-oxblood/10 border border-accent-oxblood/30 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                Delete Loyalty Reward
              </h3>
            </div>

            <p className="text-text-secondary text-xs leading-relaxed mb-4">
              Are you sure you want to remove <strong className="text-text-primary font-mono">"{deleteConfirmReward.name}"</strong>?
            </p>
            <p className="text-text-secondary/70 text-[11px] mb-6">
              If past redemptions have occurred under this reward, it will be safely deactivated to maintain financial ledger integrity. If no redemptions exist, it will be permanently deleted.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-hairline">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmReward(null)} 
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDeleteReward}
                disabled={isDeleting} 
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-md"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Phone, MapPin, Hash, Trash2, ShieldCheck, X, Eye, EyeOff, Copy, Check, KeyRound, ExternalLink, RefreshCw } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  code: string;
  branch_code?: string;
  email?: string;
  display_password?: string;
  must_change_password?: number | boolean;
  location: string;
  phone: string;
  is_active: number;
  active_staff_count: number;
  manager_id: string | null;
  manager_name: string | null;
}

interface Manager {
  id: string;
  name: string;
  branch_id: string | null;
}

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createdBranchCreds, setCreatedBranchCreds] = useState<Branch | null>(null);

  // Credential view & copy states
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  
  // Form states
  const [formData, setFormData] = useState({ 
    id: "", 
    name: "", 
    code: "", 
    email: "",
    location: "", 
    phone: "", 
    password: "",
    must_change_password: true,
    is_active: true, 
    manager_id: "" 
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resBranches, resUsers] = await Promise.all([
        fetch("/api/admin/branches").then((res) => res.json()),
        fetch("/api/admin/users").then((res) => res.json()),
      ]);

      if (resBranches.branches) {
        setBranches(resBranches.branches);
      }
      
      if (resUsers.users) {
        const mgrs = resUsers.users.filter((u: any) => u.role === "manager");
        setManagers(mgrs);
      }
    } catch (e) {
      console.error("Error fetching data", e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const togglePasswordVisibility = (branchId: string) => {
    setShowPasswordMap(prev => ({ ...prev, [branchId]: !prev[branchId] }));
  };

  const generateRandomPassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const generated = `Magma@${randomDigits}`;
    setFormData(prev => ({ ...prev, password: generated }));
  };

  const resetForm = () => {
    setFormData({ 
      id: "", 
      name: "", 
      code: "", 
      email: "",
      location: "", 
      phone: "", 
      password: "",
      must_change_password: true,
      is_active: true, 
      manager_id: "" 
    });
    setFormError("");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          email: formData.email,
          location: formData.location,
          phone: formData.phone,
          password: formData.password,
          must_change_password: formData.must_change_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create branch");
      } else {
        setIsAddOpen(false);
        resetForm();
        setCreatedBranchCreds(data.branch);
        fetchData(); // Refresh list
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
      const payload: any = {
        name: formData.name,
        code: formData.code,
        email: formData.email || undefined,
        location: formData.location,
        phone: formData.phone,
        is_active: formData.is_active,
        manager_id: formData.manager_id || null,
        must_change_password: formData.must_change_password,
      };

      if (formData.password && formData.password.trim() !== "") {
        payload.password = formData.password.trim();
      }

      const res = await fetch(`/api/admin/branches/${formData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to update branch");
      } else {
        setIsEditOpen(false);
        resetForm();
        fetchData(); // Refresh list
      }
    } catch (err: any) {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (branch: Branch) => {
    setFormData({
      id: branch.id,
      name: branch.name,
      code: branch.code || "",
      email: branch.email || "",
      location: branch.location,
      phone: branch.phone || "",
      password: "",
      must_change_password: Boolean(branch.must_change_password),
      is_active: branch.is_active === 1,
      manager_id: branch.manager_id || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this branch?")) return;
    try {
      const res = await fetch(`/api/admin/branches/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-inter">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-l-[3px] border-[#800020] pl-4">
          <div>
            <h1 className="text-3xl font-fraunces font-semibold tracking-tight">Branch Management</h1>
            <p className="text-gray-400 mt-1">Manage operations, addresses, and assign branch managers.</p>
          </div>
          <button
            onClick={() => { resetForm(); setIsAddOpen(true); }}
            className="flex items-center gap-2 bg-[#121212] border border-white/10 hover:border-white/30 text-white px-4 py-2 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Branch
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-mono text-sm">Loading branches...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((b) => {
              const isPasswordVisible = !!showPasswordMap[b.id];
              const isPasswordCopied = !!copiedMap[`pwd-${b.id}`];
              const isEmailCopied = !!copiedMap[`email-${b.id}`];
              const isCodeCopied = !!copiedMap[`code-${b.id}`];

              return (
                <div key={b.id} className={`bg-[#121212] border border-white/10 p-5 flex flex-col justify-between relative ${b.is_active ? '' : 'opacity-60 grayscale'}`}>
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Link href={`/admin/branches/${b.id}`} className="font-fraunces text-xl font-medium text-white hover:text-[#B87333] transition-colors flex items-center gap-1.5 group">
                          {b.name}
                          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#B87333]" />
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <button
                            onClick={() => copyToClipboard(b.branch_code || b.code, `code-${b.id}`)}
                            title="Click to copy branch code"
                            className="font-mono text-[11px] text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm hover:border-white/30 flex items-center gap-1 transition-colors"
                          >
                            <span>{b.branch_code || b.code}</span>
                            {isCodeCopied ? <Check size={10} className="text-green-400" /> : <Copy size={10} className="text-gray-500" />}
                          </button>

                          {b.must_change_password ? (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-sm">
                              First Login Pending
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-sm">
                              Password Secured
                            </span>
                          )}

                          {!b.is_active && (
                            <span className="text-[10px] uppercase tracking-wider text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded-sm">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-white transition-colors p-1" title="Edit Branch">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {b.is_active ? (
                          <button onClick={() => handleDelete(b.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Deactivate Branch">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="space-y-2.5 text-xs text-gray-300 mb-4">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{b.location}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="font-mono">{b.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#800020] shrink-0" />
                        <span>
                          Manager: {b.manager_name ? <span className="text-white font-medium">{b.manager_name}</span> : <span className="text-gray-500 italic">Unassigned</span>}
                        </span>
                      </div>
                    </div>

                    {/* Floor Terminal Credentials Box */}
                    <div className="bg-[#0c0c0c] border border-white/10 p-3 mb-4 rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-widest font-mono text-[#B87333] font-bold flex items-center gap-1.5">
                          <KeyRound size={11} /> Floor Credentials
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">/branch/login</span>
                      </div>

                      {/* Login Email */}
                      <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                        <span className="text-gray-500">Login ID / Email:</span>
                        <div className="flex items-center gap-1.5 font-mono text-gray-200">
                          <span className="max-w-[140px] truncate" title={b.email || b.code}>
                            {b.email || b.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(b.email || b.code, `email-${b.id}`)}
                            title="Copy email"
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            {isEmailCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Active Password */}
                      <div className="flex items-center justify-between text-xs py-1 mt-0.5">
                        <span className="text-gray-500">Active Password:</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-amber-400 tracking-wider">
                            {isPasswordVisible ? (b.display_password || "••••••••") : "••••••••"}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(b.id)}
                            title={isPasswordVisible ? "Hide password" : "Show password"}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            {isPasswordVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          {b.display_password && (
                            <button
                              onClick={() => copyToClipboard(b.display_password!, `pwd-${b.id}`)}
                              title="Copy password"
                              className="text-gray-500 hover:text-white transition-colors"
                            >
                              {isPasswordCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                    <span className="text-gray-500">Floor Staff: <span className="font-mono text-white">{b.active_staff_count}</span></span>
                    <Link href={`/admin/branches/${b.id}`} className="text-[#B87333] hover:underline font-mono text-[11px] uppercase tracking-wider flex items-center gap-1">
                      Manage Branch &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Branch Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-white/10 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-l-[3px] border-[#B87333] pl-3">
              <div>
                <h2 className="text-xl font-fraunces text-white">Create New Branch</h2>
                <p className="text-xs text-gray-400 mt-0.5">Provision a new facility profile and operational credentials.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            {formError && <div className="bg-red-950/50 border border-red-900/50 text-red-200 text-xs p-3 mb-4 rounded-sm font-mono">{formError}</div>}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Branch Name *</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#B87333]" placeholder="e.g. Westside Facility" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Branch Code / Slug *</label>
                <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#B87333]" placeholder="e.g. MAG-BRANCH-02" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Floor Login Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#B87333]" placeholder="Optional (defaults to code@magma-autospa.com)" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Temporary Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] font-mono text-[#B87333] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Auto-Generate
                  </button>
                </div>
                <input 
                  type="text" 
                  value={formData.password} 
                  onChange={e => setFormData({ ...formData, password: e.target.value })} 
                  className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono text-amber-400 focus:outline-none focus:border-[#B87333]" 
                  placeholder="Optional (randomly generated if empty)" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Address / Location *</label>
                <input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#B87333]" placeholder="e.g. 789 Silicon Way" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Contact Phone *</label>
                <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#B87333]" placeholder="e.g. +1 555-0199" />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="must_change_pwd" 
                  checked={formData.must_change_password} 
                  onChange={e => setFormData({ ...formData, must_change_password: e.target.checked })} 
                />
                <label htmlFor="must_change_pwd" className="text-xs text-gray-300">
                  Require password change on first floor login
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-5 py-2 text-xs uppercase tracking-widest font-bold bg-[#B87333] hover:bg-[#a66426] text-white disabled:opacity-50 transition-colors">
                  {formLoading ? "Creating..." : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] border border-white/10 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-l-[3px] border-[#800020] pl-3">
              <div>
                <h2 className="text-xl font-fraunces text-white">Edit Branch</h2>
                <p className="text-xs text-gray-400 mt-0.5">Modify branch details or reset credentials.</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            {formError && <div className="bg-red-950/50 border border-red-900/50 text-red-200 text-xs p-3 mb-4 rounded-sm font-mono">{formError}</div>}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Branch Name</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Branch Code (Slug)</label>
                <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Floor Login Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Reset Password (Optional)</label>
                <input 
                  type="text" 
                  value={formData.password} 
                  onChange={e => setFormData({ ...formData, password: e.target.value })} 
                  className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono text-amber-400 focus:outline-none focus:border-[#800020]" 
                  placeholder="Leave blank to keep current password" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Address / Location</label>
                <input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Contact Phone</label>
                <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#800020]" />
              </div>
              
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#800020] mb-1">Assign Manager</label>
                <select 
                  value={formData.manager_id} 
                  onChange={e => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[#800020]"
                >
                  <option value="">-- Unassigned --</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.branch_id && m.branch_id !== formData.id ? "(Reassign from another branch)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                  <label htmlFor="is_active" className="text-xs text-gray-300">Branch is Active</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="edit_must_change" 
                    checked={formData.must_change_password} 
                    onChange={e => setFormData({ ...formData, must_change_password: e.target.checked })} 
                  />
                  <label htmlFor="edit_must_change" className="text-xs text-gray-300">
                    Require password change on next login
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-5 py-2 text-xs uppercase tracking-widest font-bold bg-[#800020] hover:bg-[#600018] text-white disabled:opacity-50 transition-colors">
                  {formLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Credentials Confirmation Modal */}
      {createdBranchCreds && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#1A1A1A] border border-white/10 border-l-[3px] border-l-[#B87333] p-8 w-full max-w-md text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#B87333]/15 flex items-center justify-center mx-auto mb-4">
              <KeyRound size={22} className="text-[#B87333]" />
            </div>

            <h3 className="text-2xl font-serif font-semibold text-white mb-1">
              Branch Profile Created
            </h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              New branch floor account created for <strong className="text-white">{createdBranchCreds.name}</strong>. Share these temporary credentials with the branch operators.
            </p>

            <div className="bg-[#121212] border border-white/10 p-4 mb-6 text-left space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Portal URL</span>
                <span className="text-white">/branch/login</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2">
                <div>
                  <span className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Branch Code</span>
                  <span className="text-[#B87333]">{createdBranchCreds.branch_code || createdBranchCreds.code}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(createdBranchCreds.branch_code || createdBranchCreds.code, 'created-code')}
                  className="text-gray-400 hover:text-white"
                >
                  {copiedMap['created-code'] ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2">
                <div>
                  <span className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Login Email</span>
                  <span className="text-gray-200">{createdBranchCreds.email}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(createdBranchCreds.email || '', 'created-email')}
                  className="text-gray-400 hover:text-white"
                >
                  {copiedMap['created-email'] ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2">
                <div>
                  <span className="text-[10px] uppercase text-gray-500 font-bold block mb-0.5">Temporary Password</span>
                  <span className="text-amber-400 text-sm font-bold">{createdBranchCreds.display_password}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(createdBranchCreds.display_password || '', 'created-pwd')}
                  className="text-gray-400 hover:text-white"
                >
                  {copiedMap['created-pwd'] ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <button 
              onClick={() => setCreatedBranchCreds(null)} 
              className="w-full py-3 bg-[#B87333] hover:bg-[#a66426] text-white font-bold text-xs uppercase tracking-widest transition-colors"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

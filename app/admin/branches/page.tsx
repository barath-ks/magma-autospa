"use client";
import { useState, useEffect } from "react";
import { Building, Plus, KeyRound, Edit2, Check, X } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

export default function BranchesPage() {
  const [range, setRange] = useState("month");
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Branch State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState("");
  const [createdManager, setCreatedManager] = useState<any>(null);

  // Edit Branch State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editError, setEditError] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, [range]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      // Reusing the financials API since it has all branch info + metrics
      const res = await fetch(`/api/admin/branch-financials?range=${range}`);
      const data = await res.json();
      if (data.financials) setBranches(data.financials);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setAddError("");
    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, location: newLocation, manager_name: managerName, manager_phone: managerPhone, manager_email: managerEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedManager(data.manager);
        setShowAddForm(false);
        setNewName(""); setNewLocation(""); setManagerName(""); setManagerPhone(""); setManagerEmail("");
        fetchBranches();
      } else {
        setAddError(data.error || "Failed to create branch");
      }
    } catch (err) {
      setAddError("An error occurred");
    }
    setSubmittingAdd(false);
  };

  const startEdit = (branch: any, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link click
    setEditingId(branch.branch_id);
    setEditName(branch.branch_name);
    setEditLocation(branch.location);
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent, branchId: string) => {
    e.preventDefault();
    setSubmittingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, location: editLocation })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        fetchBranches();
      } else {
        setEditError(data.error || "Failed to update branch");
      }
    } catch (err) {
      setEditError("An error occurred");
    }
    setSubmittingEdit(false);
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col h-full">
      <div className="w-full max-w-6xl mx-auto mb-8 flex justify-between items-end">
        <div>
          <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Branches" }]} accentClass="hover:text-accent-oxblood" />
          <h1 className="text-3xl font-semibold text-text-primary mt-2">Branches</h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Manage locations and monitor performance</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-bg-panel border border-border-hairline p-1">
            {[
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "year", label: "This Year" }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  range === r.id 
                    ? "bg-accent-oxblood text-white" 
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-panel-elevated"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-accent-oxblood text-white font-bold uppercase tracking-widest text-xs px-6 py-3 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Add Branch
          </button>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto">
        {showAddForm && (
          <div className="panel p-8 mb-8 border-l-[3px] border-l-accent-oxblood animate-in slide-in-from-top-4">
            <h2 className="text-lg font-semibold text-text-primary mb-6">Create New Branch & Manager</h2>
            {addError && <div className="text-[#ff6b6b] bg-[#3a1616] p-3 text-xs font-bold uppercase tracking-widest mb-4">{addError}</div>}
            
            <form onSubmit={handleAddBranch} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary border-b border-border-hairline pb-2">Branch Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Branch Name *</label>
                    <input type="text" required value={newName} onChange={e=>setNewName(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Location/Address *</label>
                    <input type="text" required value={newLocation} onChange={e=>setNewLocation(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary border-b border-border-hairline pb-2">Initial Manager Account</h3>
                <p className="text-[10px] uppercase text-text-secondary tracking-widest">A branch requires at least one manager. Login credentials will be generated automatically.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Manager Full Name *</label>
                    <input type="text" required value={managerName} onChange={e=>setManagerName(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Phone (Optional)</label>
                    <input type="text" value={managerPhone} onChange={e=>setManagerPhone(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Email (Optional)</label>
                    <input type="email" value={managerEmail} onChange={e=>setManagerEmail(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline mt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={submittingAdd} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:opacity-90 disabled:opacity-50 transition-colors">
                  {submittingAdd ? "Creating..." : "Create Branch"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? <p className="text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading branches...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map(branch => {
              const isEditing = editingId === branch.branch_id;
              const isLoss = branch.profit < 0;
              
              if (isEditing) {
                return (
                  <div key={branch.branch_id} className="block panel p-6 border-l-[3px] border-l-accent-oxblood bg-bg-panel-elevated">
                    <form onSubmit={(e) => handleEditSubmit(e, branch.branch_id)} className="space-y-4">
                      {editError && <div className="text-[#ff6b6b] text-[10px] font-bold uppercase tracking-widest">{editError}</div>}
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-1">Branch Name</label>
                        <input type="text" required value={editName} onChange={e=>setEditName(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-2 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-1">Location</label>
                        <input type="text" required value={editLocation} onChange={e=>setEditLocation(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-2 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setEditingId(null)} className="flex-1 py-2 font-medium text-[10px] uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors border border-border-hairline bg-bg-base flex justify-center items-center gap-1">
                          <X size={12}/> Cancel
                        </button>
                        <button type="submit" disabled={submittingEdit} className="flex-1 py-2 font-bold text-[10px] uppercase tracking-widest bg-accent-oxblood text-white hover:opacity-90 disabled:opacity-50 transition-colors flex justify-center items-center gap-1">
                          <Check size={12}/> {submittingEdit ? "..." : "Save"}
                        </button>
                      </div>
                    </form>
                  </div>
                )
              }

              return (
                <Link key={branch.branch_id} href={`/admin/branches/${branch.branch_id}`} className={`group block panel p-6 border-l-[3px] transition-all hover:bg-bg-panel-elevated cursor-pointer relative ${isLoss ? 'border-l-accent-oxblood' : 'border-l-transparent hover:border-l-accent-oxblood'}`}>
                  <button 
                    onClick={(e) => startEdit(branch, e)}
                    className="absolute top-4 right-4 p-2 text-text-secondary hover:text-accent-oxblood opacity-0 group-hover:opacity-100 transition-all z-10 bg-bg-base rounded border border-border-hairline hover:border-accent-oxblood"
                    title="Edit Branch"
                  >
                    <Edit2 size={14} />
                  </button>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded bg-bg-base border border-border-hairline flex items-center justify-center">
                      <Building size={20} className="text-text-secondary group-hover:text-accent-oxblood transition-colors" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1 pr-8">{branch.branch_name}</h3>
                  <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-6">{branch.location}</p>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-border-hairline pt-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-1">Revenue</div>
                      <div className="font-mono text-sm text-text-primary">{formatCurrency(branch.revenue)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-1">Profit</div>
                      <div className={`font-mono font-bold text-sm ${isLoss ? 'text-accent-oxblood' : 'text-[#4ade80]'}`}>
                        {formatCurrency(branch.profit)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {createdManager && (
        <div className="fixed inset-0 bg-bg-base/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-[#4ade80] p-8 w-full max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-[#163a24] flex items-center justify-center mx-auto mb-6">
              <KeyRound size={24} className="text-[#4ade80]" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-text-primary">Branch Created</h3>
            <p className="text-xs text-text-secondary mb-8 uppercase tracking-widest leading-relaxed">
              The branch has been initialized. Please share these credentials with {createdManager.name} securely. They will be required to change this password on their first login.
            </p>
            
            <div className="bg-bg-base border border-border-hairline p-6 mb-8 text-left space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Manager Login ID</div>
                <div className="text-xl font-mono text-text-primary tracking-widest">{createdManager.login_id}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Temporary Password</div>
                <div className="text-xl font-mono text-accent-oxblood tracking-widest">{createdManager.temp_password}</div>
              </div>
            </div>

            <button onClick={() => setCreatedManager(null)} className="w-full py-4 bg-bg-panel-elevated text-text-primary font-bold uppercase tracking-widest text-xs hover:bg-border-hairline transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

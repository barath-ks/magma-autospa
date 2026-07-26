"use client";
import { useState, useEffect } from "react";
import { Plus, KeyRound } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useParams } from "next/navigation";

export default function BranchDetailPage() {
  const params = useParams();
  const branchId = params.id as string;
  
  const [branch, setBranch] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdUser, setCreatedUser] = useState<any>(null);

  const fetchBranchData = async () => {
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`);
      const data = await res.json();
      if (data.branch) {
        setBranch(data.branch);
        setUsers(data.users || []);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBranchData();
  }, [branchId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, role, branch_id: branchId })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedUser(data);
        setShowAddForm(false);
        setName(""); setPhone(""); setEmail(""); setRole("staff");
        fetchBranchData();
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch (err) {
      setError("An error occurred");
    }
    setSubmitting(false);
  };

  if (loading) {
    return <main className="flex-1 p-8 lg:p-12"><p className="text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading...</p></main>;
  }

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col h-full">
      <div className="w-full max-w-5xl mx-auto mb-8 flex justify-between items-end">
        <div>
          <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Branches", href: "/admin/branches" }, { label: branch?.name || "Branch" }]} accentClass="hover:text-accent-oxblood" />
          <h1 className="text-3xl font-semibold text-text-primary mt-2">{branch?.name}</h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">{branch?.location}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-accent-oxblood text-white font-bold uppercase tracking-widest text-xs px-6 py-3 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      <div className="w-full max-w-5xl mx-auto">
        {showAddForm && (
          <div className="panel p-8 mb-8 border-l-[3px] border-l-accent-oxblood animate-in slide-in-from-top-4">
            <h2 className="text-lg font-semibold text-text-primary mb-6">Create New Account in {branch?.name}</h2>
            {error && <div className="text-[#ff6b6b] bg-[#3a1616] p-3 text-xs font-bold uppercase tracking-widest mb-4">{error}</div>}
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Role *</label>
                  <select value={role} onChange={e=>setRole(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none cursor-pointer">
                    <option value="staff">Staff Member</option>
                    <option value="manager">Branch Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Full Name *</label>
                  <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Phone Number (Recommended)</label>
                  <input type="text" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Email Address (Optional)</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline mt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:opacity-90 disabled:opacity-50 transition-colors">
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="panel overflow-hidden border-l-[3px] border-l-accent-oxblood">
          <table className="w-full text-left">
            <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Login ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Added On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-bg-panel-elevated transition-colors">
                  <td className="p-4 font-mono text-text-primary text-sm">{u.login_id}</td>
                  <td className="p-4 text-text-primary text-sm">{u.name}</td>
                  <td className="p-4">
                    <span className={`text-[10px] uppercase tracking-[0.15em] font-bold ${u.role === 'manager' ? 'text-accent-gold' : 'text-accent-copper'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-text-secondary uppercase tracking-widest text-sm">No accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createdUser && (
        <div className="fixed inset-0 bg-bg-base/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-[#4ade80] p-8 w-full max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-[#163a24] flex items-center justify-center mx-auto mb-6">
              <KeyRound size={24} className="text-[#4ade80]" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-text-primary">Account Created</h3>
            <p className="text-xs text-text-secondary mb-8 uppercase tracking-widest leading-relaxed">
              Please share these credentials securely. The user will be required to change this password on their first login.
            </p>
            
            <div className="bg-bg-base border border-border-hairline p-6 mb-8 text-left space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Login ID</div>
                <div className="text-xl font-mono text-text-primary tracking-widest">{createdUser.login_id}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Temporary Password</div>
                <div className="text-xl font-mono text-accent-oxblood tracking-widest">{createdUser.temp_password}</div>
              </div>
            </div>

            <button onClick={() => setCreatedUser(null)} className="w-full py-4 bg-bg-panel-elevated text-text-primary font-bold uppercase tracking-widest text-xs hover:bg-border-hairline transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

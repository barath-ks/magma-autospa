"use client";
import { useState, useEffect } from "react";
import { Plus, KeyRound, AlertCircle, ShieldAlert, Eye, EyeOff, Copy, Check, RefreshCw, Building2, Lock, ShieldCheck } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { useSession } from "next-auth/react";

export default function BranchDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const branchId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<"details" | "financials">("details");
  const [range, setRange] = useState("month");
  
  const [branch, setBranch] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);

  // Branch Credentials & Password Reset state
  const [showBranchPassword, setShowBranchPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resetMustChange, setResetMustChange] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateRandomTempPassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setResetPasswordVal(`Magma@${randomDigits}`);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordVal.trim()) return;
    setResetLoading(true);
    setResetError("");

    try {
      const res = await fetch(`/api/admin/branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: resetPasswordVal.trim(),
          must_change_password: resetMustChange,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || "Failed to reset branch password");
      } else {
        setShowResetModal(false);
        setResetPasswordVal("");
        fetchBranchData();
      }
    } catch (err) {
      setResetError("Network error");
    } finally {
      setResetLoading(false);
    }
  };

  const fetchBranchData = async () => {
    try {
      const res = await fetch(`/api/admin/branches/${branchId}`);
      if (res.status === 403 || res.status === 401) {
        setApiError("Forbidden");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.branch) {
        setBranch(data.branch);
        setUsers(data.users || []);
      }
      
      const finRes = await fetch(`/api/admin/branch-financials?branch_id=${branchId}&range=${range}`);
      if (finRes.ok) {
        const finData = await finRes.json();
        if (finData.financials && finData.financials.length > 0) {
          setFinancials(finData.financials[0]);
        }
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "loading") {
      fetchBranchData();
    }
  }, [branchId, range, status]);

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

  const handleRequestDelete = async () => {
    try {
      const res = await fetch(`/api/admin/branches/${branchId}/request-delete`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setShowOtpModal(true);
        setOtpError("");
        setOtpCode("");
      } else {
        alert(data.error || "Failed to request deletion");
      }
    } catch (e) {
      alert("An error occurred");
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await fetch(`/api/admin/branches/${branchId}/confirm-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/admin/branches";
      } else {
        setOtpError(data.error || "Failed to delete branch");
      }
    } catch (e) {
      setOtpError("An error occurred");
    }
    setOtpLoading(false);
  };

  // Client-side hard block for non-Admins
  if (status === "loading" || loading) {
    return <main className="flex-1 p-8 lg:p-12"><p className="text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading...</p></main>;
  }

  if (apiError === "Forbidden" || (session?.user as any)?.role !== "admin") {
    return (
      <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col items-center justify-center h-full">
        <div className="panel p-12 text-center border-l-[3px] border-l-accent-oxblood max-w-md w-full">
          <ShieldAlert size={48} className="text-accent-oxblood mx-auto mb-6 opacity-80" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
          <p className="text-text-secondary text-sm uppercase tracking-widest leading-relaxed">
            You do not have administrative privileges to view or manage branch settings.
          </p>
        </div>
      </main>
    );
  }

  const isLoss = financials && financials.profit < 0;

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col h-full">
      <div className="w-full max-w-5xl mx-auto mb-8 flex justify-between items-end">
        <div>
          <Breadcrumbs items={[{ label: "System", href: "/admin" }, { label: "Branches", href: "/admin/branches" }, { label: branch?.name || "Branch" }]} accentClass="hover:text-accent-oxblood" />
          <h1 className="text-3xl font-semibold text-text-primary mt-2">
            {branch?.name}
            {branch?.is_active === 0 && (
              <span className="ml-3 text-xs bg-bg-panel border border-border-hairline px-2 py-1 uppercase tracking-widest text-text-secondary align-middle">
                Deleted
              </span>
            )}
          </h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">{branch?.location}</p>
        </div>
        
        {activeTab === "details" && branch?.is_active !== 0 && (
          <div className="flex gap-4 items-center">
            <button 
              onClick={handleRequestDelete}
              className="bg-bg-panel border border-border-hairline text-accent-oxblood font-bold uppercase tracking-widest text-xs px-6 py-3 hover:bg-accent-oxblood hover:text-white transition-colors"
            >
              Delete Branch
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-accent-oxblood text-white font-bold uppercase tracking-widest text-xs px-6 py-3 flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus size={16} /> Add Account
            </button>
          </div>
        )}
        
        {activeTab === "financials" && (
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
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto mb-8">
        <div className="flex gap-8 border-b border-border-hairline">
          <button 
            onClick={() => setActiveTab("details")}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'details' ? 'text-accent-oxblood border-b-2 border-accent-oxblood' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Staff & Accounts
          </button>
          <button 
            onClick={() => setActiveTab("financials")}
            className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'financials' ? 'text-accent-oxblood border-b-2 border-accent-oxblood' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Financials
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto">
        {activeTab === "details" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Branch Floor Terminal Credentials Card */}
            <div className="panel p-6 sm:p-8 mb-8 border-l-[3px] border-l-[#B87333]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-hairline">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound size={18} className="text-[#B87333]" />
                    <h2 className="text-lg font-semibold text-text-primary">Branch Floor Credentials</h2>
                    {branch?.must_change_password ? (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded-sm">
                        First Login Pending
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-sm">
                        Secured & Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Active login credentials for floor operators to access the dedicated Branch Terminal (<code className="text-[#B87333]">/branch/login</code>).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordVal("");
                    setResetError("");
                    setShowResetModal(true);
                  }}
                  className="self-start sm:self-auto px-4 py-2 bg-bg-panel-elevated border border-border-hairline hover:border-[#B87333] text-text-primary text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors"
                >
                  <RefreshCw size={13} className="text-[#B87333]" />
                  <span>Reset Floor Password</span>
                </button>
              </div>

              {/* Grid with Email, Branch Code, Active Password */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Email */}
                <div className="bg-bg-base border border-border-hairline p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-1">Floor Login Email</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-text-primary truncate" title={branch?.email || branch?.code}>
                      {branch?.email || `${branch?.code?.toLowerCase()}@magma-autospa.com`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(branch?.email || `${branch?.code?.toLowerCase()}@magma-autospa.com`, 'branch-email')}
                      className="text-text-secondary hover:text-text-primary p-1 transition-colors"
                      title="Copy email"
                    >
                      {copiedField === 'branch-email' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Branch Code */}
                <div className="bg-bg-base border border-border-hairline p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-1">Branch Code / Slug</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-[#B87333] font-bold">
                      {branch?.branch_code || branch?.code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(branch?.branch_code || branch?.code, 'branch-code')}
                      className="text-text-secondary hover:text-text-primary p-1 transition-colors"
                      title="Copy code"
                    >
                      {copiedField === 'branch-code' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Active Password */}
                <div className="bg-bg-base border border-border-hairline p-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-text-secondary mb-1">Active Password</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-amber-400 tracking-wider">
                      {showBranchPassword ? (branch?.display_password || "••••••••") : "••••••••"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowBranchPassword(!showBranchPassword)}
                        className="text-text-secondary hover:text-text-primary p-1 transition-colors"
                        title={showBranchPassword ? "Hide password" : "Show password"}
                      >
                        {showBranchPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {branch?.display_password && (
                        <button
                          onClick={() => copyToClipboard(branch.display_password, 'branch-pwd')}
                          className="text-text-secondary hover:text-text-primary p-1 transition-colors"
                          title="Copy password"
                        >
                          {copiedField === 'branch-pwd' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showAddForm && (
              <div className="panel p-8 mb-8 border-l-[3px] border-l-accent-oxblood">
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
                      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">Email Address *</label>
                      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="e.g. staff@magma-autospa.com" className="w-full bg-bg-base border border-border-hairline p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none" />
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

            <div className="panel overflow-hidden border-l-[3px] border-l-transparent">
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
        )}

        {activeTab === "financials" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {!financials ? (
               <div className="panel p-12 flex flex-col items-center justify-center text-center">
                 <AlertCircle size={48} className="text-text-secondary mb-4 opacity-50" strokeWidth={1} />
                 <p className="text-sm text-text-secondary uppercase tracking-widest">No financial data available for this range.</p>
               </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8`}>
                <div className="panel p-6 border-l-[3px] border-l-transparent">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Revenue</div>
                  <div className="text-3xl font-mono text-text-primary">{formatCurrency(financials.revenue)}</div>
                </div>
                <div className="panel p-6 border-l-[3px] border-l-transparent">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Expenses</div>
                  <div className="text-3xl font-mono text-text-secondary">{formatCurrency(financials.expense)}</div>
                </div>
                <div className={`panel p-6 border-l-[3px] ${isLoss ? 'border-l-accent-oxblood bg-bg-panel-elevated' : 'border-l-[#4ade80]'}`}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Profit Margin</div>
                  <div className={`text-3xl font-mono font-bold ${isLoss ? 'text-accent-oxblood' : 'text-[#4ade80]'}`}>
                    {formatCurrency(financials.profit)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
                <div className="flex items-center justify-between">
                  <div className="text-xl font-mono text-accent-oxblood tracking-widest">
                    {showTempPassword ? createdUser.temp_password : "••••••••"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTempPassword(!showTempPassword)}
                    className="text-text-secondary hover:text-text-primary transition-colors focus:outline-none p-1"
                    aria-label={showTempPassword ? "Hide password" : "Show password"}
                  >
                    {showTempPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setCreatedUser(null)} className="w-full py-4 bg-bg-panel-elevated text-text-primary font-bold uppercase tracking-widest text-xs hover:bg-border-hairline transition-colors">
              Done
            </button>
          </div>
        </div>
      )}

      {showOtpModal && (
        <div className="fixed inset-0 bg-bg-base/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel p-8 w-full max-w-md border-l-[3px] border-l-accent-oxblood">
            <h2 className="text-xl font-semibold mb-2 text-text-primary">Verify Branch Deletion</h2>
            <p className="text-xs text-text-secondary mb-6 uppercase tracking-widest leading-relaxed">
              Enter the 6-digit OTP sent to your registered phone number.
            </p>
            {otpError && <div className="text-[#ff6b6b] bg-[#3a1616] p-3 text-xs font-bold uppercase tracking-widest mb-4">{otpError}</div>}
            <form onSubmit={handleConfirmDelete} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">OTP Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  required 
                  value={otpCode} 
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bg-base border border-border-hairline p-4 text-center text-2xl tracking-[0.5em] text-text-primary font-mono focus:border-accent-oxblood focus:outline-none" 
                  placeholder="000000"
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowOtpModal(false)} className="flex-1 py-3 bg-bg-panel text-text-secondary text-xs uppercase tracking-widest font-bold hover:text-text-primary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={otpLoading || otpCode.length < 6} className="flex-1 py-3 bg-accent-oxblood text-white text-xs uppercase tracking-widest font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {otpLoading ? "Verifying..." : "Confirm Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-bg-base/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel p-6 sm:p-8 w-full max-w-md border-l-[3px] border-l-[#B87333]">
            <h2 className="text-xl font-semibold mb-1 text-text-primary">Reset Floor Terminal Password</h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Set a new temporary password for <strong className="text-white">{branch?.name}</strong>. The branch operator will be prompted to change it on their next login.
            </p>

            {resetError && (
              <div className="text-[#ff6b6b] bg-[#3a1616] p-3 text-xs font-mono mb-4">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary">
                    New Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomTempPassword}
                    className="text-[10px] font-mono text-[#B87333] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full bg-bg-base border border-border-hairline p-3 font-mono text-sm text-amber-400 focus:border-[#B87333] focus:outline-none"
                  placeholder="e.g. Magma@7821"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reset_must_change"
                  checked={resetMustChange}
                  onChange={(e) => setResetMustChange(e.target.checked)}
                />
                <label htmlFor="reset_must_change" className="text-xs text-text-secondary">
                  Require password change on next floor login
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-hairline mt-4">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 bg-bg-panel text-text-secondary text-xs uppercase tracking-widest font-bold hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !resetPasswordVal.trim()}
                  className="flex-1 py-2.5 bg-[#B87333] text-white text-xs uppercase tracking-widest font-bold hover:bg-[#a66426] disabled:opacity-50 transition-colors"
                >
                  {resetLoading ? "Updating..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

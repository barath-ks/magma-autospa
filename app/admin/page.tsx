"use client";
import { useState, useEffect } from "react";
import { Check, X, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState<any>(null);

  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectRequestNote, setRejectRequestNote] = useState("");

  const fetchUsers = () => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(data => {
        if (data.users) setUsers(data.users);
        setLoading(false);
      });
  };

  const fetchProfileRequests = async () => {
    try {
      const res = await fetch("/api/admin/profile-requests");
      const data = await res.json();
      if (data.requests) setProfileRequests(data.requests);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProfileRequests();
  }, []);

  const handleRequestApprove = async (id: string) => {
    setRequestActionLoading(true);
    try {
      const res = await fetch("/api/admin/profile-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.auto_rejected) alert(data.message);
        fetchProfileRequests();
        fetchUsers(); // Refresh the users table
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setRequestActionLoading(false);
  };

  const handleRequestReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectRequestId || !rejectRequestNote) return;
    setRequestActionLoading(true);
    try {
      const res = await fetch("/api/admin/profile-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectRequestId, status: "rejected", reviewer_note: rejectRequestNote })
      });
      if (res.ok) {
        setRejectRequestId(null);
        setRejectRequestNote("");
        fetchProfileRequests();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setRequestActionLoading(false);
  };


  return (
    <>
      <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">Credentials Management</h1>
            <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Manage access for Staff and Managers across all branches.</p>
          </div>
        </div>

        {/* Profile Requests Queue */}
        {profileRequests.length > 0 && (
          <div className="mb-10 panel p-6 border-l-[3px] border-l-accent-oxblood">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-accent-oxblood" /> Pending Manager Profile Changes
            </h2>
            <div className="space-y-3">
              {profileRequests.map(req => (
                <div key={req.id} className="bg-bg-base border border-border-hairline p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex-1 flex gap-8">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Field</div>
                      <div className="font-mono text-sm text-text-primary">{req.field_type === 'login_id' ? 'LOGIN ID' : 'NAME'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Current</div>
                      <div className="font-mono text-sm text-text-primary">{req.current_value}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Requested</div>
                      <div className="font-mono text-sm text-accent-oxblood">{req.requested_value}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRejectRequestId(req.id)} disabled={requestActionLoading} className="px-3 py-1.5 border border-border-hairline text-[10px] uppercase tracking-widest font-bold hover:bg-accent-oxblood hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1">
                      <X size={12}/> Reject
                    </button>
                    <button onClick={() => handleRequestApprove(req.id)} disabled={requestActionLoading} className="px-3 py-1.5 bg-accent-oxblood text-white text-[10px] uppercase tracking-widest font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-1">
                      <Check size={12}/> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {loading ? <p className="font-medium text-text-secondary text-sm uppercase tracking-widest">Loading system data...</p> : (
          <div className="panel overflow-hidden border-l-[3px] border-l-accent-oxblood">
            <table className="w-full text-left">
              <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
                <tr>
                  <th className="p-4">Login ID</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline bg-bg-panel">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-bg-panel-elevated transition-colors">
                    <td className="p-4 font-mono text-text-primary text-sm">{u.login_id}</td>
                    <td className="p-4">
                      <span className={`text-[10px] uppercase tracking-[0.15em] font-bold ${u.role === 'manager' ? 'text-accent-gold' : 'text-accent-copper'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary text-sm">{u.branch_id || "All Branches"}</td>
                    <td className="p-4">
                      {u.must_change_password ? 
                        <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-oxblood flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-accent-oxblood"></span> Pending Reset</span> : 
                        <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-text-secondary flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-text-secondary"></span> Active</span>
                      }
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setResetModal(u)}
                        className="text-text-secondary hover:text-text-primary uppercase text-[10px] tracking-[0.1em] font-bold border border-border-hairline px-3 py-1.5 hover:border-text-secondary transition-colors"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-text-secondary uppercase tracking-widest text-sm">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {resetModal && (
          <ResetPasswordModal 
            user={resetModal} 
            onClose={() => setResetModal(null)}
            onSuccess={() => {
              setResetModal(null);
              fetchUsers();
            }}
          />
        )}

        {rejectRequestId && (
          <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-2 text-text-primary">Reject Profile Request</h3>
              <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">Please provide a reason.</p>
              <form onSubmit={handleRequestReject}>
                <div className="mb-6">
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Admin Note *</label>
                  <input required autoFocus type="text" value={rejectRequestNote} onChange={e=>setRejectRequestNote(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                  <button type="button" onClick={() => setRejectRequestId(null)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                  <button type="submit" disabled={requestActionLoading || !rejectRequestNote} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                    {requestActionLoading ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </>
  );
}

function ResetPasswordModal({ user, onClose, onSuccess }: any) {
  const [loginId, setLoginId] = useState(user.login_id);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requireChange, setRequireChange] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        newLoginId: loginId,
        newPassword,
        requirePasswordChange: requireChange
      })
    });
    if (res.ok) {
      onSuccess();
    } else {
      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { error: "Server returned an invalid response." };
      }
      setError(data.error || "System Error");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">Update Credentials</h3>
        <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">Target: <span className="text-text-primary">{user.role}</span></p>
        
        {error && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-xs uppercase tracking-widest font-bold mb-6 p-3">{error}</div>}

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Login ID</label>
            <input type="text" value={loginId} onChange={e=>setLoginId(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-text-secondary focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">New Temporary Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 pr-10 text-text-primary font-mono text-sm focus:border-text-secondary focus:outline-none transition-colors" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex items-center pt-3">
            <input type="checkbox" id="reqChange" checked={requireChange} onChange={e=>setRequireChange(e.target.checked)} className="h-4 w-4 bg-bg-base border-border-hairline-strong accent-accent-oxblood focus:ring-0 cursor-pointer" />
            <label htmlFor="reqChange" className="ml-2 text-xs font-medium text-text-secondary cursor-pointer">Require password change on next login</label>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !newPassword || !loginId} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
            {saving ? "Executing..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

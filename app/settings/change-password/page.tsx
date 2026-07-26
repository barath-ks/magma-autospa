"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Lock, User as UserIcon, Clock, XCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const currentLoginId = (session?.user as any)?.login_id;

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Username State
  const [newUsername, setNewUsername] = useState("");
  const [usernameRequests, setUsernameRequests] = useState<any[]>([]);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameMsg, setUsernameMsg] = useState("");

  useEffect(() => {
    if (role && role !== 'admin') {
      fetchUsernameRequests();
    }
  }, [role]);

  const fetchUsernameRequests = async () => {
    try {
      const res = await fetch("/api/settings/username");
      const data = await res.json();
      if (data.requests) setUsernameRequests(data.requests);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdMsg("");

    if (newPassword !== confirmPassword) {
      return setPwdError("New passwords do not match.");
    }
    
    setPwdLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await res.json();
    if (res.ok) {
      setPwdMsg("Password updated. Signing out...");
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 2000);
    } else {
      setPwdError(data.error || "Failed to update password");
      setPwdLoading(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");
    setUsernameMsg("");
    setUsernameLoading(true);
    
    const res = await fetch("/api/settings/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requested_login_id: newUsername })
    });
    
    const data = await res.json();
    if (res.ok) {
      if (data.directUpdate) {
        setUsernameMsg("Username updated successfully. Signing out to apply changes...");
        setTimeout(() => {
          signOut({ callbackUrl: "/login" });
        }, 2000);
      } else {
        setUsernameMsg("Request submitted successfully.");
        setNewUsername("");
        fetchUsernameRequests();
      }
    } else {
      setUsernameError(data.error || "Failed to submit request");
    }
    setUsernameLoading(false);
  };

  const accentClass = role === 'admin' ? 'accent-oxblood' : role === 'manager' ? 'accent-gold' : 'accent-copper';

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-text-primary">Account Settings</h1>
        <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Manage your credentials and access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Password Section */}
        <div className={`panel p-8 border-l-[3px] border-l-${accentClass}`}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-6 flex items-center gap-2">
            <Lock size={16} className={`text-${accentClass}`} /> Change Password
          </h2>
          
          {pwdError && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold mb-6 p-3">{pwdError}</div>}
          {pwdMsg && <div className="text-[#4ade80] bg-[#163a24] border border-[#1d5230] text-[10px] uppercase tracking-widest font-bold mb-6 p-3">{pwdMsg}</div>}
          
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Current Password</label>
              <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">New Password</label>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required />
            </div>
            <button type="submit" disabled={pwdLoading || !!pwdMsg} className={`w-full font-bold text-xs uppercase tracking-widest bg-${accentClass} text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors py-3 mt-4`}>
              {pwdLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Username Section */}
        <div className={`panel p-8 border-l-[3px] border-l-${accentClass}`}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2 flex items-center gap-2">
            <UserIcon size={16} className={`text-${accentClass}`} /> {role === 'admin' ? 'Change Username' : 'Request Username Change'}
          </h2>
          <p className="text-xs text-text-secondary mb-6 leading-relaxed">
            {role === 'admin' 
              ? "As an Admin, you can change your login ID directly. It must be unique."
              : `Your current Login ID is ${currentLoginId}. Enter a new ID to submit a request for approval.`}
          </p>
          
          {usernameError && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold mb-6 p-3">{usernameError}</div>}
          {usernameMsg && <div className="text-[#4ade80] bg-[#163a24] border border-[#1d5230] text-[10px] uppercase tracking-widest font-bold mb-6 p-3">{usernameMsg}</div>}
          
          <form onSubmit={handleUsernameSubmit} className="space-y-5 mb-8">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Desired Login ID</label>
              <input type="text" value={newUsername} onChange={e=>setNewUsername(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required minLength={3} />
            </div>
            <button type="submit" disabled={usernameLoading || !!usernameMsg} className={`w-full font-bold text-xs uppercase tracking-widest bg-bg-panel-elevated text-text-primary hover:text-white hover:bg-${accentClass} border border-border-hairline disabled:opacity-50 transition-colors py-3`}>
              {usernameLoading ? "Submitting..." : (role === 'admin' ? "Update ID" : "Submit Request")}
            </button>
          </form>

          {role !== 'admin' && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-4 flex items-center gap-2">
                <Clock size={12} /> Recent Requests
              </h3>
              {usernameRequests.length === 0 ? (
                <div className="text-xs font-mono text-text-secondary text-center p-4 border border-border-hairline border-dashed">No past requests</div>
              ) : (
                <div className="space-y-3">
                  {usernameRequests.map(req => (
                    <div key={req.id} className="p-3 border border-border-hairline-strong bg-bg-base flex justify-between items-center">
                      <div>
                        <div className="font-mono text-sm text-text-primary">{req.requested_login_id}</div>
                        <div className="text-[10px] text-text-secondary mt-1">{new Date(req.requested_at).toLocaleDateString()}</div>
                        {req.reviewer_note && <div className="text-[10px] text-text-secondary italic mt-1">"{req.reviewer_note}"</div>}
                      </div>
                      <div>
                        {req.status === 'pending' ? (
                          <span className="px-2 py-1 bg-accent-gold/10 text-accent-gold text-[9px] uppercase tracking-widest font-bold rounded flex items-center gap-1"><AlertCircle size={10}/> Pending</span>
                        ) : req.status === 'rejected' ? (
                          <span className="px-2 py-1 bg-accent-oxblood/10 text-accent-oxblood text-[9px] uppercase tracking-widest font-bold rounded flex items-center gap-1"><XCircle size={10}/> Rejected</span>
                        ) : (
                          <span className="px-2 py-1 bg-[#163a24] text-[#4ade80] text-[9px] uppercase tracking-widest font-bold rounded flex items-center gap-1">Approved</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

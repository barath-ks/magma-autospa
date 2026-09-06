"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Lock, User as UserIcon, Clock, XCircle, AlertCircle, Phone, Mail, Save, Eye, EyeOff } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

export default function ProfilePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'staff';
  const accentClass = role === 'admin' ? 'accent-oxblood' : role === 'manager' ? 'accent-gold' : 'accent-copper';

  // Profile Overview State
  const [profile, setProfile] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileContactError, setProfileContactError] = useState("");

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Profile Requests State
  const [requestField, setRequestField] = useState("login_id");
  const [requestValue, setRequestValue] = useState("");
  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestMsg, setRequestMsg] = useState("");

  useEffect(() => {
    fetchProfile();
    if (role !== 'admin') {
      fetchProfileRequests();
    }
  }, [role]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setPhone(data.phone || "");
        setEmail(data.email || "");
      }
    } catch (e) {
      console.error(e);
    }
    setProfileLoading(false);
  };

  const fetchProfileRequests = async () => {
    try {
      const res = await fetch("/api/settings/profile-requests");
      const data = await res.json();
      if (data.requests) setProfileRequests(data.requests);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg("");
    setProfileContactError("");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((prev: any) => prev ? { ...prev, phone, email } : prev);
        setProfileMsg("Contact info saved.");
        setTimeout(() => setProfileMsg(""), 3000);
      } else {
        setProfileContactError(data.error || "Failed to update contact info");
      }
    } catch (e) {
      console.error(e);
      setProfileContactError("Failed to connect to the server");
    }
    setProfileSaving(false);
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
        signOut({ callbackUrl: "/" });
      }, 2000);
    } else {
      setPwdError(data.error || "Failed to update password");
      setPwdLoading(false);
    }
  };

  const handleProfileRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError("");
    setRequestMsg("");
    setRequestLoading(true);
    
    const res = await fetch("/api/settings/profile-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_type: requestField, requested_value: requestValue })
    });
    
    const data = await res.json();
    if (res.ok) {
      if (data.directUpdate) {
        setRequestMsg(`${requestField === 'login_id' ? 'Login ID' : 'Name'} updated successfully. Signing out to apply changes...`);
        setTimeout(() => {
          signOut({ callbackUrl: "/" });
        }, 2000);
      } else {
        setRequestMsg("Request submitted successfully.");
        setRequestValue("");
        fetchProfileRequests();
      }
    } else {
      setRequestError(data.error || "Failed to submit request");
    }
    setRequestLoading(false);
  };

  if (profileLoading) {
    return <main className="flex-1 p-8 lg:p-12"><p className="text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading profile...</p></main>;
  }

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col items-center">
      <div className="w-full max-w-5xl self-start mb-10">
        <Breadcrumbs items={[{ label: role === 'admin' ? 'System' : 'Overview', href: `/${role}` }, { label: "My Profile" }]} accentClass={`hover:text-${accentClass}`} />
        <h1 className="text-3xl font-semibold text-text-primary mt-2">My Profile</h1>
        <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Manage your personal info and credentials.</p>
      </div>

      <div className="w-full max-w-5xl space-y-8">
        
        {/* Profile Overview Section */}
        <div className={`panel p-8 border-t-[3px] border-t-${accentClass}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Read-Only Identity */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-6 flex items-center gap-2">
                Identity
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Full Name</div>
                  <div className="text-lg text-text-primary font-medium">{profile?.name}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Login ID</div>
                  <div className="font-mono text-text-primary text-sm tracking-widest">{profile?.login_id}</div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Role</div>
                    <span className={`text-[10px] uppercase tracking-[0.15em] font-bold text-${accentClass}`}>
                      {profile?.role}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Branch</div>
                    <div className="text-sm text-text-primary">{profile?.branch_name}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-hairline space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Registered Phone</div>
                    <div className="font-mono text-sm text-text-primary">
                      {profile?.phone ? (
                        profile.phone
                      ) : (
                        <span className="italic text-text-secondary/60 text-xs">No phone added</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary mb-1">Registered Email</div>
                    <div className="font-mono text-sm text-text-primary">
                      {profile?.email ? (
                        profile.email
                      ) : (
                        <span className="italic text-text-secondary/60 text-xs">No email added</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Contact Info */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary flex items-center gap-2">
                  Contact Information
                </h2>
                <div className="flex items-center gap-2">
                  {profile?.phone ? (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#4ade80] bg-[#163a24] border border-[#1d5230] px-2 py-0.5 rounded">
                      Verified Phone
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-text-secondary bg-bg-base border border-border-hairline px-2 py-0.5 rounded">
                      No Phone Set
                    </span>
                  )}
                </div>
              </div>

              {profileMsg && (
                <div className="text-[#4ade80] bg-[#163a24] border border-[#1d5230] text-[10px] uppercase tracking-widest font-bold mb-4 p-3 animate-in fade-in">
                  {profileMsg}
                </div>
              )}

              {profileContactError && (
                <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold mb-4 p-3 animate-in fade-in">
                  {profileContactError}
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary">
                      <Phone size={12} className={`text-${accentClass}`} /> Phone Number
                    </label>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {profile?.phone ? profile.phone : <span className="italic text-text-secondary/60">No phone number added</span>}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors placeholder:italic placeholder:text-text-secondary/40`}
                    placeholder={profile?.phone || "No phone number added"}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary">
                      <Mail size={12} className={`text-${accentClass}`} /> Email Address <span className="text-[#ff6b6b]">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {profile?.email ? profile.email : <span className="italic text-text-secondary/60">No email added</span>}
                    </span>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors placeholder:italic placeholder:text-text-secondary/40`}
                    placeholder={profile?.email || "e.g. user@magma-autospa.com"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className={`flex items-center gap-2 justify-center w-full font-bold text-xs uppercase tracking-widest bg-bg-panel-elevated border border-border-hairline text-text-primary hover:text-white hover:bg-${accentClass} transition-colors py-3`}
                >
                  {profileSaving ? "Saving..." : <><Save size={14} /> Save Contact Info</>}
                </button>
              </form>
            </div>

          </div>
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
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary">Current Password</label>
                  <Link 
                    href={`/auth/forgot-password?role=${role}`} 
                    className={`text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-${accentClass} transition-colors`}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 pr-10 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">New Password</label>
                <div className="relative">
                  <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 pr-10 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Confirm New Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 pr-10 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={pwdLoading || !!pwdMsg} className={`w-full font-bold text-xs uppercase tracking-widest bg-${accentClass} text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors py-3 mt-4`}>
                {pwdLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Profile Requests Section */}
          <div className={`panel p-8 border-l-[3px] border-l-${accentClass}`}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2 flex items-center gap-2">
              <UserIcon size={16} className={`text-${accentClass}`} /> {role === 'admin' ? 'Change Profile Details' : 'Profile Change Requests'}
            </h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              {role === 'admin' 
                ? "As an Admin, you can change your details directly. Login IDs must be unique."
                : `Enter a new value to submit a request for approval.`}
            </p>
            
            {requestError && <div className="text-[#ff6b6b] bg-[#3a1616] border border-[#521d1d] text-[10px] uppercase tracking-widest font-bold mb-6 p-3">{requestError}</div>}
            {requestMsg && <div className="text-[#4ade80] bg-[#163a24] border border-[#1d5230] text-[10px] uppercase tracking-widest font-bold mb-6 p-3">{requestMsg}</div>}
            
            <form onSubmit={handleProfileRequestSubmit} className="space-y-5 mb-8">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Field to Change</label>
                <select value={requestField} onChange={e=>setRequestField(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`}>
                  <option value="login_id">Login ID</option>
                  <option value="name">Full Name</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Requested Value</label>
                <input type="text" value={requestValue} onChange={e=>setRequestValue(e.target.value)} className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`} required minLength={3} />
              </div>
              <button type="submit" disabled={requestLoading || !!requestMsg} className={`w-full font-bold text-xs uppercase tracking-widest bg-bg-panel-elevated text-text-primary hover:text-white hover:bg-${accentClass} border border-border-hairline disabled:opacity-50 transition-colors py-3`}>
                {requestLoading ? "Submitting..." : (role === 'admin' ? "Update Details" : "Submit Request")}
              </button>
            </form>

            {role !== 'admin' && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-4 flex items-center gap-2">
                  <Clock size={12} /> Recent Requests
                </h3>
                {profileRequests.length === 0 ? (
                  <div className="text-xs font-mono text-text-secondary text-center p-4 border border-border-hairline border-dashed">No past requests</div>
                ) : (
                  <div className="space-y-3">
                    {profileRequests.map(req => (
                      <div key={req.id} className="p-3 border border-border-hairline-strong bg-bg-base flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 bg-bg-panel text-text-secondary text-[8px] uppercase font-bold tracking-wider">{req.field_type === 'login_id' ? 'LOGIN ID' : 'NAME'}</span>
                            <span className="font-mono text-sm text-text-primary">{req.requested_value}</span>
                          </div>
                          <div className="text-[10px] text-text-secondary">{new Date(req.requested_at).toLocaleDateString()}</div>
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

      </div>
    </main>
  );
}

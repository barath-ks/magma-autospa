"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { ShieldAlert } from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

export default function ForceChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    
    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await res.json();
    if (res.ok) {
      await signOut({ callbackUrl: "/login" });
    } else {
      setError(data.error || "Failed to update password");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-bg-base items-center justify-center p-6">
      <div className="w-full max-w-md bg-bg-panel p-8 lg:p-10 border-l-[3px] border-l-accent-copper border-y border-r border-border-hairline shadow-2xl">
        
        <div className="mb-8 border-b border-border-hairline pb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={20} className="text-accent-copper" />
            <span className="text-accent-copper font-mono text-[11px] uppercase tracking-[0.15em] font-bold">
              Action Required
            </span>
          </div>
          <h2 className="text-2xl font-serif text-text-primary mb-2">Update Password</h2>
          <p className="text-text-secondary text-sm font-medium">
            Your administrator requires you to set a new password before continuing.
          </p>
        </div>
        
        {error && (
          <div className="mb-6 text-[#ff6b6b] bg-[#3a1616] p-4 text-xs uppercase tracking-widest font-bold border border-[#521d1d]">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
              Current (Temporary) Password
            </label>
            <input 
              type="password" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              className="block w-full border border-border-hairline-strong bg-bg-base p-3 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all" 
              required 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
              New Password
            </label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              className="block w-full border border-border-hairline-strong bg-bg-base p-3 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all" 
              required 
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
              Confirm New Password
            </label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              className="block w-full border border-border-hairline-strong bg-bg-base p-3 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all" 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-accent-copper p-3.5 text-white font-bold text-xs uppercase tracking-widest transition-all duration-200 mt-8 disabled:opacity-50 hover:brightness-110 active:brightness-95"
          >
            {loading ? "UPDATING..." : "UPDATE PASSWORD & LOG IN"}
          </button>
        </form>
      </div>
    </div>
  );
}

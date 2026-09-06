"use client";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ShieldAlert, Eye, EyeOff } from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

export default function ForceChangePassword() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'staff';
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      await signOut({ callbackUrl: "/" });
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
            <div className="relative">
              <input 
                type={showCurrentPassword ? "text" : "password"} 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                className="block w-full border border-border-hairline-strong bg-bg-base p-3 pr-10 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all" 
                required 
              />
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
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
              New Password
            </label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"} 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="block w-full border border-border-hairline-strong bg-bg-base p-3 pr-10 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all" 
                required 
              />
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
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="block w-full border border-border-hairline-strong bg-bg-base p-3 pr-10 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all" 
                required 
              />
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

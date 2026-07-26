"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { GlassDroplets } from "../../components/GlassDroplets";

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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#cbd5e1] via-[#e2e8f0] to-[#94a3b8] overflow-hidden">
      <div className="glass-card z-20 w-full max-w-md p-8 mx-4 relative border-red-400">
        <GlassDroplets count={25} />
        <h1 className="relative z-10 mb-2 text-center text-2xl font-extrabold text-slate-900">Action Required</h1>
        <p className="relative z-10 mb-6 text-center text-sm font-bold text-red-600">Your administrator requires you to set a new password before continuing.</p>
        
        {error && <div className="relative z-10 mb-4 text-red-500 text-center text-sm font-bold bg-red-100/50 p-2 rounded">{error}</div>}
        
        <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">Current (Temporary) Password</label>
            <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white/60 p-2 shadow-inner font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700">New Password</label>
            <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white/60 p-2 shadow-inner font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white/60 p-2 shadow-inner font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" required />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-md bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 p-3 text-white font-extrabold mt-6 shadow-md transition-all">
            {loading ? "Updating..." : "Update Password & Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}

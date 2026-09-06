"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, Eye, EyeOff, Lock, ArrowRight, Building2 } from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";

export default function BranchChangePasswordPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const branchName = session?.user?.name || "Floor Profile";
  const branchCode = (session?.user as any)?.branch_code || (session?.user as any)?.login_id || "BRANCH";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please re-enter.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from your current temporary password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/branch/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update branch password.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Safely attempt session refresh with timeout fallback
      try {
        if (update) {
          await Promise.race([
            update({ must_change_password: false }),
            new Promise((resolve) => setTimeout(resolve, 800)),
          ]);
        }
      } catch (e) {
        console.warn("Session update warning:", e);
      }

      // Hard browser navigation ensures updated session cookies are evaluated across middleware
      setTimeout(() => {
        window.location.href = "/branch/dashboard";
      }, 600);
    } catch (err: any) {
      setError("A network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const isAlreadyConfigured = status === "authenticated" && (session?.user as any)?.must_change_password === false && !success;

  return (
    <div className="flex min-h-screen w-full bg-[#121212] items-center justify-center p-4 sm:p-6 font-inter selection:bg-[#B87333]/30">
      <div className="w-full max-w-lg bg-[#1A1A1A] p-8 sm:p-10 border border-white/10 border-l-[3px] border-l-[#B87333] shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#B87333]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="mb-8 border-b border-white/10 pb-6 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#B87333]/10 border border-[#B87333]/30 text-[#B87333] text-[10px] font-mono uppercase tracking-widest font-bold">
              <KeyRound size={12} /> Security Protocol
            </span>
            <span className="font-mono text-[11px] text-gray-400 uppercase tracking-wider">
              {isAlreadyConfigured ? "Password Configured" : "First-Login Setup"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight">
            {isAlreadyConfigured ? "Update Branch Password" : "Configure Branch Password"}
          </h1>

          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <Building2 size={14} className="text-[#B87333]" />
            <span>Active Branch:</span>
            <span className="text-white font-medium">{branchName}</span>
            <span className="font-mono text-[11px] bg-white/5 border border-white/10 px-1.5 py-0.5 text-gray-300">
              {branchCode}
            </span>
          </div>

          <p className="text-gray-400 text-xs mt-3 leading-relaxed">
            {isAlreadyConfigured
              ? "Your branch profile is active. You may update your operational master password below, or return to the operations terminal."
              : "Your branch profile is currently operating on a temporary administrative password. You must set a permanent secure password to access floor operations."}
          </p>
        </div>

        {/* Already Configured Quick Access */}
        {isAlreadyConfigured && (
          <div className="mb-6 p-4 bg-[#121212] border border-[#B87333]/30 text-xs font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-300">
              <ShieldCheck size={16} className="text-[#B87333] shrink-0" />
              <span>Password already active.</span>
            </div>
            <button
              type="button"
              onClick={() => { window.location.href = "/branch/dashboard"; }}
              className="px-3 py-1.5 bg-[#B87333] hover:bg-[#a66426] text-white font-bold text-[11px] uppercase tracking-wider transition-colors shrink-0"
            >
              Return to Dashboard &rarr;
            </button>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="mb-6 p-4 bg-[#163a24] border border-[#22c55e]/40 text-[#4ade80] text-xs font-mono flex items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="shrink-0 text-[#4ade80]" />
              <div>
                <p className="font-bold uppercase tracking-wider">Password Updated Successfully</p>
                <p className="text-gray-300 text-[11px] mt-0.5">Redirecting to operations terminal...</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { window.location.href = "/branch/dashboard"; }}
              className="px-3.5 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-xs uppercase tracking-wider transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              Enter Dashboard &rarr;
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-[#3a1616] border border-[#ff6b6b]/30 text-[#ff6b6b] text-xs font-mono leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Current Temporary Password */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-1.5">
              Current (Temporary) Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading || success}
                placeholder="Enter provided temporary password"
                className="w-full bg-[#121212] border border-white/10 px-3.5 py-2.5 pr-10 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#B87333] transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none p-1"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-1.5">
              New Permanent Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading || success}
                placeholder="At least 8 characters (letter, number, symbol)"
                className="w-full bg-[#121212] border border-white/10 px-3.5 py-2.5 pr-10 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#B87333] transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none p-1"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Live Strength Indicator */}
            <PasswordStrengthIndicator password={newPassword} />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] font-bold text-gray-400 mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || success}
                placeholder="Re-enter new password"
                className="w-full bg-[#121212] border border-white/10 px-3.5 py-2.5 pr-10 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#B87333] transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none p-1"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-red-400 mt-1.5 font-mono">
                Passwords do not match.
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-white/10">
            <button
              type="submit"
              disabled={loading || success || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="w-full py-3 px-5 bg-[#B87333] hover:bg-[#a66426] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <span>Securing Account...</span>
              ) : success ? (
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} /> Verified & Saved
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock size={15} /> Save Password & Enter Terminal <ArrowRight size={15} />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

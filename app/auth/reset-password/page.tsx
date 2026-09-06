"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import Image from "next/image";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resetId = searchParams.get("reset_id") || "";
  const resetToken = searchParams.get("reset_token") || "";
  const loginId = searchParams.get("login_id") || "";
  const role = searchParams.get("role") || "staff";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const accentClass =
    role === "admin"
      ? "bg-accent-oxblood text-white"
      : role === "manager"
      ? "bg-accent-gold text-bg-base"
      : "bg-accent-copper text-white";

  const accentText =
    role === "admin"
      ? "text-accent-oxblood"
      : role === "manager"
      ? "text-accent-gold"
      : "text-accent-copper";

  if (!resetId || !resetToken) {
    return (
      <div className="space-y-6">
        <div className="p-4 border-l-[3px] border-l-[#ff6b6b] bg-[#3a1616] rounded-r">
          <div className="flex items-center gap-2 text-[#ff6b6b] font-bold text-xs uppercase tracking-wider mb-1">
            <AlertCircle size={14} /> Invalid Reset Session
          </div>
          <p className="text-[#ff6b6b]/90 text-xs">
            No valid verification session found. Please request a new SMS OTP code.
          </p>
        </div>
        <Link
          href={`/auth/forgot-password?role=${role}`}
          className={`block text-center w-full rounded ${accentClass} p-3.5 font-bold uppercase tracking-widest text-xs hover:brightness-110 transition-all`}
        >
          Request Verification Code
        </Link>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_id: resetId,
          reset_token: resetToken,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Connection error. Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="p-5 border-l-[3px] border-l-[#4ade80] bg-[#163a24] rounded-r">
          <div className="flex items-center gap-2 text-[#4ade80] font-bold text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 size={16} /> Password Reset Complete
          </div>
          <p className="text-[#4ade80]/90 text-xs leading-relaxed">
            Your password has been successfully updated. You may now sign in using your new credentials.
          </p>
        </div>

        <Link
          href={`/login?role=${role}`}
          className={`block text-center w-full rounded ${accentClass} p-3.5 font-bold uppercase tracking-widest text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2`}
        >
          <span>Sign In to Your Account</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={16} className={accentText} />
          <span className={`${accentText} font-mono text-[11px] uppercase tracking-[0.15em] font-bold`}>
            Set Credentials
          </span>
        </div>
        <h2 className="text-2xl font-serif font-semibold text-text-primary">Reset Password</h2>
        <p className="text-text-secondary text-xs mt-1">
          {loginId ? (
            <>
              Configuring new password for <span className="font-mono text-text-primary font-bold">{loginId}</span>.
            </>
          ) : (
            "Enter and confirm your new secure password."
          )}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 border-l-[3px] border-l-[#ff6b6b] bg-[#3a1616] text-[#ff6b6b] text-xs font-semibold leading-relaxed rounded-r">
          {error}
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full rounded border border-border-hairline-strong bg-bg-base p-3 pr-10 text-text-primary font-mono text-sm placeholder-text-secondary/40 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all"
              placeholder="••••••••••••"
              required
              autoFocus
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
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded border border-border-hairline-strong bg-bg-base p-3 pr-10 text-text-primary font-mono text-sm placeholder-text-secondary/40 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all"
              placeholder="••••••••••••"
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
          disabled={loading || !newPassword || !confirmPassword}
          className={`w-full rounded ${accentClass} p-3.5 font-bold uppercase tracking-widest text-xs transition-all duration-200 mt-6 disabled:opacity-50 hover:brightness-110 active:brightness-95 flex items-center justify-center gap-2`}
        >
          {loading ? "Updating Password..." : "Save New Password"}
          {!loading && <ArrowRight size={14} />}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full bg-bg-base overflow-hidden">
      {/* LEFT HALF: Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-bg-base relative flex-col justify-center px-16 border-r border-border-hairline z-10">
        <div className="relative z-20">
          <h1 className="font-serif text-5xl xl:text-6xl text-text-primary tracking-tight mb-3">
            Magma Autospa
          </h1>
          <p className="font-sans text-text-secondary text-sm uppercase tracking-[0.2em] font-medium">
            Password Configuration
          </p>
        </div>

        {/* Schematic Illustration */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.15] mix-blend-screen pointer-events-none mt-20">
          <Image
            src="/blueprint-car.jpg"
            alt="Magma Autospa Schematic"
            width={800}
            height={800}
            className="object-contain scale-125 xl:scale-150 transform translate-x-12"
            priority
          />
        </div>
      </div>

      {/* RIGHT HALF: Reset Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center bg-bg-panel p-6 relative">
        <div className="absolute top-12 left-0 w-full flex justify-center lg:hidden">
          <h1 className="font-serif text-3xl text-text-primary">Magma Autospa</h1>
        </div>

        <div className="w-full max-w-sm lg:max-w-md bg-bg-base/50 p-8 lg:p-12 rounded-xl border border-border-hairline shadow-lg">
          <Suspense fallback={<div className="text-text-primary font-bold">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

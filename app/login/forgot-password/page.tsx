"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Smartphone, Mail, Lock } from "lucide-react";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") || "staff";
  
  const [step, setStep] = useState<1|2|3>(1);
  const [role, setRole] = useState(initialRole);
  const [loginId, setLoginId] = useState("");
  
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [resetToken, setResetToken] = useState("");
  const [resetId, setResetId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const accentClass = role === 'admin' ? 'accent-oxblood' : role === 'manager' ? 'accent-gold' : 'accent-copper';

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.role) setRole(data.role);
        setStep(2);
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("An error occurred connecting to the server");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId, phone_otp: phoneOtp, email_otp: emailOtp }),
      });
      const data = await res.json();

      if (res.ok) {
        setResetToken(data.reset_token);
        setResetId(data.reset_id);
        setStep(3);
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (err) {
      setError("An error occurred");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          login_id: loginId, 
          reset_id: resetId, 
          reset_token: resetToken, 
          new_password: newPassword 
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Password successfully updated. You may now log in.");
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("An error occurred");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className={`p-4 border-l-[3px] border-l-[#4ade80] bg-[#163a24]`}>
          <p className="text-[#4ade80] text-xs font-bold uppercase tracking-widest leading-relaxed">
            {success}
          </p>
        </div>
        <Link href={`/login?role=${role}`} className={`block text-center w-full bg-${accentClass} text-white font-bold uppercase tracking-widest text-xs py-4 hover:opacity-90 transition-opacity`}>
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Reset Password</h2>
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest">
          {step === 1 ? "Identify Account" : step === 2 ? "Verify Identity" : "Set New Password"}
        </p>
      </div>

      {error && (
        <div className="p-4 border-l-[3px] border-l-[#ff6b6b] bg-[#3a1616]">
          <p className="text-[#ff6b6b] text-[10px] font-bold uppercase tracking-widest">
            {error}
          </p>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">
              Login ID
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`}
              required
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading} className={`w-full bg-${accentClass} text-white font-bold uppercase tracking-widest text-xs py-4 hover:opacity-90 transition-opacity disabled:opacity-50`}>
            {loading ? "Sending OTP..." : "Continue"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <p className="text-xs text-text-secondary leading-relaxed border border-border-hairline p-4">
            An OTP has been sent to the phone number {role === 'admin' ? "and email address " : ""}associated with <span className="font-mono text-text-primary">{loginId}</span>.
          </p>

          <div>
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">
              <Smartphone size={14} className={`text-${accentClass}`} /> Phone OTP
            </label>
            <input
              type="text"
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value)}
              className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors text-center tracking-[0.5em]`}
              required
              placeholder="------"
              maxLength={6}
              autoFocus
            />
          </div>

          {role === 'admin' && (
            <div>
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">
                <Mail size={14} className={`text-${accentClass}`} /> Email OTP
              </label>
              <input
                type="text"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors text-center tracking-[0.5em]`}
                required
                placeholder="------"
                maxLength={6}
              />
            </div>
          )}

          <button type="submit" disabled={loading} className={`w-full bg-${accentClass} text-white font-bold uppercase tracking-widest text-xs py-4 hover:opacity-90 transition-opacity disabled:opacity-50`}>
            {loading ? "Verifying..." : "Verify Codes"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">
              <Lock size={14} className={`text-${accentClass}`} /> New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-bold text-text-secondary mb-2">
              <Lock size={14} className={`text-${accentClass}`} /> Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-${accentClass} focus:outline-none transition-colors`}
              required
            />
          </div>

          <button type="submit" disabled={loading} className={`w-full bg-${accentClass} text-white font-bold uppercase tracking-widest text-xs py-4 hover:opacity-90 transition-opacity disabled:opacity-50`}>
            {loading ? "Updating..." : "Set New Password"}
          </button>
        </form>
      )}

      <div className="pt-6 border-t border-border-hairline text-center">
        <Link href={`/login?role=${initialRole}`} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={12} /> Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-bg-base flex relative overflow-hidden">
      {/* Background Car Illustration */}
      <div className="absolute right-[-10%] top-[10%] w-[80%] h-auto opacity-5 pointer-events-none z-0">
        <svg viewBox="0 0 1200 600" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 8" className="w-full h-full">
          <path d="M100 400 L250 250 L600 250 L800 150 L1000 150 L1100 250 L1150 400 Z" />
          <circle cx="300" cy="400" r="80" />
          <circle cx="950" cy="400" r="80" />
          <path d="M250 250 L400 150 L600 150" />
        </svg>
      </div>

      <div className="w-full max-w-md m-auto relative z-10 px-6">
        <div className="text-center mb-10">
          <Link href="/">
            <h1 className="font-serif text-3xl text-text-primary cursor-pointer hover:opacity-80 transition-opacity">
              Magma Autospa
            </h1>
          </Link>
          <div className="w-12 h-[2px] bg-border-hairline-strong mx-auto mt-4"></div>
        </div>

        <div className="panel p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-border-hairline-strong"></div>
          <Suspense fallback={<div className="text-center text-text-secondary font-mono text-xs uppercase tracking-widest animate-pulse">Initializing...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Smartphone, Mail, KeyRound, Clock, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import Image from "next/image";

function ForgotPasswordWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") || "staff";

  // Step 1: Identifier Input, Step 2: 6-Digit OTP Verification
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState(initialRole);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [maskedDestination, setMaskedDestination] = useState("");
  const [userLoginId, setUserLoginId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Accent color themes matching Magma Autospa Obsidian & Copper UI
  const accentClass =
    role === "admin"
      ? "bg-accent-oxblood text-white"
      : role === "manager"
      ? "bg-accent-gold text-bg-base"
      : "bg-accent-copper text-white";

  const accentBorder =
    role === "admin"
      ? "border-accent-oxblood"
      : role === "manager"
      ? "border-accent-gold"
      : "border-accent-copper";

  const accentText =
    role === "admin"
      ? "text-accent-oxblood"
      : role === "manager"
      ? "text-accent-gold"
      : "text-accent-copper";

  // Handle countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your registered email, username, or phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to send verification code. Please check your credentials.");
        setLoading(false);
        return;
      }

      if (data.role) setRole(data.role);
      if (data.masked_destination) setMaskedDestination(data.masked_destination);
      else if (data.masked_phone) setMaskedDestination(data.masked_phone);
      if (data.masked_phone) setMaskedPhone(data.masked_phone);
      if (data.login_id) setUserLoginId(data.login_id);

      setStep(2);
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err) {
      console.error(err);
      setError("Connection error. Please verify your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
      } else {
        setResendCooldown(60);
      }
    } catch (err) {
      setError("Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid verification code.");
        setLoading(false);
        return;
      }

      // Transition user to reset password page with reset_id and reset_token
      router.push(
        `/auth/reset-password?reset_id=${encodeURIComponent(data.reset_id)}&reset_token=${encodeURIComponent(
          data.reset_token
        )}&login_id=${encodeURIComponent(data.login_id || userLoginId)}&role=${encodeURIComponent(data.role || role)}`
      );
    } catch (err) {
      console.error(err);
      setError("Connection error during verification.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={16} className={accentText} />
          <span className={`${accentText} font-mono text-[11px] uppercase tracking-[0.15em] font-bold`}>
            Account Security
          </span>
        </div>
        <h2 className="text-2xl font-serif font-semibold text-text-primary">
          {step === 1 ? "Forgot Password" : "Enter Verification Code"}
        </h2>
        <p className="text-text-secondary text-xs mt-1">
          {step === 1
            ? "Enter your registered email, username, or phone number to receive a verification code in your email inbox."
            : `A 6-digit verification code was sent to your registered email (${maskedDestination || maskedPhone || "inbox"}).`}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 border-l-[3px] border-l-[#ff6b6b] bg-[#3a1616] text-[#ff6b6b] text-xs font-semibold leading-relaxed rounded-r">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
              Registered Email, Username, or Phone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. user@example.com, 9876543210, or MAG-0001"
              className="block w-full rounded border border-border-hairline-strong bg-bg-base p-3 text-text-primary font-mono text-sm placeholder-text-secondary/40 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded ${accentClass} p-3.5 font-bold uppercase tracking-widest text-xs transition-all duration-200 mt-6 disabled:opacity-50 hover:brightness-110 active:brightness-95 flex items-center justify-center gap-2`}
          >
            {loading ? "Sending Code..." : "Send Verification Code"}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-text-secondary uppercase tracking-widest">
                <ShieldCheck size={13} className={accentText} /> 6-Digit Verification Code
              </label>
              {resendCooldown > 0 ? (
                <span className="text-[11px] font-mono text-text-secondary flex items-center gap-1">
                  <Clock size={12} /> Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className={`text-[11px] font-mono ${accentText} hover:underline inline-flex items-center gap-1`}
                >
                  <RefreshCw size={11} /> Resend Code
                </button>
              )}
            </div>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="block w-full rounded border border-border-hairline-strong bg-bg-base p-3 text-text-primary font-mono text-center text-lg tracking-[0.5em] placeholder-text-secondary/30 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all"
              required
              autoFocus
            />
          </div>

          <div className="p-3 bg-bg-base/60 border border-border-hairline rounded text-[11px] text-text-secondary flex items-start gap-2">
            <Mail size={14} className="text-accent-copper shrink-0 mt-0.5" />
            <span>Please check your registered email inbox (and spam folder) for the 6-digit code. Valid for 10 minutes.</span>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className={`w-full rounded ${accentClass} p-3.5 font-bold uppercase tracking-widest text-xs transition-all duration-200 mt-4 disabled:opacity-50 hover:brightness-110 active:brightness-95 flex items-center justify-center gap-2`}
          >
            {loading ? "Verifying..." : "Verify & Continue"}
            {!loading && <ArrowRight size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setError("");
              setOtp("");
            }}
            className="w-full text-center text-xs text-text-secondary hover:text-text-primary pt-2"
          >
            Change Phone Number or Username
          </button>
        </form>
      )}

      <div className="pt-6 border-t border-border-hairline text-center mt-6">
        <Link
          href={`/login?role=${role}`}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={12} /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full bg-bg-base overflow-hidden">
      {/* LEFT HALF: Branding & Illustration */}
      <div className="hidden lg:flex lg:w-[45%] bg-bg-base relative flex-col justify-center px-16 border-r border-border-hairline z-10">
        <div className="relative z-20">
          <h1 className="font-serif text-5xl xl:text-6xl text-text-primary tracking-tight mb-3">
            Magma Autospa
          </h1>
          <p className="font-sans text-text-secondary text-sm uppercase tracking-[0.2em] font-medium">
            Identity & Access Security
          </p>
        </div>

        {/* Blueprint Illustration */}
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

      {/* RIGHT HALF: Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center bg-bg-panel p-6 relative">
        <div className="absolute top-12 left-0 w-full flex justify-center lg:hidden">
          <h1 className="font-serif text-3xl text-text-primary">Magma Autospa</h1>
        </div>

        <div className="w-full max-w-sm lg:max-w-md bg-bg-base/50 p-8 lg:p-12 rounded-xl border border-border-hairline shadow-lg">
          <Suspense fallback={<div className="text-text-primary font-bold">Loading...</div>}>
            <ForgotPasswordWizard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

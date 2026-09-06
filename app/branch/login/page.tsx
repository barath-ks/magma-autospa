"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, Building2, ArrowRight, Layers, Lock } from "lucide-react";
import Image from "next/image";

function BranchLoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "branch") {
        router.push("/branch/dashboard");
      } else if (role === "manager") {
        router.push("/manager");
      } else if (role === "admin") {
        router.push("/admin");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      login_id: identifier.trim(),
      password,
      portal: "branch",
      remember: remember.toString(),
    });

    if (res?.error) {
      const cleanMsg = res.error.replace("Error: ", "").replace("UNAUTHORIZED_PORTAL: ", "").replace("PORTAL_MISMATCH: ", "");
      setError(cleanMsg || "Invalid branch credentials. Check your branch email or branch code.");
      setLoading(false);
    } else {
      router.push("/branch/dashboard");
    }
  };

  if (status === "loading" || (status === "authenticated" && (session?.user as any)?.role === "branch")) {
    return (
      <div className="text-text-primary z-20 relative font-mono text-sm font-bold flex items-center gap-2">
        <Building2 className="animate-spin text-accent-copper" size={18} />
        <span>Authenticating branch session...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm z-20">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-accent-copper/10 border border-accent-copper/30 text-accent-copper text-[10px] font-mono uppercase tracking-widest font-bold mb-3">
          <ShieldCheck size={13} /> Unified Branch Profile
        </div>
        <span className="text-accent-copper font-mono text-[11px] uppercase tracking-[0.15em] font-bold block mb-1">
          BRANCH ACCESS
        </span>
        <h2 className="text-2xl font-serif font-semibold text-text-primary tracking-tight">
          Floor Operations Portal
        </h2>
        <p className="text-text-secondary text-xs mt-1">
          Sign in using your location credentials to manage active bays and customer services.
        </p>
      </div>

      {error && (
        <div className="mb-6 text-[#ff6b6b] bg-[#3a1616] p-3 text-xs font-mono border border-[#521d1d]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">
            Branch Email or Code
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="block w-full border border-border-hairline bg-bg-base p-3 text-text-primary font-mono text-sm placeholder:text-text-secondary/40 focus:border-accent-copper focus:outline-none focus:ring-1 focus:ring-accent-copper transition-all uppercase tracking-wider"
            placeholder="e.g. main@magma-autospa.com or MAG-BRANCH-01"
            required
            autoComplete="username"
          />
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest">
              Branch Password
            </label>
            <Link
              href="/auth/forgot-password?role=branch"
              className="text-[11px] font-medium text-text-secondary hover:text-accent-copper transition-colors"
            >
              Reset Key?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full border border-border-hairline bg-bg-base p-3 pr-10 text-text-primary font-mono text-sm placeholder:text-text-secondary/40 focus:border-accent-copper focus:outline-none focus:ring-1 focus:ring-accent-copper transition-all"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 bg-bg-base border-border-hairline rounded text-accent-copper focus:ring-accent-copper cursor-pointer"
          />
          <label htmlFor="remember-me" className="ml-2 block text-xs text-text-secondary cursor-pointer">
            Remember this terminal session
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-copper text-white hover:brightness-110 p-3 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          <span>{loading ? "Authenticating..." : "Open Branch Terminal"}</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* Alternative Portals */}
      <div className="mt-8 pt-6 border-t border-border-hairline space-y-2 text-center font-mono text-xs">
        <div className="text-text-secondary text-[11px] uppercase tracking-wider mb-2">
          Other Operational Portals
        </div>
        <div className="flex justify-center gap-4">
          <Link
            href="/manager/login"
            className="text-text-secondary hover:text-accent-gold transition-colors flex items-center gap-1 uppercase tracking-wider text-[11px]"
          >
            <Building2 size={12} />
            <span>Manager Portal</span>
          </Link>
          <span className="text-text-secondary/40">&bull;</span>
          <Link
            href="/admin/login"
            className="text-text-secondary hover:text-accent-oxblood transition-colors flex items-center gap-1 uppercase tracking-wider text-[11px]"
          >
            <ShieldCheck size={12} />
            <span>Executive Admin</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BranchLoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-6 bg-bg-base overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center mix-blend-screen">
        <Image
          src="/blueprint-car.jpg"
          alt="Magma Autospa Blueprint"
          width={1200}
          height={800}
          className="object-cover w-full h-full"
          priority
        />
      </div>

      <div className="w-full max-w-md bg-bg-panel border border-border-hairline p-8 md:p-10 shadow-2xl relative z-10">
        <Suspense fallback={<div className="text-text-primary font-mono text-xs">Loading terminal...</div>}>
          <BranchLoginForm />
        </Suspense>
      </div>
    </main>
  );
}

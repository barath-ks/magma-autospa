"use client";

import { signIn, useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRole = searchParams.get("role") || "branch";
  const role = rawRole === "staff" ? "branch" : rawRole;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      if ((session?.user as any)?.role) {
        const userRole = (session.user as any).role;
        if (userRole === "admin") router.push("/admin");
        else if (userRole === "manager") router.push("/manager");
        else if (userRole === "branch") router.push("/branch/dashboard");
      } else {
        // If they are "authenticated" but missing a role, their token is broken/expired.
        signOut({ redirect: false });
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      login_id: loginId,
      password,
      remember: remember.toString(),
    });

    if (res?.error) {
      setError("Invalid credentials. Please verify your login details.");
      setLoading(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && (session?.user as any)?.role)) {
    return <div className="text-text-primary z-20 relative font-bold">Authenticating...</div>;
  }

  let theme = {
    title: "BRANCH ACCESS",
    accentText: "text-accent-copper",
    btnBg: "bg-accent-copper hover:bg-opacity-90",
    inputLabel: "Branch Email or Code",
    placeholder: "e.g. main@magma-autospa.com or MAG-BRANCH-01"
  };

  if (role === "manager") {
    theme = {
      title: "MANAGER ACCESS",
      accentText: "text-accent-gold",
      btnBg: "bg-accent-gold hover:bg-opacity-90",
      inputLabel: "Manager ID",
      placeholder: "e.g. MGR-0001"
    };
  } else if (role === "admin") {
    theme = {
      title: "ADMIN ACCESS",
      accentText: "text-accent-oxblood",
      btnBg: "bg-accent-oxblood hover:bg-opacity-90",
      inputLabel: "Admin ID",
      placeholder: "e.g. ADM-0001"
    };
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <span className={`${theme.accentText} font-mono text-[11px] uppercase tracking-[0.1em] font-bold block mb-2`}>
          {theme.title}
        </span>
        <h2 className="text-2xl font-sans font-semibold text-text-primary">Sign in to your account</h2>
      </div>
      
      {error && (
        <div className="mb-6 text-[#ff6b6b] bg-[#3a1616] p-3 rounded text-sm font-medium border border-[#521d1d]">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">{theme.inputLabel}</label>
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="block w-full rounded border border-border-hairline-strong bg-bg-base p-3 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all uppercase tracking-wider"
            placeholder={theme.placeholder}
            required
          />
        </div>
        
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest">Password</label>
            <Link href={`/auth/forgot-password?role=${role}`} className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded border border-border-hairline-strong bg-bg-base p-3 text-text-primary font-mono text-sm placeholder-text-secondary/50 focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary transition-all pr-10"
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border-hairline-strong bg-bg-base focus:ring-1 focus:ring-text-secondary cursor-pointer accent-accent-copper"
          />
          <label htmlFor="remember" className="ml-2 block text-xs font-medium text-text-secondary cursor-pointer">
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded ${theme.btnBg} p-3.5 text-white font-bold transition-all duration-200 mt-8 disabled:opacity-50 hover:brightness-110 active:brightness-95 uppercase tracking-wider`}
        >
          {loading ? "AUTHENTICATING..." : "SIGN IN"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-bg-base overflow-hidden">
      
      {/* LEFT HALF: Branding & Illustration */}
      <div className="hidden lg:flex lg:w-[45%] bg-bg-base relative flex-col justify-center px-16 border-r border-border-hairline z-10">
        <div className="relative z-20">
          <h1 className="font-serif text-5xl xl:text-6xl text-text-primary tracking-tight mb-3">
            Magma Autospa
          </h1>
          <p className="font-sans text-text-secondary text-sm uppercase tracking-[0.2em] font-medium">
            Technical Operations Platform
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

      {/* RIGHT HALF: Login Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center bg-bg-panel p-6 relative">
        <div className="absolute top-12 left-0 w-full flex justify-center lg:hidden">
          <h1 className="font-serif text-3xl text-text-primary">Magma Autospa</h1>
        </div>

        <div className="w-full max-w-sm lg:max-w-md bg-bg-base/50 p-8 lg:p-12 rounded-xl border border-border-hairline shadow-lg">
          <Suspense fallback={<div className="text-text-primary font-bold">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>

    </div>
  );
}

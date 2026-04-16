"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setJWT } from "@/lib/tokens";
import { useClaraStore } from "@/store/claraStore";
import { EyeOff, User, Lock, Phone, Sparkles, ArrowRight, HelpCircle, Mail, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Mode = "signin" | "register";
type AuthType = "patient" | "caregiver";

function SignInForm() {
  const router = useRouter();
  const setSession = useClaraStore((state) => state.setSession);

  const [authType, setAuthType] = useState<AuthType>("patient");
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({
    name: "",
    passphrase: "",
    caregiverPhone: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const role = searchParams?.get("role");
    if (role === "caregiver") {
      setAuthType("caregiver");
      setMode("signin");
      setError(null);
    }
  }, [searchParams]);

  const isPatientValid =
    form.name.trim().length > 0 &&
    form.passphrase.trim().length >= 4;
  const isCaregiverValid =
    form.email.trim().length > 0 &&
    form.password.trim().length >= 4;
  const isValid = authType === "caregiver" ? isCaregiverValid : isPatientValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      if (authType === "caregiver") {
        const formData = new URLSearchParams();
        formData.set("username", form.email.trim());
        formData.set("password", form.password);

        let res: Response;
        try {
          res = await fetch("/api/v1/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });
        } catch {
          throw new Error("Clara service is unreachable. Please check your connection.");
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({ detail: "Invalid credentials" }));
          throw new Error(data.detail || "Invalid caregiver credentials.");
        }

        const data = await res.json();
        setJWT(data.access_token);
        router.push("/caregiver");
        return;
      }

      const endpoint = mode === "register" ? `/api/v1/auth/patient/register` : `/api/v1/auth/patient/login`;
      const body = mode === "register" 
        ? { name: form.name.trim(), passphrase: form.passphrase, caregiver_phone: form.caregiverPhone.trim() || null }
        : { name: form.name.trim(), passphrase: form.passphrase };

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        throw new Error("Clara service is unreachable. Please check your connection.");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Authentication failed" }));
        throw new Error(data.detail || "Something went wrong.");
      }

      const data = await res.json();
      setJWT(data.access_token);
      setSession({
        sessionId: data.session_id,
        patientId: data.patient_id,
        patientName: data.patient_name,
      });

      router.push("/chat");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-clara-bg p-6">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 mesh-gradient opacity-40"></div>
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-clara-primary/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-clara-accent/10 blur-[120px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[440px]"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 glass-card rounded-3xl flex items-center justify-center mb-4 shadow-glow-md"
          >
            <span className="text-3xl">🌿</span>
          </motion.div>
          <h1 className="text-4xl font-serif text-white mb-2 tracking-tight">Clara Companion</h1>
          <p className="text-clara-text-secondary text-lg font-medium opacity-80">Your gentle guide to peaceful days.</p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="glass-card p-1 rounded-2xl flex gap-1 mb-8 shadow-inner-glow">
          <button
            onClick={() => { setAuthType("patient"); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              authType === "patient" 
              ? "bg-clara-primary text-white shadow-glow-sm" 
              : "text-clara-text-secondary hover:text-white"
            }`}
          >
            Patient Access
          </button>
          <button
            onClick={() => { setAuthType("caregiver"); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              authType === "caregiver" 
              ? "bg-clara-primary text-white shadow-glow-sm" 
              : "text-clara-text-secondary hover:text-white"
            }`}
          >
            Caregiver Portal
          </button>
        </div>

        {/* Main Card */}
        <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.08] relative overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={authType + mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {authType === "caregiver" ? "Welcome Back" : mode === "signin" ? "Hello there!" : "Join Clara"}
                </h2>
                <p className="text-clara-text-secondary text-sm font-medium">
                  {authType === "caregiver" 
                    ? "Enter your secure credentials to access the dashboard." 
                    : mode === "signin" ? "Enter your details to start your session." : "Create your private space for peace and care."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {authType === "caregiver" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-clara-text-tertiary uppercase tracking-widest px-1">Email Address</label>
                      <div className="relative group">
                        <input
                          name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-clara-text-muted focus:bg-white/[0.06] focus:border-clara-primary/50 input-glow"
                        />
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary group-focus-within:text-clara-primary transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-clara-text-tertiary uppercase tracking-widest px-1">Secure Password</label>
                      <div className="relative group">
                        <input
                          name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={handleChange}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-12 text-white placeholder-clara-text-muted focus:bg-white/[0.06] focus:border-clara-primary/50 input-glow"
                        />
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary group-focus-within:text-clara-primary transition-colors" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary hover:text-white transition-colors">
                          {showPassword ? <EyeOff size={18} /> : <ShieldCheck size={18} />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-clara-text-tertiary uppercase tracking-widest px-1">Your Name</label>
                      <div className="relative group">
                        <input
                          name="name" type="text" placeholder="How should we call you?" value={form.name} onChange={handleChange}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-clara-text-muted focus:bg-white/[0.06] focus:border-clara-primary/50 input-glow"
                        />
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary group-focus-within:text-clara-primary transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-clara-text-tertiary uppercase tracking-widest px-1">Passphrase</label>
                      <div className="relative group">
                        <input
                          name="passphrase" type={showPassword ? "text" : "password"} placeholder="Your private key" value={form.passphrase} onChange={handleChange}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-12 text-white placeholder-clara-text-muted focus:bg-white/[0.06] focus:border-clara-primary/50 input-glow"
                        />
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary group-focus-within:text-clara-primary transition-colors" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary hover:text-white transition-colors">
                          {showPassword ? <EyeOff size={18} /> : <ShieldCheck size={18} />}
                        </button>
                      </div>
                    </div>
                    {mode === "register" && (
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-bold text-clara-text-tertiary uppercase tracking-widest px-1">Caregiver Phone (Optional)</label>
                        <div className="relative group">
                          <input
                            name="caregiverPhone" type="tel" placeholder="+1 (555) 000-0000" value={form.caregiverPhone} onChange={handleChange}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-clara-text-muted focus:bg-white/[0.06] focus:border-clara-primary/50 input-glow"
                          />
                          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary group-focus-within:text-clara-primary transition-colors" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-danger-muted border border-danger/30 text-danger text-sm p-4 rounded-xl flex items-start gap-3"
                  >
                    <HelpCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="font-medium">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full py-4 bg-gradient-to-r from-clara-primary to-clara-primary-light text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-glow-md hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:shadow-none mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {authType === "caregiver" ? "Access Portal" : mode === "signin" ? "Begin Session" : "Create Account"}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>

              {authType === "patient" && (
                <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
                  <button 
                    onClick={() => switchMode(mode === "signin" ? "register" : "signin")}
                    className="text-sm font-bold text-clara-text-secondary hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    {mode === "signin" ? "New to Clara? Create an account" : "Back to Sign In"}
                    <Sparkles size={16} className="text-clara-primary" />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <p className="mt-10 text-center text-clara-text-muted text-xs font-bold uppercase tracking-[0.2em]">
          Private • Secure • Always Available
        </p>
      </motion.div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-clara-bg flex items-center justify-center"><div className="w-12 h-12 border-4 border-clara-primary/30 border-t-clara-primary rounded-full animate-spin" /></div>}>
      <SignInForm />
    </React.Suspense>
  );
}

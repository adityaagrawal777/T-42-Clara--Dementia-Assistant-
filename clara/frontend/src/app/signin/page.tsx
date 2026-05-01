"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setJWT } from "@/lib/tokens";
import { useClaraStore } from "@/store/claraStore";
import { EyeOff, User, Lock, ArrowRight, HelpCircle, ShieldCheck, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Mode = "signin" | "register";

function PatientSignInForm() {
  const router = useRouter();
  const setSession = useClaraStore((state) => state.setSession);

  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ name: "", passphrase: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);

  // Form is valid when both fields have content
  const isValid = form.name.trim().length > 0 && form.passphrase.trim().length >= 4;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint =
        mode === "register"
          ? "/api/v1/auth/patient/register"
          : "/api/v1/auth/patient/login";

      const body =
        mode === "register"
          ? { name: form.name.trim(), passphrase: form.passphrase }
          : { name: form.name.trim(), passphrase: form.passphrase };

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        throw new Error("Clara is unreachable. Please check your connection.");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Authentication failed." }));
        const detail = data.detail || "Something went wrong.";
        if (res.status === 401 && mode === "signin") {
          throw new Error(detail + " If you're new here, create an account below.");
        }
        throw new Error(detail);
      }

      const data = await res.json();
      setJWT(data.access_token);
      setSession({
        sessionId: data.session_id,
        patientId: data.patient_id,
        patientName: data.patient_name,
      });

      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#f5f2ec] via-[#ede8e0] to-[#e8e2d8] px-6 py-4">
      {/* Ambient Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-clara-primary/6 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-clara-accent/6 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[400px]"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-14 h-14 bg-clara-primary/15 border border-clara-primary/20 rounded-[1.25rem] flex items-center justify-center mb-3 shadow-glow-md"
          >
            <span className="text-2xl" role="img" aria-label="Clara">🌿</span>
          </motion.div>
          <h1 className="text-3xl font-serif text-clara-text-primary tracking-tight mb-1">
            Clara Companion
          </h1>
          <p className="text-clara-text-tertiary text-sm font-medium">
            Your gentle guide to peaceful days.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-clara-surface/95 backdrop-blur-sm border border-clara-border rounded-[2rem] p-8 shadow-dark-lg overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Card Title */}
              <div className="mb-7">
                <h2 className="text-xl font-bold text-clara-text-primary mb-1">
                  {mode === "signin" ? "Hello there 👋" : "Join Clara"}
                </h2>
                <p className="text-clara-text-secondary text-sm font-medium">
                  {mode === "signin"
                    ? "Enter your details to begin your session."
                    : "Create your private, peaceful space."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Name Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="patient-name"
                    className="text-[11px] font-bold text-clara-text-tertiary uppercase tracking-widest px-1"
                  >
                    Your Name
                  </label>
                  <div className="relative group">
                    <input
                      id="patient-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="How should we call you?"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-clara-surface border border-clara-border rounded-xl py-3.5 pl-11 pr-4 text-clara-text-primary placeholder-clara-text-muted focus:outline-none focus:border-clara-primary focus:ring-2 focus:ring-clara-primary/20 transition-all"
                    />
                    <User
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary group-focus-within:text-clara-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Passphrase Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="patient-passphrase"
                    className="text-[11px] font-bold text-clara-text-tertiary uppercase tracking-widest px-1"
                  >
                    Passphrase
                  </label>
                  <div className="relative group">
                    <input
                      id="patient-passphrase"
                      name="passphrase"
                      type={showPassphrase ? "text" : "password"}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      placeholder="Your private key (min. 4 characters)"
                      value={form.passphrase}
                      onChange={handleChange}
                      className="w-full bg-clara-surface border border-clara-border rounded-xl py-3.5 pl-11 pr-12 text-clara-text-primary placeholder-clara-text-muted focus:outline-none focus:border-clara-primary focus:ring-2 focus:ring-clara-primary/20 transition-all"
                    />
                    <Lock
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary group-focus-within:text-clara-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-text-tertiary hover:text-clara-text-primary transition-colors"
                      aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
                    >
                      {showPassphrase ? <EyeOff size={16} /> : <ShieldCheck size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-danger-muted border border-danger/30 text-danger text-sm p-3.5 rounded-xl flex items-start gap-3"
                    >
                      <HelpCircle size={16} className="shrink-0 mt-0.5" />
                      <p className="font-medium leading-snug">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full py-3.5 mt-1 bg-gradient-to-r from-clara-primary to-clara-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-glow-md hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:shadow-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === "signin" ? "Begin Session" : "Create Account"}
                      {mode === "signin" ? (
                        <ArrowRight size={18} />
                      ) : (
                        <UserPlus size={18} />
                      )}
                    </>
                  )}
                </button>
              </form>

              {/* Mode Toggle */}
              <div className="mt-6 pt-5 border-t border-clara-border text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "register" : "signin");
                    setError(null);
                  }}
                  className="text-sm font-bold text-clara-text-secondary hover:text-clara-text-primary transition-colors inline-flex items-center gap-2 mx-auto"
                >
                  {mode === "signin"
                    ? "New to Clara? Create an account"
                    : "Already have an account? Sign in"}
                  <ArrowRight size={14} className="text-clara-primary" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer — Subtle link to caregiver portal */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-clara-text-tertiary text-xs font-bold uppercase tracking-[0.2em]">
            Private · Secure · Always Available
          </p>
          <Link
            href="/caregiver/login"
            className="text-[11px] text-clara-text-muted hover:text-clara-text-tertiary transition-colors font-medium"
          >
            Are you a caregiver? →
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-clara-bg flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-clara-primary/30 border-t-clara-primary rounded-full animate-spin" />
        </div>
      }
    >
      <PatientSignInForm />
    </React.Suspense>
  );
}

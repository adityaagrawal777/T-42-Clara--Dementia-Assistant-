"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setJWT } from "@/lib/tokens";
import { EyeOff, User, Lock, ArrowRight, HelpCircle, Mail, ShieldCheck, Search, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Mode = "signin" | "register";

export default function CaregiverLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    patientName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isSigninValid = form.email.trim().length > 0 && form.password.trim().length >= 4;
  const isRegisterValid = form.fullName.trim().length > 0 && form.email.trim().length > 0 && form.password.trim().length >= 6;
  const isValid = mode === "register" ? isRegisterValid : isSigninValid;

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
      let token: string;

      if (mode === "register") {
        let regRes: Response;
        try {
          regRes = await fetch("/api/v1/auth/caregiver/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: form.fullName.trim(),
              email: form.email.trim(),
              password: form.password,
            }),
          });
        } catch {
          throw new Error("Clara service is unreachable. Please check your connection.");
        }
        if (!regRes.ok) {
          const d = await regRes.json().catch(() => ({ detail: "Registration failed." }));
          throw new Error(d.detail || "Registration failed.");
        }
        const regData = await regRes.json();
        token = regData.access_token;
      } else {
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
          const d = await res.json().catch(() => ({ detail: "Incorrect email or password" }));
          throw new Error(d.detail || "Incorrect email or password.");
        }
        const data = await res.json();
        token = data.access_token;
      }

      setJWT(token);

      if (form.patientName.trim()) {
        const patientsRes = await fetch("/api/v1/patients/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const patients: Array<{ id: string; name: string }> = patientsRes.ok
          ? await patientsRes.json()
          : [];
        const match = patients.find(
          (p) => p.name.trim().toLowerCase() === form.patientName.trim().toLowerCase()
        );
        if (!match) {
          throw new Error(`"${form.patientName}" is not in your assigned patient list.`);
        }
        router.push(`/caregiver/patients/${match.id}`);
        return;
      }

      router.push("/caregiver");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-6 py-4">
      {/* Subtle Background Elements */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-6 text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-12 h-12 bg-white/[0.05] border border-white/[0.1] rounded-2xl flex items-center justify-center mb-3 shadow-2xl"
          >
            <ShieldCheck className="text-blue-400 w-6 h-6" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Caregiver Portal</h1>
          <p className="text-white/50 text-sm font-medium">Clara Clinical Management</p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden shadow-2xl border border-white/[0.08] bg-white/[0.02]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">
                  {mode === "register" ? "Create Caregiver Account" : "Welcome Back"}
                </h2>
                <p className="text-white/60 text-sm font-medium">
                  {mode === "register"
                    ? "Set up your caregiver account to manage your patients."
                    : "Enter your secure credentials to access the dashboard."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">Full Name</label>
                    <div className="relative group">
                      <input
                        name="fullName" type="text" placeholder="Dr. Jane Smith" value={form.fullName} onChange={handleChange}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                      />
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">Email Address</label>
                  <div className="relative group">
                    <input
                      name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">
                    {mode === "register" ? "Create Password" : "Secure Password"}
                  </label>
                  <div className="relative group">
                    <input
                      name="password" type={showPassword ? "text" : "password"}
                      placeholder={mode === "register" ? "Min. 6 characters" : "••••••••"}
                      value={form.password} onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-10 pr-10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                    />
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <ShieldCheck size={16} />}
                    </button>
                  </div>
                </div>

                {mode === "signin" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-1">
                      Patient Name <span className="normal-case font-medium opacity-60">(optional)</span>
                    </label>
                    <div className="relative group">
                      <input
                        name="patientName" type="text" placeholder="Go directly to a patient's profile" value={form.patientName} onChange={handleChange}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                      />
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <p className="text-[10px] text-white/30 px-1 pt-0.5">Leave blank to view your full dashboard</p>
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl flex items-start gap-2.5 mt-2"
                  >
                    <HelpCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="font-medium">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full py-3.5 bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === "register" ? "Create Account" : "Access Portal"}
                      {mode === "register" ? <UserPlus size={18} /> : <ArrowRight size={18} />}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/[0.08] text-center">
                <button
                  onClick={() => switchMode(mode === "signin" ? "register" : "signin")}
                  className="text-sm font-bold text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  {mode === "signin"
                    ? "New caregiver? Create an account"
                    : "Already have an account? Sign in"}
                  <ArrowRight size={14} className="text-blue-400" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-white/30 text-xs font-bold uppercase tracking-[0.2em]">
          HIPAA Compliant • Secure
        </p>
      </motion.div>
    </main>
  );
}

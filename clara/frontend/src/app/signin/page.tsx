"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setJWT } from "@/lib/tokens";
import { useClaraStore } from "@/store/claraStore";
import { EyeOff, User, Lock, Phone, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
import Image from "next/image";

type Mode = "signin" | "register";

export default function SignInPage() {
  const router = useRouter();
  const setSession = useClaraStore((state) => state.setSession);

  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({
    name: "",
    passphrase: "",
    caregiverPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isValid = form.name.trim().length > 0 && form.passphrase.trim().length >= 4;

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
      const endpoint =
        mode === "register"
          ? `/api/v1/auth/patient/register`
          : `/api/v1/auth/patient/login`;

      const body =
        mode === "register"
          ? {
              name: form.name.trim(),
              passphrase: form.passphrase,
              caregiver_phone: form.caregiverPhone.trim() || null,
            }
          : {
              name: form.name.trim(),
              passphrase: form.passphrase,
            };

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        throw new Error(
          "Clara is not reachable right now. Please make sure the app is running and try again."
        );
      }

      interface AuthResponse {
        access_token: string;
        session_id: string;
        patient_id: string;
        patient_name: string;
        detail?: string;
        message?: string;
      }

      let data: Partial<AuthResponse> = {};
      try {
        data = (await res.json()) as Partial<AuthResponse>;
      } catch {
        // JSON parse failed — surface a sensible error regardless of status
        throw new Error(
          `Server error (${res.status}). Please try again in a moment.`
        );
      }

      if (!res.ok) {
        const msg =
          data.detail ||
          data.message ||
          "Something went wrong. Please try again.";
        throw new Error(msg);
      }

      // Validate all required fields are present before using them
      if (!data.access_token || !data.session_id || !data.patient_id || !data.patient_name) {
        throw new Error("Received an incomplete response from the server. Please try again.");
      }

      setJWT(data.access_token);
      setSession({
        sessionId: data.session_id,
        patientId: data.patient_id,
        patientName: data.patient_name,
      });

      router.push("/chat");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-clara-neutral-bg">
      {/* ─── Left Panel ─────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col w-[46%] relative px-10 py-10 bg-clara-neutral-bg overflow-hidden border-r border-clara-beige-200">
        {mode === "signin" ? <SignInLeftPanel /> : <RegisterLeftPanel />}
      </div>

      {/* ─── Right Panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-12 overflow-y-auto w-full">
        <div className="w-full max-w-[420px]">
          {mode === "signin" ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-clara-green-900 mb-2">What is your name?</h2>
                <p className="text-clara-neutral-muted">Welcome back to your safe space.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Name */}
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full py-4 pl-5 pr-12 rounded-2xl border-2 border-transparent bg-white shadow-sm text-clara-green-900 font-sans text-base outline-none transition-all focus:border-clara-green-700 focus:shadow-md focus:shadow-clara-green-900/5 hover:border-clara-beige-200"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-neutral-muted">
                    <User size={20} />
                  </span>
                </div>

                {/* Passphrase */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-clara-green-900 ml-1">Your private key</label>
                  <div className="relative">
                    <input
                      id="passphrase"
                      name="passphrase"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={form.passphrase}
                      onChange={handleChange}
                      className="w-full py-4 pl-5 pr-12 rounded-2xl border-2 border-transparent bg-white shadow-sm text-clara-green-900 font-sans text-base outline-none transition-all focus:border-clara-green-700 focus:shadow-md focus:shadow-clara-green-900/5 hover:border-clara-beige-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-neutral-muted hover:text-clara-green-800 transition-colors bg-transparent border-0 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Lock size={20} />}
                    </button>
                  </div>
                  {form.passphrase.length > 0 && form.passphrase.length < 4 && (
                    <p className="text-red-500 text-xs mt-1 ml-2 font-medium">Passphrase must be at least 4 characters.</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm leading-relaxed font-medium">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  id="signin-btn"
                  disabled={!isValid || loading}
                  className="w-full py-4 mt-2 rounded-[2rem] bg-clara-green-800 text-white font-sans text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-clara-green-800/20 hover:bg-clara-green-900 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-clara-beige-200 disabled:text-clara-neutral-muted disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight size={20} strokeWidth={2.5} />
                    </span>
                  )}
                </button>

                {/* Switch to register */}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="w-full py-4 rounded-[2rem] bg-transparent text-clara-green-800 font-sans text-base font-bold border-2 border-dashed border-clara-green-700 cursor-pointer transition-colors hover:bg-clara-green-50"
                >
                  Create an Account
                </button>

                <p className="flex items-center justify-center gap-2 text-sm text-clara-neutral-muted mt-2">
                  <HelpCircle size={16} />
                  Forgot your passphrase? Ask your caregiver.
                </p>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-clara-green-900 mb-2">Create your space</h2>
                <p className="text-clara-neutral-muted">Welcome to your new digital home.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-clara-green-900 ml-1">Your Name</label>
                  <div className="relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="given-name"
                      placeholder="How should we call you?"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full py-4 pl-5 pr-12 rounded-2xl border-2 border-transparent bg-white shadow-sm text-clara-green-900 font-sans text-base outline-none transition-all focus:border-clara-green-700 focus:shadow-md focus:shadow-clara-green-900/5 hover:border-clara-beige-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-neutral-muted">
                      <User size={20} />
                    </span>
                  </div>
                </div>

                {/* Passphrase */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-clara-green-900 ml-1">Passphrase</label>
                  <div className="relative">
                    <input
                      id="passphrase"
                      name="passphrase"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a secure passphrase"
                      value={form.passphrase}
                      onChange={handleChange}
                      className="w-full py-4 pl-5 pr-12 rounded-2xl border-2 border-transparent bg-white shadow-sm text-clara-green-900 font-sans text-base outline-none transition-all focus:border-clara-green-700 focus:shadow-md focus:shadow-clara-green-900/5 hover:border-clara-beige-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-neutral-muted hover:text-clara-green-800 transition-colors bg-transparent border-0 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Lock size={20} />}
                    </button>
                  </div>
                  {form.passphrase.length > 0 && form.passphrase.length < 4 && (
                    <p className="text-red-500 text-xs mt-1 ml-2 font-medium">Passphrase must be at least 4 characters.</p>
                  )}
                </div>

                {/* Caregiver phone */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-clara-green-900 ml-1">
                    Caregiver&apos;s Phone <span className="font-medium text-clara-neutral-muted">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="caregiverPhone"
                      name="caregiverPhone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+1 (555) 000-0000"
                      value={form.caregiverPhone}
                      onChange={handleChange}
                      className="w-full py-4 pl-5 pr-12 rounded-2xl border-2 border-transparent bg-white shadow-sm text-clara-green-900 font-sans text-base outline-none transition-all focus:border-clara-green-700 focus:shadow-md focus:shadow-clara-green-900/5 hover:border-clara-beige-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-clara-neutral-muted">
                      <Phone size={20} />
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm leading-relaxed font-medium">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  id="register-btn"
                  disabled={!isValid || loading}
                  className="w-full py-4 mt-2 rounded-[2rem] bg-clara-green-800 text-white font-sans text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-clara-green-800/20 hover:bg-clara-green-900 hover:-translate-y-0.5 hover:shadow-lg disabled:bg-clara-beige-200 disabled:text-clara-neutral-muted disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Start Journey <ArrowRight size={20} strokeWidth={2.5} />
                    </span>
                  )}
                </button>

                {/* Already have account */}
                <p className="text-center text-sm text-clara-neutral-muted mt-2">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchMode("signin")} className="font-bold text-clara-green-800 bg-transparent border-0 cursor-pointer underline underline-offset-4 decoration-clara-green-800/30 hover:decoration-clara-green-800 transition-colors">
                    Sign in here
                  </button>
                </p>

                {/* Help notice */}
                <div className="flex items-start gap-3 bg-clara-green-900 text-white rounded-2xl px-5 py-4 text-sm leading-relaxed mt-2 shadow-sm">
                  <HelpCircle size={20} className="shrink-0 opacity-80 mt-0.5" />
                  <p>Need help? Our gentle guide is always available. Just look for the help icon if you get stuck.</p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ───────────────────────────────────────────────
   Left panel sub-components
─────────────────────────────────────────────── */

function SignInLeftPanel() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700">
      {/* Top plant image */}
      <div className="relative w-36 h-36 rounded-full overflow-hidden ml-auto mb-10 shadow-lg shadow-black/10 shrink-0 border-4 border-white">
        <Image
          src="/assets/signin_plant.png"
          alt="Calm nature decoration"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Brand */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-2xl">🌿</span>
        <span className="text-base font-bold text-clara-green-800 tracking-wide">Clara Companion</span>
      </div>

      {/* Hero text */}
      <h1 className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-clara-green-900 leading-[1.1] mb-6">
        Welcome home,<br />it&apos;s lovely to<br />see you.
      </h1>
      <p className="text-base text-clara-neutral-muted leading-relaxed max-w-[340px] mb-12">
        Take a deep breath. Clara is here to help you remember the beautiful moments and guide you through your day with warmth.
      </p>

      {/* Clara ready card */}
      <div className="flex items-start gap-4 bg-clara-beige-50 border border-clara-beige-200 rounded-3xl p-5 max-w-[380px] shadow-sm">
        <div className="w-12 h-12 rounded-full bg-clara-green-100 text-clara-green-800 flex items-center justify-center shrink-0">
          <Sparkles size={24} />
        </div>
        <div className="pt-1">
          <p className="font-bold text-clara-green-900 mb-1">Clara is ready</p>
          <p className="text-sm text-clara-neutral-muted italic leading-relaxed">
            &quot;I&apos;ve kept your memories and conversations ready for you.&quot;
          </p>
        </div>
      </div>

      {/* Decorative bottom pot icon */}
      <div className="text-6xl opacity-20 mt-auto pt-10 leading-none grayscale filter mix-blend-multiply">🪴</div>
    </div>
  );
}

function RegisterLeftPanel() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700">
      {/* Sunrise image */}
      <div className="relative w-full rounded-3xl overflow-hidden shrink-0 basis-[55%] shadow-xl shadow-black/5 border-4 border-white mb-8">
        <Image
          src="/assets/register_sunrise.png"
          alt="Peaceful sunrise landscape"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Brand + tagline below image */}
      <div className="mt-4">
        <h1 className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-clara-green-800 leading-[1.1] mb-4">Clara<br />Companion</h1>
        <p className="text-base text-clara-neutral-muted leading-relaxed max-w-[340px]">
          Join Clara on your journey to peace and companionship. A gentle space designed for focus and tranquility.
        </p>
      </div>
    </div>
  );
}

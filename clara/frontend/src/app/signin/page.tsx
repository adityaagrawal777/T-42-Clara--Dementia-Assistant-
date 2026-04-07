"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setJWT } from "@/lib/tokens";
import { useClaraStore } from "@/store/claraStore";
import { Eye, EyeOff, User, Lock, Mail, Phone, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
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
        if (!res.ok) {
          throw new Error(
            `Server error (${res.status}). Please try again in a moment.`
          );
        }
      }

      if (!res.ok) {
        const msg =
          data.detail ||
          data.message ||
          "Something went wrong. Please try again.";
        throw new Error(msg);
      }

      setJWT(data.access_token!);
      setSession({
        sessionId: data.session_id!,
        patientId: data.patient_id!,
        patientName: data.patient_name!,
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
    <main className="sanctuary-auth-root">
      {/* ─── Left Panel ─────────────────────────────────────────────── */}
      <div className="sanctuary-auth-left">
        {mode === "signin" ? <SignInLeftPanel /> : <RegisterLeftPanel />}
      </div>

      {/* ─── Right Panel ─────────────────────────────────────────────── */}
      <div className="sanctuary-auth-right">
        <div className="sanctuary-auth-form-wrap">
          {mode === "signin" ? (
            <>
              <div className="sanctuary-form-header">
                <h2 className="sanctuary-form-title">What is your name?</h2>
              </div>

              <form onSubmit={handleSubmit} className="sanctuary-form">
                {/* Name */}
                <div className="sanctuary-field">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    className="sanctuary-input"
                  />
                  <span className="sanctuary-input-icon">
                    <User size={18} />
                  </span>
                </div>

                {/* Passphrase */}
                <div className="sanctuary-field-group">
                  <label className="sanctuary-label">Your private key</label>
                  <div className="sanctuary-field">
                    <input
                      id="passphrase"
                      name="passphrase"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={form.passphrase}
                      onChange={handleChange}
                      className="sanctuary-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="sanctuary-input-icon sanctuary-input-icon-btn"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Lock size={18} />}
                    </button>
                  </div>
                  {form.passphrase.length > 0 && form.passphrase.length < 4 && (
                    <p className="sanctuary-hint-error">Passphrase must be at least 4 characters.</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="sanctuary-error-banner">{error}</div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  id="signin-btn"
                  disabled={!isValid || loading}
                  className={`sanctuary-primary-btn ${!isValid || loading ? "sanctuary-primary-btn--disabled" : ""}`}
                >
                  {loading ? (
                    <span className="sanctuary-btn-inner">
                      <span className="sanctuary-spinner" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="sanctuary-btn-inner">
                      Sign In <ArrowRight size={18} />
                    </span>
                  )}
                </button>

                {/* Switch to register */}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="sanctuary-secondary-btn"
                >
                  Create an Account
                </button>

                <p className="sanctuary-forgot">
                  <HelpCircle size={14} />
                  Forgot your passphrase? Ask your caregiver for help.
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="sanctuary-form-header">
                <h2 className="sanctuary-form-title">Create your space</h2>
                <p className="sanctuary-form-subtitle">Welcome to your new digital home.</p>
              </div>

              <form onSubmit={handleSubmit} className="sanctuary-form">
                {/* Name */}
                <div className="sanctuary-field-group">
                  <label className="sanctuary-label">Your Name</label>
                  <div className="sanctuary-field">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="given-name"
                      placeholder="How should we call you?"
                      value={form.name}
                      onChange={handleChange}
                      className="sanctuary-input"
                    />
                    <span className="sanctuary-input-icon">
                      <User size={18} />
                    </span>
                  </div>
                </div>

                {/* Email — visual only, no backend field */}
                <div className="sanctuary-field-group">
                  <label className="sanctuary-label">Passphrase</label>
                  <div className="sanctuary-field">
                    <input
                      id="passphrase"
                      name="passphrase"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a secure passphrase"
                      value={form.passphrase}
                      onChange={handleChange}
                      className="sanctuary-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="sanctuary-input-icon sanctuary-input-icon-btn"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Lock size={18} />}
                    </button>
                  </div>
                  {form.passphrase.length > 0 && form.passphrase.length < 4 && (
                    <p className="sanctuary-hint-error">Passphrase must be at least 4 characters.</p>
                  )}
                </div>

                {/* Caregiver phone */}
                <div className="sanctuary-field-group">
                  <label className="sanctuary-label">Caregiver&apos;s Phone <span className="sanctuary-optional">(optional)</span></label>
                  <div className="sanctuary-field">
                    <input
                      id="caregiverPhone"
                      name="caregiverPhone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+1 (555) 000-0000"
                      value={form.caregiverPhone}
                      onChange={handleChange}
                      className="sanctuary-input"
                    />
                    <span className="sanctuary-input-icon">
                      <Phone size={18} />
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="sanctuary-error-banner">{error}</div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  id="register-btn"
                  disabled={!isValid || loading}
                  className={`sanctuary-primary-btn ${!isValid || loading ? "sanctuary-primary-btn--disabled" : ""}`}
                >
                  {loading ? (
                    <span className="sanctuary-btn-inner">
                      <span className="sanctuary-spinner" />
                      Creating account…
                    </span>
                  ) : (
                    <span className="sanctuary-btn-inner">
                      Start Journey <ArrowRight size={18} />
                    </span>
                  )}
                </button>

                {/* Already have account */}
                <p className="sanctuary-switch-mode">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchMode("signin")} className="sanctuary-link">
                    Sign in here
                  </button>
                </p>

                {/* Help notice */}
                <div className="sanctuary-help-box">
                  <HelpCircle size={16} className="sanctuary-help-icon" />
                  <p>Need help? Our gentle guide is always available. Just look for the help icon if you get stuck.</p>
                </div>
              </form>
            </>
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
    <div className="sanctuary-signin-left">
      {/* Top plant image */}
      <div className="sanctuary-plant-img-wrap">
        <Image
          src="/assets/signin_plant.png"
          alt="Calm nature decoration"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Brand */}
      <div className="sanctuary-brand-tag">
        <span className="sanctuary-brand-icon">🌿</span>
        <span className="sanctuary-brand-name">Clara Companion</span>
      </div>

      {/* Hero text */}
      <h1 className="sanctuary-hero-title">
        Welcome home,<br />it&apos;s lovely to<br />see you.
      </h1>
      <p className="sanctuary-hero-subtitle">
        Take a deep breath. Clara is here to help you remember the beautiful moments and guide you through your day with warmth.
      </p>

      {/* Clara ready card */}
      <div className="sanctuary-ready-card">
        <div className="sanctuary-ready-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="sanctuary-ready-title">Clara is ready</p>
          <p className="sanctuary-ready-quote">
            &quot;I&apos;ve kept your memories and conversations ready for you.&quot;
          </p>
        </div>
      </div>

      {/* Decorative bottom pot icon */}
      <div className="sanctuary-bottom-plant">🪴</div>
    </div>
  );
}

function RegisterLeftPanel() {
  return (
    <div className="sanctuary-register-left">
      {/* Sunrise image */}
      <div className="sanctuary-sunrise-wrap">
        <Image
          src="/assets/register_sunrise.png"
          alt="Peaceful sunrise landscape"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Brand + tagline below image */}
      <div className="sanctuary-register-brand">
        <h1 className="sanctuary-register-title">Clara<br />Companion</h1>
        <p className="sanctuary-register-tagline">
          Join Clara on your journey to peace and companionship. A gentle space designed for focus and tranquility.
        </p>
      </div>
    </div>
  );
}

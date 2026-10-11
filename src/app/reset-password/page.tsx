"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowRight,
} from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<{
    email: string;
    fullName: string;
    role: string;
  } | null>(null);

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenError("No password setup token was provided in the URL.");
      return;
    }

    let isMounted = true;
    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (isMounted) {
          if (!res.ok || !data.success) {
            setTokenError(data.error || "The setup link is invalid or has expired.");
          } else {
            setTargetUser(data.user);
          }
        }
      } catch {
        if (isMounted) {
          setTokenError("Unable to verify setup link. Please verify server connectivity.");
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    }

    checkToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match. Please re-enter.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || "Failed to set password. Please try again.");
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch {
      setSubmitError("Network error while submitting password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-csjmu-950 p-6 text-white text-center border-b border-csjmu-800">
          <div className="w-12 h-12 rounded-xl bg-gold-400/20 text-gold-400 border border-gold-400/30 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Security Credential Setup</h1>
          <p className="text-xs text-slate-300 mt-1">
            School of Basic Sciences &bull; CSJMU Kanpur
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {verifying ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-csjmu-800 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Verifying security token...</p>
            </div>
          ) : tokenError ? (
            <div className="space-y-4">
              <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Link Invalid or Expired:</strong>
                  <p className="mt-1 leading-relaxed">{tokenError}</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-csjmu-900 hover:underline"
                >
                  <span>Return to Portal Sign-In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Password Configured Successfully!</h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your account is now secured. Redirecting you to the staff sign-in page...
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 shadow"
                >
                  <span>Go to Login Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {targetUser && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                  <p className="font-semibold text-slate-800">{targetUser.fullName}</p>
                  <p className="text-slate-500 font-mono text-[11px]">{targetUser.email}</p>
                  <p className="text-csjmu-800 font-bold text-[10px] uppercase tracking-wider mt-1">
                    Role: {targetUser.role}
                  </p>
                </div>
              )}

              {submitError && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="new-pass"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="confirm-pass"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-csjmu-700 shrink-0 mt-0.5" />
                <span>
                  Passwords must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number or symbol.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Configuring Password...</span>
                  </>
                ) : (
                  <span>Set New Password & Sign In</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

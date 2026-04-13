"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/projects` },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Check your email to confirm your account, then log in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/projects");
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Logo />
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1C1917]">
            {isSignup ? "Start Your Free Trial" : "Welcome back"}
          </h1>
          {isSignup && (
            <p className="text-stone-500 mt-1 text-sm">14 days free. No credit card required.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-transparent text-base"
                placeholder="you@yourcompany.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:border-transparent text-base"
                placeholder={isSignup ? "Create a password" : "Your password"}
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm font-medium">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#EA580C] text-white font-bold py-3.5 px-6 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px] text-base"
            >
              {loading ? "Please wait..." : isSignup ? "Create Account — Free" : "Log In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setIsSignup(false)}
                  className="text-[#EA580C] font-bold hover:underline"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setIsSignup(true)}
                  className="text-[#EA580C] font-bold hover:underline"
                >
                  Start free trial
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

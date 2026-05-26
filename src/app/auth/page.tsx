"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Wallet, AlertCircle, Loader2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // This redirects them back to the main dashboard after confirming email
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        alert("Check your email for the confirmation link!");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/"); // Send them directly to the dashboard
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-xl flex items-center justify-center mb-3 shadow-md">
            <Wallet size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isSignUp ? "Create your account" : "Welcome back to WealthBase"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp ? "Start managing your fortune smarter" : "Log in to track your net worth"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm rounded-lg flex items-center gap-2 border border-red-100 dark:border-red-800">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none focus:border-black dark:focus:border-white transition text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none focus:border-black dark:focus:border-white transition text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:opacity-90 transition mt-2 flex justify-center items-center gap-2 text-sm shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-800 pt-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium transition"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
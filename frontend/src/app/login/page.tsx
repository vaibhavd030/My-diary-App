"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, BookHeart } from "lucide-react";
import { setAuth } from "@/lib/auth";
import { loginUser, registerUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    abhyasi_id: "",
    password: "",
  });

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        const data = await loginUser(form.email, form.password);
        setAuth(data.access_token, data.user);
        router.push("/");
      } else {
        await registerUser({
          email: form.email,
          password: form.password,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          abhyasi_id: form.abhyasi_id || undefined,
        });
        const data = await loginUser(form.email, form.password);
        setAuth(data.access_token, data.user);
        router.push("/");
      }
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      setError(
        e.response?.data?.detail ?? e.message ?? "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center bg-[#F5F1E6] text-[#3E3E3E] p-4">
      <div className="paper-pattern absolute inset-0 opacity-10 pointer-events-none" />

      <div className="w-full max-w-md diary-card p-8 z-10 relative">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-[#F0E4C7] flex items-center justify-center">
            <BookHeart className="w-6 h-6 text-[#8C6D3F]" />
          </div>
        </div>

        <h1
          className="text-center mb-1"
          style={{
            fontFamily: "var(--font-pinyon), cursive",
            fontSize: 36,
            color: "#8C6D3F",
            lineHeight: 1,
          }}
        >
          My Diary
        </h1>
        <p className="text-center text-[12px] text-[#735e3b] mb-6 italic border-b border-[#e6dece] pb-4">
          A quiet space for daily practice
        </p>

        <div className="flex mb-6 border-b border-[#e6dece]">
          <button
            type="button"
            className={`flex-1 py-2 text-sm transition-colors ${
              isLogin
                ? "text-[#8C6D3F] border-b-2 border-[#8C6D3F]"
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm transition-colors ${
              !isLogin
                ? "text-[#8C6D3F] border-b-2 border-[#8C6D3F]"
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <input
                name="first_name"
                placeholder="First name"
                value={form.first_name}
                onChange={change}
                className="field-input"
              />
              <input
                name="last_name"
                placeholder="Last name"
                value={form.last_name}
                onChange={change}
                className="field-input"
              />
            </div>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={change}
            required
            className="field-input"
          />

          {!isLogin && (
            <input
              name="abhyasi_id"
              placeholder="Abhyasi ID (optional)"
              value={form.abhyasi_id}
              onChange={change}
              className="field-input"
            />
          )}

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password (min 8)"
              value={form.password}
              onChange={change}
              required
              minLength={8}
              className="field-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C6D3F]"
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <p className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: "linear-gradient(to right, #C5A065, #8C6D3F)",
            }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}

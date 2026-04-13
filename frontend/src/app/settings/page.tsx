"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  Lock, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from "lucide-react";
import { changePassword } from "@/lib/api";
import { getUser } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const user = getUser();
  
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setStatus({ type: "error", message: "Passwords do not match" });
      return;
    }
    if (newPw.length < 8) {
      setStatus({ type: "error", message: "New password must be at least 8 characters" });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      await changePassword(currentPw, newPw);
      setStatus({ type: "success", message: "Password updated successfully" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to update password";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF5] relative overflow-hidden font-sans text-[#4A3E2E]">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#F0E4C7] rounded-full blur-[120px] opacity-40" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E6DECE] rounded-full blur-[120px] opacity-40" />
      <div className="paper-pattern absolute inset-0 opacity-10 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <header className="flex items-center justify-between mb-12">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-[#8C6D3F] hover:text-[#5c4d37] transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-white border border-[#e6dece] flex items-center justify-center group-hover:bg-[#F0E4C7] transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Back</span>
          </button>
          
          <div className="text-right">
            <h1 className="text-2xl font-serif text-[#8C6D3F] flex items-center gap-2 justify-end">
              <SettingsIcon className="w-6 h-6" />
              Settings
            </h1>
            <p className="text-[10px] text-[#b7ad92] uppercase tracking-[0.2em] mt-1">Manage your account</p>
          </div>
        </header>

        <main className="space-y-8">
          {/* Profile Section */}
          <section className="bg-white/80 backdrop-blur-md border border-[#e6dece] rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#F0E4C7] flex items-center justify-center text-[#8C6D3F]">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-serif text-[#8C6D3F]">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-sm text-[#b7ad92]">{user?.email}</p>
                {user?.is_admin && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-[#8C6D3F] text-white text-[10px] font-bold rounded uppercase tracking-wider">
                    Administrator
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#FDFBF5] p-3 rounded-xl border border-[#e6dece]/50">
                <p className="text-[#b7ad92] uppercase tracking-wider mb-1">Abhyasi ID</p>
                <p className="font-medium">{user?.abhyasi_id || "Not provided"}</p>
              </div>
              <div className="bg-[#FDFBF5] p-3 rounded-xl border border-[#e6dece]/50">
                <p className="text-[#b7ad92] uppercase tracking-wider mb-1">Joined</p>
                <p className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</p>
              </div>
            </div>
          </section>

          {/* Security / Password Section */}
          <section className="bg-white/80 backdrop-blur-md border border-[#e6dece] rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#FDFBF5] border border-[#e6dece] flex items-center justify-center text-[#8C6D3F]">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-serif text-[#8C6D3F]">Security</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#b7ad92] uppercase tracking-wider mb-2 ml-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FDFBF5] border border-[#e6dece] focus:ring-2 focus:ring-[#8C6D3F]/20 focus:border-[#8C6D3F] transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#b7ad92] uppercase tracking-wider mb-2 ml-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#FDFBF5] border border-[#e6dece] focus:ring-2 focus:ring-[#8C6D3F]/20 focus:border-[#8C6D3F] transition-all outline-none"
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#b7ad92] uppercase tracking-wider mb-2 ml-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#FDFBF5] border border-[#e6dece] focus:ring-2 focus:ring-[#8C6D3F]/20 focus:border-[#8C6D3F] transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {status && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
                  status.type === "success" 
                    ? "bg-green-50 border-green-100 text-green-700" 
                    : "bg-red-50 border-red-100 text-red-700"
                }`}>
                  {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <p className="text-sm font-medium">{status.message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-[#8C6D3F] text-white font-bold hover:bg-[#5c4d37] disabled:bg-[#b7ad92] transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

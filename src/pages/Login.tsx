import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/Inventa/api";

type LoginStep = "login" | "otp-login" | "forgot-email" | "forgot-otp" | "forgot-newpass";

export default function Login() {
  const navigate = useNavigate();
  const [loginStep, setLoginStep] = useState<LoginStep>("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP Login fields
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = `${API_BASE}/users/login-jwt`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
      }

      const data = await res.json();
      const user = data.user;
      const token = data.token as string | undefined;
      if (!user || !token) {
        throw new Error("Invalid login response");
      }

      const userRole = (user.role || "").toUpperCase();
      const auth = btoa(`${email}:${password}`);
      localStorage.setItem("user", JSON.stringify({ ...user, auth, token }));

      if (userRole === "MANAGER") {
        navigate("/manager-dashboard");
      } else if (userRole === "STAFF") {
        navigate("/staff-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = `${API_BASE}/users/login-jwt`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, password: otp }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "OTP login failed");
      }

      const data = await res.json();
      const user = data.user;
      const token = data.token as string | undefined;
      if (!user || !token) {
        throw new Error("Invalid login response");
      }

      const userRole = (user.role || "").toUpperCase();
      const auth = btoa(`${otpEmail}:${otp}`);
      localStorage.setItem("user", JSON.stringify({ ...user, auth, token, isFirstLogin: true }));

      if (userRole === "MANAGER") {
        navigate("/manager-dashboard");
      } else if (userRole === "STAFF") {
        navigate("/staff-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "OTP login failed. Please check your email and OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/email/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to send OTP");
      setLoginStep("forgot-otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/email/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to reset password");
      setSuccessMsg("Password reset successfully! You can now login.");
      setLoginStep("login");
      setForgotEmail(""); setForgotOtp(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-fixed min-h-screen flex flex-col relative w-full overflow-x-hidden">
      {/* Top Navigation Anchor */}
      <header className="w-full transition-all duration-300">
        <div className="flex justify-between items-center w-full px-6 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>inventory_2</span>
            <h1 className="text-2xl font-bold tracking-tighter text-on-surface">Ventorie</h1>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 pb-12 z-10 relative">
        <div className="w-full max-w-[1200px] grid lg:grid-cols-2 gap-12 items-center">
          {/* Branding Column */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-4">
              <span className="inline-flex px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold tracking-widest uppercase">System 4.0</span>
              <h2 className="text-5xl font-medium tracking-tight text-on-surface leading-[1.1]">Inventory for the Modern Enterprise.</h2>
              <p className="text-on-surface-variant text-lg max-w-md">Precision analytics meets architectural design. Access your global vitals with a single secure entry.</p>
            </div>
            <div className="p-8 rounded-xl surface-container-lowest long-tail-shadow max-w-sm relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-7xl">analytics</span>
              </div>
              <div className="relative z-10">
                <p className="text-on-surface-variant text-sm font-medium mb-1">Global Throughput</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tighter text-on-surface">94.2k</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold">+12%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="surface-container-lowest p-10 rounded-xl long-tail-shadow bg-white">

              {/* ── LOGIN STEP ── */}
              {loginStep === "login" && (
                <>
                  <div className="mb-10">
                    <h3 className="text-2xl font-semibold text-on-surface mb-2">Welcome Back</h3>
                    <p className="text-on-surface-variant text-sm">Please enter your credentials to access the workspace.</p>
                  </div>
                  {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 text-xs rounded-lg font-semibold">{successMsg}</div>}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full bg-surface-container-low border-none focus:ring-0 focus:border-primary px-4 py-3.5 rounded-lg text-on-surface text-sm outline-none transition-all"
                        placeholder="name@company.com" />
                    </div>
                    <div className="space-y-2 relative">
                      <div className="flex justify-between items-center px-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Password</label>
                        <button type="button" onClick={() => { setLoginStep("forgot-email"); setError(null); setSuccessMsg(null); }}
                          className="text-[11px] font-bold uppercase tracking-wider text-primary hover:text-on-primary-fixed-variant transition-colors">
                          Forgot?
                        </button>
                      </div>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                        className="w-full bg-surface-container-low border-none focus:ring-0 focus:border-primary px-4 py-3.5 rounded-lg text-on-surface text-sm outline-none transition-all"
                        placeholder="••••••••" />
                    </div>
                    {error && <div className="text-error text-xs px-1">{error}</div>}
                    <button type="submit" disabled={loading}
                      className="w-full py-4 neon-gradient-btn rounded-xl text-on-primary-fixed font-bold tracking-tight text-base hover:shadow-lg hover:shadow-primary/20 transform active:scale-[0.98] transition-all duration-200">
                      {loading ? "Signing In..." : "Sign In"}
                    </button>
                    <button type="button" onClick={() => { setLoginStep("otp-login"); setError(null); }}
                      className="w-full py-2 text-sm text-primary hover:text-on-primary-fixed-variant transition-colors font-semibold">
                      Login with OTP
                    </button>
                  </form>
                  <p className="mt-10 text-center text-sm text-on-surface-variant">
                    Don't have an account? <Link className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1" to="/register">Request Access</Link>
                  </p>
                </>
              )}

              {/* ── OTP LOGIN STEP ── */}
              {loginStep === "otp-login" && (
                <>
                  <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-on-surface mb-2">Login with OTP</h3>
                    <p className="text-on-surface-variant text-sm">Enter your email and the OTP sent to you.</p>
                  </div>
                  <form onSubmit={handleOtpLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">Email Address</label>
                      <input type="email" value={otpEmail} onChange={e => setOtpEmail(e.target.value)} required
                        className="w-full bg-surface-container-low border-none focus:ring-0 focus:border-primary px-4 py-3.5 rounded-lg text-on-surface text-sm outline-none transition-all"
                        placeholder="name@company.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">OTP (6 digits)</label>
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required maxLength={6}
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary px-4 py-4 rounded-lg text-on-surface text-center text-2xl font-black tracking-[0.5em] outline-none transition-all"
                        placeholder="000000" />
                    </div>
                    {error && <div className="text-error text-xs px-1">{error}</div>}
                    <button type="submit" disabled={loading}
                      className="w-full py-4 neon-gradient-btn rounded-xl text-on-primary-fixed font-bold text-base active:scale-[0.98] transition-all">
                      {loading ? "Logging In..." : "Login with OTP"}
                    </button>
                    <button type="button" onClick={() => { setLoginStep("login"); setError(null); }}
                      className="w-full py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">← Back to login</button>
                  </form>
                </>
              )}

              {/* ── FORGOT: ENTER EMAIL ── */}
              {loginStep === "forgot-email" && (
                <>
                  <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-on-surface mb-2">Reset Password</h3>
                    <p className="text-on-surface-variant text-sm">Enter your email and we'll send you an OTP.</p>
                  </div>
                  <form onSubmit={handleForgotSendOtp} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">Email Address</label>
                      <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                        className="w-full bg-surface-container-low border-none focus:ring-0 focus:border-primary px-4 py-3.5 rounded-lg text-on-surface text-sm outline-none transition-all"
                        placeholder="name@company.com" />
                    </div>
                    {error && <div className="text-error text-xs px-1">{error}</div>}
                    <button type="submit" disabled={loading}
                      className="w-full py-4 neon-gradient-btn rounded-xl text-on-primary-fixed font-bold text-base active:scale-[0.98] transition-all">
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </button>
                    <button type="button" onClick={() => { setLoginStep("login"); setError(null); }}
                      className="w-full py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">← Back to login</button>
                  </form>
                </>
              )}

              {/* ── FORGOT: VERIFY OTP & SET PASSWORD ── */}
              {loginStep === "forgot-otp" && (
                <>
                  <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-on-surface mb-2">Reset Password</h3>
                    <p className="text-on-surface-variant text-sm">Enter the OTP sent to <strong>{forgotEmail}</strong> and your new password.</p>
                  </div>
                  <form onSubmit={handleForgotVerifyOtp} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">OTP (6 digits)</label>
                      <input type="text" value={forgotOtp} onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required maxLength={6}
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary px-4 py-4 rounded-lg text-on-surface text-center text-2xl font-black tracking-[0.5em] outline-none transition-all"
                        placeholder="000000" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">New Password</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                        className="w-full bg-surface-container-low border-none focus:ring-0 focus:border-primary px-4 py-3.5 rounded-lg text-on-surface text-sm outline-none transition-all"
                        placeholder="Min 8 chars, upper, lower, number, special" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-1">Confirm Password</label>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                        className="w-full bg-surface-container-low border-none focus:ring-0 focus:border-primary px-4 py-3.5 rounded-lg text-on-surface text-sm outline-none transition-all"
                        placeholder="••••••••" />
                    </div>
                    {error && <div className="text-error text-xs px-1">{error}</div>}
                    <button type="submit" disabled={loading}
                      className="w-full py-4 neon-gradient-btn rounded-xl text-on-primary-fixed font-bold text-base active:scale-[0.98] transition-all">
                      {loading ? "Updating..." : "Update Password"}
                    </button>
                    <button type="button" onClick={() => { setLoginStep("forgot-email"); setError(null); }}
                      className="w-full py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">← Back</button>
                  </form>
                </>
              )}

            </div>
          </div>
        </div>
      </main>

      <footer className="w-full mt-auto z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 py-8 max-w-7xl mx-auto space-y-4 md:space-y-0">
          <p className="font-['Inter'] text-sm tracking-normal text-neutral-500">© 2024 Ventorie. Kinetic Inventory Management.</p>
          <div className="flex gap-8">
            <a className="font-['Inter'] text-sm tracking-normal text-neutral-500 hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="font-['Inter'] text-sm tracking-normal text-neutral-500 hover:text-primary transition-colors" href="#">Terms</a>
            <a className="font-['Inter'] text-sm tracking-normal text-neutral-500 hover:text-primary transition-colors" href="#">Support</a>
          </div>
        </div>
      </footer>

      <div className="absolute inset-0 w-full h-full -z-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary-container/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-surface-container-high/30 blur-[100px]"></div>
      </div>
    </div>
  );
}

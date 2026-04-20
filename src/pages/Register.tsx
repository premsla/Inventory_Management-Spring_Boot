import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/Inventa/api";

type Step = "form" | "otp";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [password, setPassword] = useState("");

  // OTP
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: send OTP
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be 8+ characters"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/email/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to send OTP");
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP then create account
  const handleVerifyAndRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Verify OTP
      const verifyRes = await fetch(`${API_BASE}/email/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      if (!verifyRes.ok) throw new Error(await verifyRes.text() || "Invalid OTP");

      // Create business
      const businessRes = await fetch(`${API_BASE}/business`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: businessName || `${fullName}'s Business`,
          ownerName: fullName,
          location: businessLocation || "Not specified",
        }),
      });
      if (!businessRes.ok) throw new Error(await businessRes.text() || "Failed to create business");
      const business = await businessRes.json();

      // Register owner
      const ownerRes = await fetch(`${API_BASE}/users/register-owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, phone, password, businessId: business.id }),
      });
      if (!ownerRes.ok) throw new Error(await ownerRes.text() || "Registration failed");

      alert("Account created successfully! Please login.");
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col w-full overflow-hidden">
      <main className="flex-grow flex flex-col md:flex-row min-h-screen">
        {/* Left branding panel */}
        <section className="hidden md:flex md:w-5/12 bg-inverse-surface relative overflow-hidden p-12 flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-primary-fixed mb-12">
              <span className="material-symbols-outlined text-4xl">inventory_2</span>
              <span className="text-3xl font-semibold tracking-tighter text-white">Ventorie</span>
            </div>
            <h1 className="text-5xl font-medium text-white tracking-tight leading-tight max-w-md">
              Inventory <span className="text-primary-fixed italic font-light">management</span> for modern enterprise.
            </h1>
          </div>
          <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBIDbPneuRpXxkJJNMueVbAnoP7UcGrjFuC_DmYOyCwSUdk8yom_uf-ztvvTktYdR5wL_M7A0M-NRsB9ioGwYY08wAgTQIIi5eMypTqOs1N76LKj6bHyo56XD8WGh2ahrNzbaEazbNkcdlssZboKk94z_MZhZZx0mu9HyaA-08ZZjk2QTjJ4iUeTT4QC9J8JR3gnPbBhWpTXyuif31TdEvrYhhjVYxoYnrGN1rJnaJCOtUZZwMfr9KoA3OyzsvXoc83QHCQ66xFw8" alt="" />
          </div>
        </section>

        {/* Right form panel */}
        <section className="flex-grow w-full md:w-7/12 overflow-y-auto bg-surface p-6 md:p-12 lg:p-24 flex flex-col justify-center items-center">
          <div className="max-w-md w-full my-auto">

            {step === "form" ? (
              <>
                <header className="mb-10">
                  <h2 className="text-3xl font-medium tracking-tight text-on-surface mb-2">Create Account</h2>
                  <p className="text-on-surface-variant">Join the next generation of logistics intelligence.</p>
                </header>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Full Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                      className="w-full px-4 py-3 bg-surface-container-low rounded-t-lg text-on-surface placeholder:text-outline/50 border-b border-transparent focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="Alex Sterling" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full px-4 py-3 bg-surface-container-low rounded-t-lg text-on-surface placeholder:text-outline/50 border-b border-transparent focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="alex@enterprise.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Phone</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container-low rounded-t-lg text-on-surface placeholder:text-outline/50 border-b border-transparent focus:border-primary focus:ring-0 outline-none transition-colors"
                        placeholder="9876543210" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Business Name</label>
                      <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required
                        className="w-full px-4 py-3 bg-surface-container-low rounded-t-lg text-on-surface placeholder:text-outline/50 border-b border-transparent focus:border-primary focus:ring-0 outline-none transition-colors"
                        placeholder="e.g. KFC Group" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Business Location</label>
                    <input type="text" value={businessLocation} onChange={e => setBusinessLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-t-lg text-on-surface placeholder:text-outline/50 border-b border-transparent focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="e.g. Chennai" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full px-4 py-3 bg-surface-container-low rounded-t-lg text-on-surface placeholder:text-outline/50 border-b border-transparent focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="Min 8 chars, upper, lower, number, special" />
                  </div>
                  {error && <p className="text-error text-xs">{error}</p>}
                  <div className="pt-4">
                    <button type="submit" disabled={loading}
                      className="w-full neon-gradient py-4 rounded-xl text-on-primary-fixed font-bold text-lg hover:shadow-lg transition-all active:scale-[0.98]">
                      {loading ? "Sending OTP..." : "Send Verification OTP"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <header className="mb-10">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl text-primary">mark_email_read</span>
                  </div>
                  <h2 className="text-3xl font-medium tracking-tight text-on-surface mb-2">Verify Your Email</h2>
                  <p className="text-on-surface-variant">
                    We sent a 6-digit OTP to <strong>{email}</strong>. Enter it below to complete registration.
                  </p>
                </header>

                <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">Enter OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      required
                      maxLength={6}
                      className="w-full px-4 py-4 bg-surface-container-low rounded-xl text-on-surface text-center text-2xl font-black tracking-[0.5em] border-2 border-transparent focus:border-primary focus:ring-0 outline-none transition-colors"
                      placeholder="000000"
                    />
                  </div>
                  {error && <p className="text-error text-xs">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full neon-gradient py-4 rounded-xl text-on-primary-fixed font-bold text-lg hover:shadow-lg transition-all active:scale-[0.98]">
                    {loading ? "Creating Account..." : "Verify & Create Account"}
                  </button>
                  <button type="button" onClick={() => { setStep("form"); setError(null); }}
                    className="w-full py-3 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                    ← Back to edit details
                  </button>
                </form>
              </>
            )}

            <footer className="text-center pt-8">
              <p className="text-on-surface-variant">
                Already have an account? <Link className="text-primary font-semibold hover:underline ml-1" to="/">Login here</Link>
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}

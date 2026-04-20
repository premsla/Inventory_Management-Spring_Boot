import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (u: any) => u?.token ? `Bearer ${u.token}` : `Basic ${u.auth}`;

export default function Profile() {
    const navigate = useNavigate();
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    if (!user) { navigate("/"); return null; }

    const roleLabel = user.role === "OWNER"
        ? "Enterprise Owner"
        : user.role === "MANAGER"
            ? "Branch Manager"
            : "Staff";

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/email/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getAuthHeader(user),
                },
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to change password.");
                return;
            }

            setSuccess("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Update stored auth with new password and clear first login flag
            const newAuth = btoa(`${user.email}:${newPassword}`);
            const updatedUser = { ...user, auth: newAuth, isFirstLogin: false };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Refresh page after 1 second
            setTimeout(() => window.location.reload(), 1000);
        } catch (err: any) {
            setError(err.message || "Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex font-['Inter'] antialiased">
            <Sidebar />

            <main className="ml-64 flex-grow min-h-screen px-8 py-12">
                <div className="max-w-2xl mx-auto space-y-8">

                    {/* First-Time Login Prompt */}
                    {user.isFirstLogin && (
                        <div className="bg-gradient-to-r from-[#c5fe3c]/20 to-[#496400]/10 border-2 border-[#c5fe3c] rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-[#c5fe3c] rounded-xl shrink-0">
                                    <span className="material-symbols-outlined text-[#364b00] text-2xl">info</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-[#364b00] mb-1">Welcome! Set Your Password</h3>
                                    <p className="text-sm text-[#496400] mb-4">
                                        This is your first login. Please set a strong password below to secure your account.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/5">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-[#0c0f10] flex items-center justify-center text-[#c5fe3c] font-black text-3xl shrink-0">
                                {(user.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-[#0c0f10]">{user.name}</h1>
                                <p className="text-sm text-[#595c5e] mt-0.5">{user.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-black bg-[#c5fe3c]/20 text-[#496400] px-3 py-1 rounded-full uppercase tracking-widest">
                                        {roleLabel}
                                    </span>
                                    {user.branch?.name && (
                                        <span className="text-[10px] font-bold bg-[#eff1f3] text-[#595c5e] px-3 py-1 rounded-full">
                                            {user.branch.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-black/5">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#abadaf] mb-1">Phone</p>
                                <p className="text-sm font-semibold text-[#0c0f10]">{user.phone || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#abadaf] mb-1">Business</p>
                                <p className="text-sm font-semibold text-[#0c0f10]">{user.business?.name || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/5">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-[#c5fe3c]/20 rounded-xl">
                                <span className="material-symbols-outlined text-[#496400]">lock_reset</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight text-[#0c0f10]">Change Password</h2>
                                <p className="text-xs text-[#595c5e]">Update your account password</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-5">
                            {/* Current Password */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#595c5e] mb-1.5">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                        className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none pr-12"
                                        placeholder="Enter current password"
                                    />
                                    <button type="button" onClick={() => setShowCurrent(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#595c5e] hover:text-[#0c0f10]">
                                        <span className="material-symbols-outlined text-lg">
                                            {showCurrent ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#595c5e] mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none pr-12"
                                        placeholder="Min 8 characters, upper, lower, number, special"
                                    />
                                    <button type="button" onClick={() => setShowNew(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#595c5e] hover:text-[#0c0f10]">
                                        <span className="material-symbols-outlined text-lg">
                                            {showNew ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#595c5e] mb-1.5">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                                    placeholder="Re-enter new password"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-xs font-semibold">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-xs font-semibold">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-[#c5fe3c] text-[#364b00] font-black rounded-xl text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-[0_4px_14px_0_rgba(197,254,60,0.3)]"
                            >
                                {loading ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
}

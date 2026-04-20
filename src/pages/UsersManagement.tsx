import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) =>
    user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface BranchUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
}

interface Branch {
    id: number;
    name: string;
    location: string;
}

interface BranchWithUsers extends Branch {
    managers: BranchUser[];
    staff: BranchUser[];
    loading: boolean;
}

export default function UsersManagement() {
    const navigate = useNavigate();
    const [branches, setBranches] = useState<BranchWithUsers[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedBranch, setExpandedBranch] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addRole, setAddRole] = useState<"MANAGER" | "STAFF">("MANAGER");
    const [addBranchId, setAddBranchId] = useState<number | null>(null);
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (!userStr) { navigate("/"); return; }
        fetchBranches();
    }, [navigate]);

    const fetchBranches = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const res = await fetch(`${API_BASE}/branches/my`, {
                headers: { Authorization: getAuthHeader(user) },
            });
            if (!res.ok) return;
            const data: Branch[] = await res.json();
            const withUsers: BranchWithUsers[] = data.map((b) => ({
                ...b,
                managers: [],
                staff: [],
                loading: false,
            }));
            setBranches(withUsers);
            // auto-expand first branch
            if (withUsers.length > 0) {
                setExpandedBranch(withUsers[0].id);
                fetchBranchUsers(withUsers[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch branches", err);
        }
    };

    const fetchBranchUsers = async (branchId: number) => {
        setBranches((prev) =>
            prev.map((b) => (b.id === branchId ? { ...b, loading: true } : b))
        );
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const res = await fetch(`${API_BASE}/users/branch/${branchId}`, {
                headers: { Authorization: getAuthHeader(user) },
            });
            if (res.ok) {
                const data = await res.json();
                setBranches((prev) =>
                    prev.map((b) =>
                        b.id === branchId
                            ? {
                                ...b,
                                managers: data.managers || [],
                                staff: data.staff || [],
                                loading: false,
                            }
                            : b
                    )
                );
            }
        } catch (err) {
            console.error("Failed to fetch branch users", err);
        } finally {
            setBranches((prev) =>
                prev.map((b) => (b.id === branchId ? { ...b, loading: false } : b))
            );
        }
    };

    const handleToggleBranch = (branchId: number) => {
        if (expandedBranch === branchId) {
            setExpandedBranch(null);
        } else {
            setExpandedBranch(branchId);
            const branch = branches.find((b) => b.id === branchId);
            if (branch && branch.managers.length === 0 && branch.staff.length === 0) {
                fetchBranchUsers(branchId);
            }
        }
    };

    const openAddModal = (branchId: number, role: "MANAGER" | "STAFF") => {
        setAddBranchId(branchId);
        setAddRole(role);
        setFormName("");
        setFormEmail("");
        setFormPhone("");
        setFormPassword("");
        setFormError(null);
        setShowAddModal(true);
    };

    const handleAddUser = async () => {
        if (!formName || !formEmail || !formPhone || !formPassword) {
            setFormError("All fields are required.");
            return;
        }
        setIsSubmitting(true);
        setFormError(null);
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const endpoint =
                addRole === "MANAGER"
                    ? `${API_BASE}/users/create-manager`
                    : `${API_BASE}/users/create-staff`;

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getAuthHeader(user),
                },
                body: JSON.stringify({
                    name: formName,
                    email: formEmail,
                    phone: formPhone,
                    password: formPassword,
                    branchId: addBranchId,
                    businessId: user.business?.id,
                }),
            });

            if (res.ok) {
                setShowAddModal(false);
                if (addBranchId) fetchBranchUsers(addBranchId);
            } else {
                const msg = await res.text();
                setFormError(msg || "Failed to create user.");
            }
        } catch (err: any) {
            setFormError(err.message || "Network error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalManagers = branches.reduce((s, b) => s + b.managers.length, 0);
    const totalStaff = branches.reduce((s, b) => s + b.staff.length, 0);

    const filteredBranches = branches.filter(
        (b) =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.managers.some((m) =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) ||
            b.staff.some((s) =>
                s.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
    );

    return (
        <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex font-['Inter'] antialiased">
            <Sidebar />

            <main className="ml-64 flex-grow min-h-screen">
                <Header
                    title="Users"
                    subtitle="Team Management"
                    searchPlaceholder="Search users or branches..."
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                <div className="pt-24 px-8 pb-12 space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-[#c5fe3c]/20 rounded-xl">
                                    <span className="material-symbols-outlined text-[#496400]">store</span>
                                </div>
                                <span className="text-[10px] font-bold bg-[#eff1f3] px-2 py-1 rounded-full text-[#595c5e] uppercase tracking-widest">
                                    Branches
                                </span>
                            </div>
                            <p className="text-[#595c5e] text-sm font-medium">Total Branches</p>
                            <h3 className="text-3xl font-black tracking-tighter mt-1">{branches.length}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <span className="material-symbols-outlined text-blue-600">manage_accounts</span>
                                </div>
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-widest">
                                    Managers
                                </span>
                            </div>
                            <p className="text-[#595c5e] text-sm font-medium">Total Managers</p>
                            <h3 className="text-3xl font-black tracking-tighter mt-1">{totalManagers}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <span className="material-symbols-outlined text-purple-600">group</span>
                                </div>
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full uppercase tracking-widest">
                                    Staff
                                </span>
                            </div>
                            <p className="text-[#595c5e] text-sm font-medium">Total Staff</p>
                            <h3 className="text-3xl font-black tracking-tighter mt-1">{totalStaff}</h3>
                        </div>
                    </div>

                    {/* Branch User Accordion */}
                    <div className="space-y-4">
                        {filteredBranches.length === 0 ? (
                            <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
                                <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">group_off</span>
                                <p className="text-slate-400 font-semibold">No branches found.</p>
                            </div>
                        ) : (
                            filteredBranches.map((branch) => (
                                <div
                                    key={branch.id}
                                    className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden"
                                >
                                    {/* Branch Header Row */}
                                    <button
                                        onClick={() => handleToggleBranch(branch.id)}
                                        className="w-full flex items-center justify-between px-8 py-5 hover:bg-[#f5f6f8] transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-[#0c0f10] flex items-center justify-center text-[#c5fe3c] font-black text-sm">
                                                {branch.name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-black text-[#0c0f10] tracking-tight">{branch.name}</p>
                                                <p className="text-[11px] text-[#595c5e] flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                    {branch.location}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3 text-[11px] font-bold text-[#595c5e]">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                                                    {branch.managers.length} Mgr
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                                                    {branch.staff.length} Staff
                                                </span>
                                            </div>
                                            <span
                                                className={`material-symbols-outlined text-[#595c5e] transition-transform duration-300 ${expandedBranch === branch.id ? "rotate-180" : ""
                                                    }`}
                                            >
                                                expand_more
                                            </span>
                                        </div>
                                    </button>

                                    {/* Expanded User List */}
                                    {expandedBranch === branch.id && (
                                        <div className="border-t border-black/5 px-8 py-6 space-y-6">
                                            {branch.loading ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="w-6 h-6 border-2 border-[#c5fe3c] border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="ml-3 text-sm text-[#595c5e]">Loading team...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Managers Section */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                                                                Managers ({branch.managers.length})
                                                            </p>
                                                            <button
                                                                onClick={() => openAddModal(branch.id, "MANAGER")}
                                                                className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">add</span>
                                                                Add Manager
                                                            </button>
                                                        </div>
                                                        {branch.managers.length === 0 ? (
                                                            <p className="text-xs text-[#abadaf] italic py-2">No managers assigned to this branch.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {branch.managers.map((m) => (
                                                                    <UserCard key={m.id} user={m} color="blue" />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Staff Section */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">
                                                                Staff ({branch.staff.length})
                                                            </p>
                                                            <button
                                                                onClick={() => openAddModal(branch.id, "STAFF")}
                                                                className="flex items-center gap-1 text-[10px] font-black text-purple-600 hover:underline uppercase tracking-widest"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">add</span>
                                                                Add Staff
                                                            </button>
                                                        </div>
                                                        {branch.staff.length === 0 ? (
                                                            <p className="text-xs text-[#abadaf] italic py-2">No staff assigned to this branch.</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {branch.staff.map((s) => (
                                                                    <UserCard key={s.id} user={s} color="purple" />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="bg-[#0c0f10] px-8 py-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-white font-black text-lg tracking-tight">
                                    Add {addRole === "MANAGER" ? "Manager" : "Staff"}
                                </h2>
                                <p className="text-white/40 text-xs mt-0.5">
                                    Assign to {branches.find((b) => b.id === addBranchId)?.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-white/50 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Full Name</label>
                                <input
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                                    placeholder="e.g., Ravi Kumar"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                                    placeholder="name@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Phone (10–15 digits)</label>
                                <input
                                    type="tel"
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                                    placeholder="9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Password</label>
                                <input
                                    type="password"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                                    placeholder="Min 8 chars, upper, lower, number, special"
                                />
                            </div>
                            {formError && (
                                <p className="text-red-500 text-xs font-semibold">{formError}</p>
                            )}
                        </div>

                        <div className="px-8 pb-8 flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-3 rounded-xl border border-black/10 text-sm font-semibold hover:bg-[#eff1f3] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl bg-[#c5fe3c] text-[#364b00] text-sm font-black shadow-[0_4px_14px_0_rgba(197,254,60,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? "Creating..." : `Add ${addRole === "MANAGER" ? "Manager" : "Staff"}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UserCard({ user, color }: { user: BranchUser; color: "blue" | "purple" }) {
    const colorMap = {
        blue: {
            bg: "bg-blue-50",
            avatar: "bg-blue-600 text-white",
            badge: "bg-blue-100 text-blue-700",
        },
        purple: {
            bg: "bg-purple-50",
            avatar: "bg-purple-600 text-white",
            badge: "bg-purple-100 text-purple-700",
        },
    };
    const c = colorMap[color];

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${c.bg} border border-black/5`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${c.avatar}`}>
                {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#0c0f10] truncate">{user.name}</p>
                <p className="text-[11px] text-[#595c5e] truncate">{user.email}</p>
                <p className="text-[10px] text-[#abadaf]">{user.phone}</p>
            </div>
            <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest shrink-0 ${c.badge}`}>
                {user.role}
            </span>
        </div>
    );
}

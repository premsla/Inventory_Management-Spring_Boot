import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) => user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface User {
  id: number;
  name: string;
  role: string;
}

interface Branch {
  id: number;
  name: string;
  location: string;
  managerName?: string;
  totalInventory?: number;
  status?: string;
}

export default function BranchManagement() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState<"MANAGER" | "STAFF" | null>(null);

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form State
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [staffIds, setStaffIds] = useState<number[]>([]);

  const fetchBranches = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.business || !user.business.id) return;
      const res = await fetch(`${API_BASE}/branches/business/${user.business.id}`, {
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (err) {
      console.error("Fetch branches error", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.auth && !user.token) return;

      const res = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Fetch users error", err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/");
      return;
    }
    fetchBranches();
    fetchUsers();
  }, [navigate]);

  const handleSaveBranch = async () => {
    if (!branchName || !branchLocation) {
      alert("Name and Location are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.business || !user.business.id) return;

      const payload = {
        name: branchName,
        location: branchLocation,
        businessId: user.business.id,
        managerId: managerId ? Number(managerId) : null,
        staffIds: staffIds
      };

      const url = editingBranch ? `${API_BASE}/branches/${editingBranch.id}` : `${API_BASE}/branches`;
      const method = editingBranch ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", 'Authorization': getAuthHeader(user) },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingBranch(null);
        fetchBranches();
        setBranchName("");
        setBranchLocation("");
        setManagerId("");
        setStaffIds([]);
        setShowAddUserForm(null);
      } else {
        alert("Failed to persist system node.");
      }
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchLocation(branch.location);
    setManagerId("");
    setStaffIds([]);
    setShowAddModal(true);
  };

  const handleDeleteBranch = async (id: number) => {
    if (!window.confirm("Are you sure you want to decommission this facility?")) return;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/branches/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) fetchBranches();
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  const toggleStaff = (id: number) => {
    setStaffIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex font-['Inter'] antialiased">
      <Sidebar />
      <div className="flex-grow ml-64 min-h-screen flex flex-col relative">
        <Header title="Branch Management" subtitle="Administrative Node" searchPlaceholder="Search operational facilities..." icon="folder_shared" />

        <main className="pt-24 px-8 pb-8 space-y-12">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[#595c5e] text-xs font-black tracking-widest uppercase mb-1">Regional Network</p>
              <h3 className="text-3xl font-black tracking-tighter text-[#0c0f10] uppercase">Network Overview</h3>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#c5fe3c] text-[#364b00] px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-[#c5fe3c]/20 uppercase tracking-tight text-xs"
            >
              <span className="material-symbols-outlined font-black text-sm">add</span> Add Branch
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {branches.map(branch => (
              <div key={branch.id} className="bg-white rounded-[40px] p-8 relative overflow-hidden flex flex-col justify-between min-h-[350px] shadow-[0px_24px_48px_rgba(44,47,49,0.06)] border border-black/5 hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-8">
                  <span className="bg-[#eff1f3] text-[#595c5e] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{branch.status || "Operational"}</span>
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1 tracking-tighter uppercase leading-none">{branch.name}</h4>
                  <p className="text-[#595c5e] mb-8 flex items-center gap-2 font-bold italic opacity-80 text-xs text-[11px]">
                    <span className="material-symbols-outlined text-[14px]">location_on</span> {branch.location}
                  </p>

                  <div className="flex gap-10 mt-6">
                    <div>
                      <p className="text-[#abadaf] text-[9px] font-black uppercase tracking-widest mb-2">Facility Lead</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#eff1f3] flex items-center justify-center font-black text-[#496400] text-lg shadow-inner border border-black/5">
                          {branch.name.charAt(0)}
                        </div>
                        <span className="font-black text-sm text-[#0c0f10] uppercase tracking-tighter">{branch.managerName || "Unassigned"}</span>
                      </div>
                    </div>
                    <div className="flex-1 max-w-[180px]">
                      <p className="text-[#abadaf] text-[9px] font-black uppercase tracking-widest mb-3">Inventory Level</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-grow h-2 bg-[#f5f6f8] rounded-full overflow-hidden">
                          <div className="bg-[#c5fe3c] h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(Math.round(((branch.totalInventory || 0) / 10000) * 100), 100)}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-[#0c0f10]">{Math.min(Math.round(((branch.totalInventory || 0) / 10000) * 100), 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => navigate(`/branch-inventory/${branch.id}`)}
                    className="bg-[#c5fe3c] hover:bg-black hover:text-[#c5fe3c] text-[#364b00] font-black px-6 py-2.5 rounded-xl transition-all uppercase text-[9px] tracking-widest shadow-sm"
                  >
                    View Inventory
                  </button>
                  <button onClick={() => handleEditBranch(branch)} className="bg-[#f5f6f8] hover:bg-black hover:text-white text-[#0c0f10] font-black p-2.5 rounded-xl transition-all shadow-sm"><span className="material-symbols-outlined text-sm">edit</span></button>
                  <button onClick={() => handleDeleteBranch(branch.id)} className="bg-[#f5f6f8] hover:bg-error hover:text-white text-[#0c0f10] font-black p-2.5 rounded-xl transition-all shadow-sm"><span className="material-symbols-outlined text-sm">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end p-0 bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-[500px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden font-['Inter']">
              <div className="p-8 border-b border-black/5 flex justify-between items-center bg-[#f5f6f8]/30">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none text-[#0c0f10]">{editingBranch ? "Edit Node" : "Activate Node"}</h3>
                  <p className="text-[10px] font-bold text-[#595c5e] italic mt-1 uppercase tracking-widest">{editingBranch ? "Structural Matrix Update" : "Global Matrix Expansion"}</p>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingBranch(null); setShowAddUserForm(null); }} className="p-2 hover:bg-[#eff1f3] rounded-xl transition-all">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="flex-grow overflow-y-auto no-scrollbar p-8 pt-10 space-y-12">
                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#496400] px-1 opacity-70">Core Facility Metadata</p>
                  <div className="space-y-4">
                    <input type="text" placeholder="Unique Branch Designation" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="w-full bg-[#f5f6f8] px-6 py-5 rounded-[24px] font-black text-sm text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none uppercase placeholder:text-[#abadaf]" />
                    <input type="text" placeholder="Geographic Coordinates / Location" value={branchLocation} onChange={(e) => setBranchLocation(e.target.value)} className="w-full bg-[#f5f6f8] px-6 py-5 rounded-[24px] font-black text-sm text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none italic placeholder:text-[#abadaf]" />
                  </div>
                </div>

                {/* Manager Selection */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#496400] opacity-70">Facility Lead (Manager)</p>
                    <button onClick={() => setShowAddUserForm(showAddUserForm === "MANAGER" ? null : "MANAGER")} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">{showAddUserForm === "MANAGER" ? "Cancel Quick Add" : "+ Register Manager"}</button>
                  </div>
                  {showAddUserForm === "MANAGER" ? (
                    <QuickAddUserForm role="MANAGER" API_BASE={API_BASE} onCreated={(u) => { setUsers([...users, u]); setManagerId(String(u.id)); setShowAddUserForm(null); }} />
                  ) : (
                    <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full bg-[#f5f6f8] px-6 py-5 rounded-[24px] font-black text-sm text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none uppercase appearance-none cursor-pointer">
                      <option value="">Matrix: Unassigned Lead</option>
                      {users.filter(u => u.role === "MANAGER").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  )}
                </div>

                {/* Staff Selection */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#496400] opacity-70">Logistic Personnel (Staff)</p>
                    <button onClick={() => setShowAddUserForm(showAddUserForm === "STAFF" ? null : "STAFF")} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">{showAddUserForm === "STAFF" ? "Cancel Quick Add" : "+ Register Staff"}</button>
                  </div>
                  {showAddUserForm === "STAFF" ? (
                    <QuickAddUserForm role="STAFF" API_BASE={API_BASE} onCreated={(u) => { setUsers([...users, u]); setStaffIds([...staffIds, u.id]); setShowAddUserForm(null); }} />
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                      {users.filter(u => u.role === "STAFF").map(u => (
                        <div key={u.id} onClick={() => toggleStaff(u.id)} className={`p-4 rounded-[20px] border-2 transition-all cursor-pointer flex items-center justify-between group ${staffIds.includes(u.id) ? "bg-[#c5fe3c]/10 border-[#c5fe3c] shadow-lg shadow-[#c5fe3c]/10" : "bg-[#f5f6f8] border-transparent hover:border-[#abadaf]/20"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${staffIds.includes(u.id) ? "bg-black text-[#c5fe3c]" : "bg-white text-[#595c5e]"}`}>{u.name.charAt(0)}</div>
                            <span className="font-black uppercase text-[11px] text-[#0c0f10]">{u.name}</span>
                          </div>
                          <span className={`material-symbols-outlined text-sm ${staffIds.includes(u.id) ? "text-[#496400]" : "text-[#abadaf] opacity-20"}`}>{staffIds.includes(u.id) ? "check_circle" : "add_circle"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-black/5 bg-white space-y-4">
                <button onClick={handleSaveBranch} disabled={isSubmitting || !!showAddUserForm} className="w-full py-5 bg-black text-[#c5fe3c] font-black rounded-[24px] shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-[11px]">
                  {isSubmitting ? "Orchestrating..." : editingBranch ? "Update System Node" : "Finalize Activation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAddUserForm({ role, API_BASE, onCreated }: { role: "MANAGER" | "STAFF"; API_BASE: string; onCreated: (u: User) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !email || !phone) return alert("All fields required");
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/users/create-${role.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", 'Authorization': getAuthHeader(user) },
        body: JSON.stringify({ name, email, phone })
      });
      if (res.ok) onCreated(await res.json());
      else {
        const message = await res.text();
        alert(message || "Registration failed. Data anomaly detected.");
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-200/50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">Identity Registration: {role}</p>
      <div className="space-y-3">
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white px-5 py-4 rounded-2xl font-bold text-xs text-[#0c0f10] border-none focus:ring-2 focus:ring-blue-400 outline-none uppercase" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white px-5 py-4 rounded-2xl font-bold text-xs text-[#0c0f10] border-none focus:ring-2 focus:ring-blue-400 outline-none" />
        <input type="tel" placeholder="Phone (10-15 digits)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white px-5 py-4 rounded-2xl font-bold text-xs text-[#0c0f10] border-none focus:ring-2 focus:ring-blue-400 outline-none" />
      </div>
      <p className="text-[10px] text-blue-700/80 font-semibold px-1">
        An OTP will be sent to the email address for first-time login. Password can be set after login.
      </p>
      <button onClick={handleCreate} disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg">{loading ? "Authenticating..." : "Register Identity"}</button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) => user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface Branch {
  id: number;
  name: string;
  location?: string;
}

interface OrderBillRow {
  id: number;
  productName: string;
  totalAmount: number;
  quantity: number;
  createdAt: string;
  customer?: { name?: string; phone?: string };
  order?: { id?: number; branchId?: number };
}

export default function WarehouseOrders() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [bills, setBills] = useState<OrderBillRow[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingBills, setLoadingBills] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/");
      return;
    }
    const user = JSON.parse(userStr);
    if (!user.auth && !user.token) {
      navigate("/");
      return;
    }

    const loadBranches = async () => {
      setLoadingBranches(true);
      try {
        const businessId = user.business?.id;
        if (!businessId) {
          setBranches([]);
          return;
        }
        const res = await fetch(`${API_BASE}/branches/business/${businessId}`, {
          headers: { Authorization: getAuthHeader(user) },
        });
        if (res.ok) {
          const data: Branch[] = await res.json();
          setBranches(data);
          if (data.length > 0) setSelectedBranchId(data[0].id);
        }
      } catch (e) {
        console.error("Failed to load branches", e);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [navigate]);

  useEffect(() => {
    if (selectedBranchId == null) {
      setBills([]);
      return;
    }
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    const loadBills = async () => {
      setLoadingBills(true);
      try {
        const res = await fetch(`${API_BASE}/bills/branch/${selectedBranchId}`, {
          headers: { Authorization: getAuthHeader(user) },
        });
        if (res.ok) {
          const data = await res.json();
          setBills(Array.isArray(data) ? data : []);
        } else {
          setBills([]);
        }
      } catch (e) {
        console.error("Failed to load branch bills", e);
        setBills([]);
      } finally {
        setLoadingBills(false);
      }
    };

    loadBills();
  }, [selectedBranchId]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const filtered = bills.filter((b) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (b.productName || "").toLowerCase().includes(q) ||
      (b.customer?.name || "").toLowerCase().includes(q) ||
      String(b.id).includes(q) ||
      String(b.order?.id || "").includes(q)
    );
  });

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex font-['Inter'] antialiased">
      <Sidebar />

      <main className="ml-64 flex-grow min-h-screen relative flex flex-col">
        <Header
          title="Branch order history"
          subtitle={selectedBranch ? selectedBranch.name : "Select a branch"}
          searchPlaceholder="Search orders, customer, product..."
          icon="receipt_long"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="pt-24 px-8 pb-8 space-y-8 flex-grow">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-3xl font-black text-[#0c0f10] tracking-tighter mb-1 uppercase">Orders by branch</h2>
              <p className="text-[#595c5e] font-medium text-sm">
                Choose a branch to view its customer order and billing history.
              </p>
            </div>

            {loadingBranches ? (
              <p className="text-sm text-[#abadaf]">Loading branches...</p>
            ) : branches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
                <p className="text-[#595c5e] font-medium">No branches found. Add branches under Branch management.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {branches.map((b, index) => {
                  const active = selectedBranchId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`px-6 py-3 rounded-xl text-sm font-bold transition-all border shadow-sm ${
                        active
                          ? "bg-[#0c0f10] text-[#c5fe3c] border-[#0c0f10]"
                          : "bg-white text-[#0c0f10] border-black/5 hover:border-[#c5fe3c]/50"
                      }`}
                    >
                      {b.name || `Branch ${index + 1}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-[0px_24px_48px_rgba(44,47,49,0.06)] border border-black/5">
            <div className="px-8 py-5 border-b border-black/5 bg-[#f5f6f8]/70 flex justify-between items-center flex-wrap gap-2">
              <p className="text-[10px] font-black text-[#abadaf] uppercase tracking-widest">
                {selectedBranch ? `${selectedBranch.name} — history` : "Orders"}
              </p>
              <span className="text-xs font-bold text-[#595c5e]">
                {loadingBills ? "Loading…" : `${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {loadingBills ? (
              <div className="p-16 text-center text-[#abadaf] text-sm">Loading orders…</div>
            ) : selectedBranchId == null ? (
              <div className="p-16 text-center text-[#abadaf] text-sm">Select a branch.</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <span className="material-symbols-outlined text-4xl text-[#abadaf] opacity-30 block mb-2">receipt_long</span>
                <p className="text-[#595c5e] font-semibold">No orders for this branch yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-[#f5f6f8]/70">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Bill</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Order</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Product</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Qty</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Total</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-[#eff1f3]/40 transition-colors">
                        <td className="px-8 py-5 text-sm font-black text-[#0c0f10]">#{row.id}</td>
                        <td className="px-6 py-5 text-sm font-bold text-[#496400]">#{row.order?.id ?? "—"}</td>
                        <td className="px-6 py-5 text-sm font-semibold text-[#0c0f10]">{row.productName}</td>
                        <td className="px-6 py-5 text-sm">{row.quantity}</td>
                        <td className="px-6 py-5 text-sm text-[#595c5e]">
                          <span className="font-medium text-[#0c0f10]">{row.customer?.name || "—"}</span>
                          {row.customer?.phone && (
                            <span className="block text-xs text-[#abadaf]">{row.customer.phone}</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right text-sm font-black text-[#0c0f10]">
                          ₹{Number(row.totalAmount).toFixed(2)}
                        </td>
                        <td className="px-8 py-5 text-right text-xs font-medium text-[#595c5e] whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

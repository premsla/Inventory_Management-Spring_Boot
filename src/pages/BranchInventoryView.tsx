import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) => user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface BranchIngredient {
  id: number;
  ingredientName: string;
  quantity: number;
  threshold: number;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  status?: string;
}

export default function BranchInventoryView() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const [branchName, setBranchName] = useState<string>("");
  const [branchLocation, setBranchLocation] = useState<string>("");
  const [items, setItems] = useState<BranchIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const idNum = branchId ? Number(branchId) : NaN;

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/");
      return;
    }
    if (!branchId || Number.isNaN(idNum)) {
      navigate("/branches");
      return;
    }

    const user = JSON.parse(userStr);
    if (!user.auth && !user.token) {
      navigate("/");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [branchRes, invRes] = await Promise.all([
          fetch(`${API_BASE}/branches/${idNum}`, {
            headers: { Authorization: getAuthHeader(user) },
          }),
          fetch(`${API_BASE}/branch-inventory/branch/${idNum}`, {
            headers: { Authorization: getAuthHeader(user) },
          }),
        ]);

        if (branchRes.ok) {
          const b = await branchRes.json();
          setBranchName(b.name || `Branch #${idNum}`);
          setBranchLocation(b.location || "");
        } else {
          setBranchName(`Branch #${idNum}`);
        }

        if (invRes.ok) {
          const data = await invRes.json();
          setItems(Array.isArray(data) ? data : []);
        } else {
          setItems([]);
        }
      } catch (e) {
        console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [branchId, idNum, navigate]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        (i.ingredientName || "").toLowerCase().includes(q) ||
        (i.batchNumber || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex font-['Inter'] antialiased">
      <Sidebar />
      <main className="ml-64 flex-grow min-h-screen flex flex-col">
        <Header
          title={branchName || "Branch inventory"}
          subtitle={branchLocation ? `${branchLocation} · Ingredient stock` : "Ingredient stock at this branch"}
          searchPlaceholder="Search ingredients..."
          icon="inventory_2"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="pt-24 px-8 pb-8 space-y-8 flex-grow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/branches"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#496400] hover:text-[#0c0f10] transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to branches
            </Link>
            <div className="text-right">
              <p className="text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Total units (this branch)</p>
              <p className="text-2xl font-black text-[#0c0f10] tracking-tighter">
                {Math.round(totalQty).toLocaleString()} <span className="text-sm font-medium text-[#595c5e]">units</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-[0px_24px_48px_rgba(44,47,49,0.06)] border border-black/5">
            {loading ? (
              <div className="p-16 text-center text-[#abadaf] text-sm font-medium">Loading inventory…</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <span className="material-symbols-outlined text-4xl text-[#abadaf] opacity-30 block mb-2">inventory_2</span>
                <p className="text-[#595c5e] font-semibold">
                  {items.length === 0 ? "No ingredients in this branch yet." : "No matching ingredients."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-[#f5f6f8]/70">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Ingredient</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Quantity</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Unit</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Threshold</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest">Batch / expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filtered.map((row) => {
                      const low =
                        row.threshold != null &&
                        row.quantity != null &&
                        row.quantity <= row.threshold;
                      return (
                        <tr key={row.id} className="hover:bg-[#eff1f3]/40 transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-bold text-[#0c0f10] capitalize">{row.ingredientName}</p>
                            <p className="text-[11px] text-[#abadaf]">#{row.id}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`font-black ${low ? "text-error" : "text-[#0c0f10]"}`}>
                              {row.quantity != null ? row.quantity : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-sm font-medium text-[#595c5e]">{row.unit || "—"}</td>
                          <td className="px-6 py-5 text-sm font-medium text-[#595c5e]">
                            {row.threshold != null ? row.threshold : "—"}
                          </td>
                          <td className="px-8 py-5 text-sm text-[#595c5e]">
                            <span className="block">{row.batchNumber || "—"}</span>
                            {row.expiryDate && (
                              <span className="text-xs text-[#abadaf]">{row.expiryDate}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

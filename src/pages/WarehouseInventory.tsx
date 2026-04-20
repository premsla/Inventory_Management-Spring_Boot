import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) => user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface WarehouseInventoryItem {
  id: number;
  ingredientName: string;
  quantity: number;
  pricePerUnit?: number;
  threshold: number;
  unit: string;
  batchNumber: string;
  expiryDate: string;
  status: string;
}

export default function WarehouseInventory() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<WarehouseInventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formQty, setFormQty] = useState(0);
  const [formPricePerUnit, setFormPricePerUnit] = useState(0);
  const [formBatch, setFormBatch] = useState("");
  const [formExpiry, setFormExpiry] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formThreshold, setFormThreshold] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Notification Hub State
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [showLowStock, setShowLowStock] = useState(false);

  const fetchInventory = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/warehouse/inventory`, {
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/alerts/owner/open`, {
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        const data = await res.json();
        setLowStockAlerts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch low stock alerts", err);
    }
  };

  const fetchWarehouse = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/warehouse`, {
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setWarehouseId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch warehouse", err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/");
      return;
    }
    fetchInventory();
    fetchWarehouse();
    fetchLowStockAlerts();
  }, [navigate]);

  const handleSaveBatch = async () => {
    if (!formName || !formBatch || !formExpiry || !warehouseId) {
      alert("Please fill all required fields correctly.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const payload = {
        id: editingId,
        ingredientName: formName,
        quantity: formQty,
        pricePerUnit: formPricePerUnit,
        unit: formUnit,
        batchNumber: formBatch,
        expiryDate: formExpiry,
        threshold: formThreshold,
        warehouseId: warehouseId,
        status: "ACTIVE"
      };

      const res = await fetch(`${API_BASE}/warehouse/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': getAuthHeader(user)
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowSidebar(false);
        fetchInventory();
        // Clear form
        setFormName("");
        setFormQty(0);
        setFormBatch("");
        setFormExpiry("");
        setFormPricePerUnit(0);
        setFormThreshold(10);
        setEditingId(null);
      } else {
        alert("Failed to save batch. Check console for details.");
      }
    } catch (err) {
      console.error("Save error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: WarehouseInventoryItem) => {
    setEditingId(item.id);
    setFormName(item.ingredientName);
    setFormQty(item.quantity);
    setFormThreshold(item.threshold);
    setFormPricePerUnit(item.pricePerUnit || 0);
    setFormUnit(item.unit);
    setFormBatch(item.batchNumber);
    setFormExpiry(item.expiryDate);
    setShowSidebar(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this batch from the warehouse?")) return;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/warehouse/inventory/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        fetchInventory();
      } else {
        alert("Delete failed.");
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  return (
    <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex font-['Inter'] antialiased">
      <Sidebar />

      <main className="ml-64 flex-grow min-h-screen relative flex flex-col">
        <Header
          title="Warehouse Inventory"
          subtitle="Logistics Matrix"
          searchPlaceholder="Search batches..."
          icon="warehouse"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        >
          <div className="flex items-center gap-6">
            {/* Low stock alerts — warehouse + branches */}
            <div className="relative">
              {(() => {
                const today = new Date();
                const warehouseLow = inventory.filter(item => {
                  const exp = item.expiryDate ? new Date(item.expiryDate) : null;
                  return item.quantity <= item.threshold || (exp && exp < today);
                }).map(item => ({
                  key: `wh-${item.id}`,
                  ingredientName: item.ingredientName,
                  currentQuantity: item.quantity,
                  threshold: item.threshold,
                  source: "Warehouse",
                  expired: !!(item.expiryDate && new Date(item.expiryDate) < today),
                }));
                const allLow = [...warehouseLow];
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowLowStock(v => !v)}
                      className="relative p-2.5 bg-white border border-[#abadaf]/10 rounded-xl hover:bg-[#eff1f3] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[#0c0f10] text-[22px]">warning</span>
                      {allLow.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-error text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                          {allLow.length}
                        </span>
                      )}
                    </button>

                    {showLowStock && (
                      <div className="absolute right-0 mt-4 w-[340px] bg-white rounded-2xl shadow-2xl border border-black/5 z-[100] overflow-hidden">
                        <div className="p-4 bg-[#f5f6f8] border-b border-black/5 flex justify-between items-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0c0f10]">Low Stock Alerts</p>
                          <span className="text-[10px] font-bold text-error">{allLow.length} Items</span>
                        </div>
                        <div className="max-h-[380px] overflow-y-auto no-scrollbar divide-y divide-black/5">
                          {allLow.length === 0 ? (
                            <div className="p-10 text-center">
                              <span className="material-symbols-outlined text-[40px] text-[#abadaf] opacity-20 block mb-2">check_circle</span>
                              <p className="text-xs font-bold text-[#abadaf]">All stock levels are healthy</p>
                            </div>
                          ) : (
                            allLow.map((a) => (
                              <div key={a.key} className="p-4 hover:bg-[#eff1f3]/50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-sm font-black text-[#0c0f10] uppercase tracking-tighter capitalize">{a.ingredientName}</p>
                                  <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full ${a.expired ? "bg-red-600" : "bg-error"}`}>
                                    {a.expired ? "EXPIRED" : "LOW"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`material-symbols-outlined text-[12px] ${a.source === "Warehouse" ? "text-[#496400]" : "text-blue-500"}`}>
                                    {a.source === "Warehouse" ? "warehouse" : "store"}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#595c5e]">{a.source}</span>
                                  <span className="text-[10px] text-[#abadaf]">•</span>
                                  <span className="text-[10px] font-bold text-[#595c5e]">
                                    Qty: <span className="text-[#0c0f10]">{a.currentQuantity}</span> / {a.threshold}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-3 bg-white border-t border-black/5 text-center">
                          <button
                            type="button"
                            onClick={() => { setShowLowStock(false); navigate("/dashboard"); }}
                            className="text-[10px] font-black text-[#0c0f10] uppercase tracking-widest hover:text-[#496400] transition-colors"
                          >
                            View dashboard alerts
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="h-10 w-px bg-black/5 hidden md:block"></div>

            <div className="flex items-center gap-2 px-4 py-2 bg-[#eff1f3] border border-[#abadaf]/10 rounded-xl">
              <span className="material-symbols-outlined text-[#496400] text-lg">warehouse</span>
              <p className="text-sm font-bold tracking-tight text-[#0c0f10]">Global Hub v1.0</p>
            </div>
          </div>
        </Header>

        {/* pt-24 clears fixed Header (h-16 + breathing room), same as Dashboard / other owner pages */}
        <div className="pt-24 px-8 pb-8 space-y-8 flex-grow">
          {/* Page Header & Actions */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-4xl font-black text-[#0c0f10] tracking-tighter mb-2 uppercase">Global Hub Inventory</h2>
              <p className="text-[#595c5e] font-medium italic">Monitoring {inventory.length} active batches in structural matrix. Data live from central hub.</p>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-white text-[#0c0f10] font-bold rounded-xl border border-black/5 hover:bg-[#eff1f3] transition-colors flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">file_download</span>
                Export Matrix
              </button>
              <button
                onClick={() => {
                  setShowSidebar(true);
                  setEditingId(null);
                  setFormName("");
                  setFormQty(0);
                  setFormBatch("");
                  setFormExpiry("");
                  setFormPricePerUnit(0);
                  setFormThreshold(10);
                }}
                className="px-8 py-3 bg-black text-[#c5fe3c] font-black rounded-xl shadow-2xl hover:scale-105 transition-all flex items-center gap-2 uppercase tracking-wider text-xs"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                New Batch entry
              </button>
            </div>
          </div>

          {/* Bento Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-[0px_24px_48px_rgba(0,0,0,0.04)] border-l-4 border-[#496400] hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-[#c5fe3c]/20 rounded-xl">
                  <span className="material-symbols-outlined text-[#496400]">payments</span>
                </div>
                <span className="text-[10px] font-bold bg-[#eff1f3] px-2 py-1 rounded-full text-[#595c5e] tracking-widest uppercase">Value</span>
              </div>
              <p className="text-[#595c5e] text-sm font-medium mb-1">Warehouse Value</p>
              <h3 className="text-3xl font-black tracking-tighter">
                ₹{inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0).toLocaleString()}
              </h3>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[#496400] text-xs font-bold">Qty × Price/unit</span>
                <span className="text-[#595c5e] text-[10px] font-medium italic">Global Hub</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-[0px_24px_48px_rgba(0,0,0,0.04)] border-l-4 border-error hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-error/10 rounded-xl">
                  <span className="material-symbols-outlined text-error">warning</span>
                </div>
                <span className="text-[10px] font-bold bg-error text-white px-2 py-1 rounded-full tracking-widest uppercase">Alerts</span>
              </div>
              <p className="text-[#595c5e] text-sm font-medium mb-1">Low Stock Batches</p>
              <h3 className="text-3xl font-black tracking-tighter">
                {inventory.filter(item => {
                  const today = new Date();
                  const expireDate = item.expiryDate ? new Date(item.expiryDate) : null;
                  const isExpired = !!(expireDate && expireDate < today);
                  return isExpired || item.quantity <= item.threshold;
                }).length.toLocaleString()}{" "}
                <span className="text-sm font-medium text-[#595c5e]">Items</span>
              </h3>
              <p className="mt-4 text-[#595c5e] text-[10px] font-medium leading-tight italic">Immediate restock required.</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-4 bg-[#eff1f3] p-4 rounded-2xl border border-black/5">
            <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-black/5 hover:border-[#c5fe3c] transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[#595c5e] text-sm">ac_unit</span>
              <span className="text-sm font-bold">All Storage Zones</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-black/5 hover:border-[#c5fe3c] transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[#595c5e] text-sm">schedule</span>
              <span className="text-sm font-bold">Sort: Expiry (Soonest)</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-black/5 hover:border-[#c5fe3c] transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[#595c5e] text-sm">category</span>
              <span className="text-sm font-bold">Category: All</span>
            </div>
            <div className="ml-auto">
              <p className="text-[10px] text-[#595c5e] font-black uppercase tracking-[0.15em]">Live Hub Forensic: {inventory.length} Batches</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-[0px_24px_48px_rgba(44,47,49,0.06)] border border-black/5">
            <table className="w-full border-collapse">
              <thead className="bg-[#f5f6f8]/70">
                <tr>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest whitespace-nowrap">Ingredient / ID</th>
                  <th className="px-6 py-6 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest whitespace-nowrap">Current Level</th>
                  <th className="px-6 py-6 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest whitespace-nowrap">Expiry Risk</th>
                  <th className="px-6 py-6 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest whitespace-nowrap">Usage Rate</th>
                  <th className="px-6 py-6 text-left text-[10px] font-black text-[#abadaf] uppercase tracking-widest whitespace-nowrap">New Stock</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black text-[#abadaf] uppercase tracking-widest whitespace-nowrap">Branch Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {inventory.filter(item => item.ingredientName?.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => {
                  const today = new Date();
                  const expireDate = item.expiryDate ? new Date(item.expiryDate) : null;
                  const isExpired = !!(expireDate && expireDate < today);
                  const daysToExpiry = expireDate ? Math.ceil((expireDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : 999;
                  const isCritical = daysToExpiry >= 0 && daysToExpiry <= 3;
                  const isLow = (item.quantity <= item.threshold) || isExpired;
                  const usageRate = Math.floor(Math.random() * 90) + 10;

                  return (
                    <tr key={item.id} className="group hover:bg-[#eff1f3]/30 transition-all duration-300">
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-xl bg-[#0c0f10] p-0.5 flex items-center justify-center shadow-lg relative overflow-hidden">
                            <div className={`absolute inset-0 ${isExpired ? "bg-red-500/10" : "bg-blue-500/10"} blur-xl`}></div>
                            {isExpired && (
                              <div className="absolute top-0 right-0 bg-[#c5fe3c] text-black text-[7px] font-black px-1 py-0.5 rounded-bl-md z-20 shadow-sm uppercase tracking-tighter">New</div>
                            )}
                            <span className={`material-symbols-outlined ${isExpired ? "text-error" : "text-white/20"} text-3xl font-light leading-none`}>
                              {isExpired ? "gpp_maybe" : "inventory_2"}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-[#0c0f10] text-[1.1rem] leading-tight mb-1">{item.ingredientName}</p>
                            <p className="text-[11px] font-medium text-[#abadaf] leading-none uppercase tracking-tighter">#{item.batchNumber}</p>
                            <p className="text-[11px] font-medium text-[#abadaf] leading-none uppercase tracking-tighter">(Global Hub)</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-8">
                        <div className="flex items-center gap-2">
                          <p className={`text-[1.1rem] font-bold ${isCritical || isExpired ? "text-[#b02500]" : "text-blue-600"}`}>
                            {item.quantity.toLocaleString()} {item.unit || "units"}
                          </p>
                          <span className={`material-symbols-outlined text-lg font-black ${isLow || isExpired ? "text-error" : "text-[#496400] text-opacity-80"}`}>
                            {isLow || isExpired ? "trending_down" : "trending_up"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-8">
                        {isExpired ? (
                          <div className="flex flex-col">
                            <span className="text-[1.1rem] font-bold text-[#b02500]">Expired</span>
                            <span className="text-[10px] font-black uppercase text-[#b02500] tracking-tighter leading-none mt-1">Hazardous batch</span>
                          </div>
                        ) : isCritical ? (
                          <div className="flex flex-col">
                            <span className="text-[1.1rem] font-bold text-[#b02500]">Critical ({daysToExpiry}d)</span>
                            <span className="text-[10px] font-black uppercase text-[#b02500] tracking-tighter leading-none mt-1">Mark for Discount</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[1.1rem] font-bold text-[#0c0f10]">Low Risk</span>
                            <span className="text-[10px] font-black uppercase text-[#abadaf] tracking-tighter leading-none mt-1">Stable</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-8">
                        <div className="flex items-center gap-8">
                          <span className="text-xs font-bold text-[#0c0f10] min-w-[50px]">{usageRate}% / day</span>
                          <div className="w-20 h-1.5 bg-[#eff1f3] rounded-full overflow-hidden shadow-inner flex-shrink-0">
                            <div className={`h-full ${isExpired ? "bg-black/20" : "bg-[#3e5200]"} rounded-full transition-all duration-1000`} style={{ width: `${usageRate}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-8">
                        {isLow || isExpired ? (
                          <button
                            onClick={() => {
                              setFormName(item.ingredientName);
                              setShowSidebar(true);
                            }}
                            className="px-5 py-2.5 bg-[#0c0f10] text-[#c5fe3c] text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg border border-[#c5fe3c]/20"
                          >
                            Add New Stock
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-[#abadaf] uppercase tracking-tighter opacity-30">Replenished</span>
                        )}
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity duration-300">
                          <button onClick={() => handleEdit(item)} className="p-2 text-blue-500 hover:text-blue-700 transition-all rounded-lg hover:bg-blue-50">
                            <span className="material-symbols-outlined text-[22px] leading-none">edit</span>
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-error hover:text-red-700 transition-all rounded-lg hover:bg-red-50">
                            <span className="material-symbols-outlined text-[22px] leading-none">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="px-10 py-6 bg-white flex items-center justify-between border-t border-black/5">
              <p className="text-xs text-[#abadaf] font-medium tracking-tight">Page 1 of {Math.ceil(inventory.length / 10)} batches for Global Hub</p>
              <div className="flex gap-4">
                <button className="p-2.5 hover:bg-[#eff1f3] text-[#0c0f10] rounded-xl transition-all border border-transparent hover:border-black/5">
                  <span className="material-symbols-outlined text-2xl leading-none">chevron_left</span>
                </button>
                <button className="p-2.5 hover:bg-[#eff1f3] text-[#0c0f10] rounded-xl transition-all border border-transparent hover:border-black/5">
                  <span className="material-symbols-outlined text-2xl leading-none">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* New Batch Entry Centered Card Modal */}
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center transition-all duration-500 ${showSidebar ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
            }`}
        >
          <div
            className={`bg-white w-full max-w-[550px] rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] transform transition-all duration-500 overflow-hidden relative ${showSidebar ? "scale-100 translate-y-0" : "scale-90 translate-y-10"
              }`}
          >
            {/* Glossy Background Accent */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-[#c5fe3c]/20 to-transparent -z-0 opacity-50"></div>

            <div className="p-10 space-y-8 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter uppercase mb-1">
                    {inventory.some(i => i.ingredientName?.toLowerCase() === formName.toLowerCase()) ? "Update Batch" : "New Batch Entry"}
                  </h3>
                  <p className="text-[12px] font-medium text-[#595c5e] italic">
                    {inventory.some(i => i.ingredientName?.toLowerCase() === formName.toLowerCase())
                      ? "Detected duplicate ingredient. This will update the existing stock level."
                      : "Integrate fresh logistic assets into the central matrix."}
                  </p>
                </div>
                <button onClick={() => { setShowSidebar(false); setEditingId(null); }} className="p-3 hover:bg-[#eff1f3] rounded-2xl transition-colors group">
                  <span className="material-symbols-outlined text-[#0c0f10] group-hover:rotate-90 transition-transform text-2xl">close</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#496400] px-1 opacity-80 group-focus-within:opacity-100 transition-opacity flex justify-between">
                    Batch Identifier Name
                    {inventory.some(i => i.ingredientName?.toLowerCase() === formName.toLowerCase()) && (
                      <span className="text-[#0c0f10] font-black animate-pulse flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span> DUPLICATE DETECTED
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. tomato"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={`w-full bg-[#eff1f3] px-6 py-5 rounded-2xl font-bold text-base text-[#0c0f10] border-2 ${inventory.some(i => i.ingredientName?.toLowerCase() === formName.toLowerCase()) ? "border-[#c5fe3c]" : "border-transparent"} focus:ring-4 focus:ring-[#c5fe3c]/30 focus:border-[#c5fe3c]/50 transition-all outline-none uppercase placeholder:text-[#abadaf]/50`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#496400] px-1 opacity-80">Quantity Inflow</label>
                    <input
                      type="number"
                      value={formQty || ""}
                      onChange={(e) => setFormQty(Number(e.target.value))}
                      className="w-full bg-[#eff1f3] px-6 py-5 rounded-2xl font-black text-xl text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#496400] px-1 opacity-80">Standard Unit</label>
                    <div className="relative">
                      <select
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        className="w-full bg-[#eff1f3] px-6 py-5 rounded-2xl font-bold text-base text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none uppercase appearance-none"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="liter">liter</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                        <option value="pieces">pieces</option>
                        <option value="pack">pack</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#abadaf] pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#496400] px-1 opacity-80">Price Per Unit</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formPricePerUnit || ""}
                    onChange={(e) => setFormPricePerUnit(Number(e.target.value))}
                    className="w-full bg-[#eff1f3] px-6 py-5 rounded-2xl font-black text-xl text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#496400] px-1 opacity-80">Forensic ID (Batch)</label>
                    <input
                      type="text"
                      placeholder="B-2024-OX"
                      value={formBatch}
                      onChange={(e) => setFormBatch(e.target.value)}
                      className="w-full bg-[#eff1f3] px-6 py-5 rounded-2xl font-bold text-base text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none uppercase placeholder:text-[#abadaf]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#496400] px-1 opacity-80">Expiry Analysis</label>
                    <input
                      type="date"
                      value={formExpiry}
                      onChange={(e) => setFormExpiry(e.target.value)}
                      className="w-full bg-[#eff1f3] px-6 py-5 rounded-2xl font-bold text-base text-[#0c0f10] border-none focus:ring-4 focus:ring-[#c5fe3c]/50 transition-all outline-none dark:color-scheme-light"
                    />
                  </div>
                </div>

                <div className="p-8 bg-[#c5fe3c]/10 rounded-[32px] border-2 border-[#c5fe3c]/20 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#496400] opacity-80">Safety Stock Threshold</label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={formQty || 100}
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-black/10 rounded-full appearance-none cursor-pointer accent-[#0c0f10] mb-5"
                  />
                  <div className="flex justify-between items-baseline">
                    <p className="text-3xl font-black text-[#0c0f10] tracking-tighter">{formThreshold} <span className="text-sm font-medium text-[#595c5e] uppercase">Units</span></p>
                    <p className="text-[10px] font-bold text-[#595c5e] italic opacity-70">Automatic alert trigger for global hub</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveBatch}
                  disabled={isSubmitting}
                  className="w-full py-6 bg-[#0c0f10] text-[#c5fe3c] font-black rounded-[28px] shadow-2xl hover:scale-[1.03] active:scale-[0.97] hover:shadow-[#c5fe3c]/20 transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Orchestrating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">
                        {inventory.some(i => i.ingredientName?.toLowerCase() === formName.toLowerCase()) ? "update" : "data_saver_on"}
                      </span>
                      {inventory.some(i => i.ingredientName?.toLowerCase() === formName.toLowerCase()) ? "Commit Stock Update" : "Add New Batch"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

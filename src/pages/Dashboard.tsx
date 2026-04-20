import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) => user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface DashboardData {
  warehouseName: string;
  totalProducts: number;
  warehouseStock: number;
  totalBranchInventoryUnits: number;
  totalInventoryUnits: number;
  estimatedInventoryCost: number;
  warehouseInventoryCost?: number;
  branchInventoryCost?: number;
  inventoryCount: number;
  outOfStockCount: number;
  lowStockCount: number;
  expiringCount: number;
  totalBranches: number;
  totalUsers: number;
  foodWastage: number;
  totalProfit: number;
  todayProfit: number;
  profitGrowth: number;
  overallPercentage: number;
  recentActivity: any[];
  stockLevels: any[];
  orderSummary: any[];
  profitByCategory: any[];
  recentOrders?: any[];
  lowStockItems?: any[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | string>("");
  const [selectedBranchName, setSelectedBranchName] = useState("All Branches");
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState("Premalatha");
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/");
      return;
    }

    const user = JSON.parse(userStr);
    setUserName(user.name || "Premalatha");

    if (!user.auth) {
      navigate("/");
      return;
    }

    const fetchBranches = async () => {
      try {
        const res = await fetch(`${API_BASE}/branches/my`, {
          headers: { 'Authorization': getAuthHeader(user) }
        });
        if (res.ok) {
          const rows = await res.json();
          setBranches(Array.isArray(rows) ? rows : []);
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      }
    };

    const fetchStats = async () => {
      try {
        const url = selectedBranchId
          ? `${API_BASE}/dashboard/stats?branchId=${selectedBranchId}&period=${chartPeriod}`
          : `${API_BASE}/dashboard/stats?period=${chartPeriod}`;

        const res = await fetch(url, {
          headers: {
            'Authorization': getAuthHeader(user)
          }
        });
        if (res.ok) {
          const stats = await res.json();
          setData(stats);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchPendingRequests = async () => {
      try {
        const url = selectedBranchId
          ? `${API_BASE}/stock-requests/pending?branchId=${selectedBranchId}`
          : `${API_BASE}/stock-requests/pending`;
        const res = await fetch(url, {
          headers: { 'Authorization': getAuthHeader(user) }
        });
        if (res.ok) setPendingRequests(await res.json());
      } catch (err) {
        console.error("Failed to fetch pending requests", err);
      }
    };

    fetchBranches();
    fetchStats();
    fetchPendingRequests();

    const interval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [navigate, selectedBranchId, chartPeriod]);

  const handleApprove = async (id: number) => {
    setActioningId(id);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await fetch(`${API_BASE}/stock-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: getAuthHeader(user) },
        body: JSON.stringify({}),
      });
      setPendingRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
    finally { setActioningId(null); }
  };

  const handleReject = async (id: number) => {
    setActioningId(id);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await fetch(`${API_BASE}/stock-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: getAuthHeader(user) },
        body: JSON.stringify({}),
      });
      setPendingRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
    finally { setActioningId(null); }
  };

  if (loading) {
    return (
      <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C6FF3D] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold tracking-widest uppercase opacity-50">Enterprise Syncing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex">
      <Sidebar />

      <main className="ml-64 flex-1 min-h-screen relative">
        <Header
          title="Dashboard"
          subtitle="Enterprise Overview"
        >
          {/* Notification Bell — Stock Requests */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="p-2 text-slate-500 hover:bg-slate-200/50 rounded-lg transition-colors relative"
            >
              <span className="material-symbols-outlined">notifications</span>
              {pendingRequests.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-slate-50 animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-[380px] bg-white rounded-2xl shadow-2xl border border-black/5 z-[200] overflow-hidden">
                {/* Panel header */}
                <div className="px-5 py-4 bg-slate-950 flex justify-between items-center">
                  <div>
                    <p className="text-white font-black text-sm tracking-tight">Stock Requests</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{pendingRequests.length} pending approval</p>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                {/* Request list */}
                <div className="max-h-[420px] overflow-y-auto divide-y divide-black/5">
                  {pendingRequests.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                      <p className="text-xs font-bold">No pending requests</p>
                    </div>
                  ) : (
                    pendingRequests.map((req: any) => (
                      <div key={req.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-slate-900 capitalize truncate">
                              {req.ingredientName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="material-symbols-outlined text-[12px] text-slate-400">store</span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {req.branch?.name || `Branch #${req.branchId}`}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                            Pending
                          </span>
                        </div>

                        {/* Details row */}
                        <div className="flex items-center gap-4 mb-3 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                            {req.quantity} {req.unit}
                          </span>
                          {req.requestedBy?.name && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">person</span>
                              {req.requestedBy.name}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actioningId === req.id}
                            className="flex-1 py-2 bg-[#C6FF3D] text-[#364b00] text-[10px] font-black rounded-lg uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            {actioningId === req.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actioningId === req.id}
                            className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            {actioningId === req.id ? "..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {pendingRequests.length > 0 && (
                  <div className="px-5 py-3 border-t border-black/5 bg-slate-50 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">
                      After approval, branch manager must confirm receipt to update inventory.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Header>

        {/* Content Canvas */}
        <div className="pt-24 px-8 pb-12">
          {/* Welcome Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface">Welcome {userName}</h2>
              <p className="text-on-surface-variant font-medium">
                Enterprise Overview • {selectedBranchName === "All Branches" ? `Real-time across all ${data?.totalBranches || 0} branches` : `Viewing ${selectedBranchName}`}
              </p>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedBranchId(value);
                  if (!value) {
                    setSelectedBranchName("All Branches");
                    return;
                  }
                  const branch = branches.find((b: any) => String(b.id) === value);
                  setSelectedBranchName(branch?.name || "Selected Branch");
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 outline-none hover:border-primary transition-colors rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 appearance-none min-w-[160px]"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              {/*<button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl text-sm font-semibold">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                <span>This Month</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>*/}

            </div>
          </div>

          {/* Bento Grid KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Revenue Today */}
            <div className="bg-white p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary-container transition-colors">
                  <span className="material-symbols-outlined text-primary">payments</span>
                </div>
                <span className="text-xs font-bold bg-primary-container text-on-primary-container px-2 py-1 rounded-full">+{data?.profitGrowth || 0}%</span>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Daily Revenue</p>
              <h3 className="text-2xl font-bold mt-1 text-on-surface">₹{(data?.todayProfit || 0).toLocaleString()}</h3>
            </div>

            {/* Monthly Revenue */}
            <div className="bg-white p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary-container transition-colors">
                  <span className="material-symbols-outlined text-secondary">trending_up</span>
                </div>
                <span className="text-xs font-bold bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">+{data?.profitGrowth || 0}%</span>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Monthly Revenue</p>
              <h3 className="text-2xl font-bold mt-1 text-on-surface">₹{(data?.totalProfit || 0).toLocaleString()}</h3>
            </div>

            {/* Inventory Value */}
            <div className="bg-white p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-tertiary/10 rounded-xl group-hover:bg-tertiary-container transition-colors">
                  <span className="material-symbols-outlined text-tertiary">inventory_2</span>
                </div>
                <span className="text-xs font-medium text-on-surface-variant">{(data?.totalBranchInventoryUnits || 0).toLocaleString()} Units</span>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Branch Inventory Value</p>
              <h3 className="text-2xl font-bold mt-1 text-on-surface">₹{(data?.branchInventoryCost || 0).toLocaleString()}</h3>
            </div>


            {/* Active Branches */}
            <div className="bg-white p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-outline/10 rounded-xl group-hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-on-surface">store</span>
                </div>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold">CH</div>
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[8px] font-bold">CO</div>
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center text-[8px] font-bold">MA</div>
                </div>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Active Branches</p>
              <h3 className="text-2xl font-bold mt-1 text-on-surface">
                {(data?.totalBranches || 0).toString().padStart(2, '0')}
                <span className="text-sm font-medium text-slate-400"> / {Math.max(branches.length, 1).toString().padStart(2, '0')}</span>
              </h3>
            </div>

            {/* Low Stock - Critical Alert */}
            <div className="bg-error-container/10 p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group border border-error/5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-error/10 rounded-xl group-hover:bg-error group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-error group-hover:text-white">warning</span>
                </div>
                <span className="text-xs font-bold text-error">CRITICAL</span>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold mt-1 text-error">{data?.lowStockCount || 0} Items</h3>
            </div>

            {/* Expiring Soon - Warning Alert */}
            <div className="bg-tertiary-container/10 p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group border border-tertiary/5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-tertiary/10 rounded-xl group-hover:bg-tertiary transition-colors">
                  <span className="material-symbols-outlined text-tertiary group-hover:text-on-tertiary-fixed">event_busy</span>
                </div>
                <span className="text-xs font-bold text-tertiary">WARNING</span>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Expiring Soon</p>
              <h3 className="text-2xl font-bold mt-1 text-tertiary">{data?.expiringCount || 0} Items</h3>
            </div>

            {/* Pending Requests */}
            <div className="bg-white p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group border-l-4 border-primary">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary-container transition-colors">
                  <span className="material-symbols-outlined text-primary">swap_horiz</span>
                </div>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Pending Requests</p>
              <h3 className="text-2xl font-bold mt-1 text-on-surface">{pendingRequests.length.toString().padStart(2, '0')} Raised</h3>
            </div>

            {/* User Management Summary */}
            <div className="bg-white p-6 rounded-xl hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-secondary-container transition-colors">
                  <span className="material-symbols-outlined text-secondary">person_pin</span>
                </div>
                <div className="text-[10px] text-right font-medium text-slate-400">
                  <p>3 Mgrs</p>
                  <p>12 Staff</p>
                </div>
              </div>
              <p className="text-on-surface-variant text-sm font-medium">Total Users</p>
              <h3 className="text-2xl font-bold mt-1 text-on-surface">{data?.totalUsers || 0} Users</h3>
            </div>
          </div>

          {/* Analytics & Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Revenue & Orders Trend */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-8 flex flex-col h-full shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="text-lg font-bold text-on-surface">Enterprise Growth Trend</h4>
                  <p className="text-on-surface-variant text-xs">Consolidated orders and revenue performance</p>
                </div>
                <div className="flex bg-surface-container-low rounded-lg p-1">
                  {(["daily", "weekly", "monthly"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      className={`px-3 py-1 text-xs font-bold rounded transition-all capitalize ${chartPeriod === p
                        ? "bg-white shadow-sm text-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 relative min-h-[300px] flex flex-col justify-end">
                <div className="flex items-end justify-between h-full gap-2 px-4">
                  <div className="w-full flex items-end gap-2 h-48">
                    {(() => {
                      const summary = data?.orderSummary || [];
                      const maxVal = Math.max(...summary.map((s: any) => s.value || 0), 1);
                      return summary.map((item: any, idx: number) => {
                        const heightPct = Math.max((item.value / maxVal) * 100, 4);
                        const sharePct = Math.round((item.value / maxVal) * 100);
                        return (
                          <div
                            key={idx}
                            className="flex-1 relative group/bar flex flex-col justify-end"
                            style={{ height: '100%' }}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20
                                            opacity-0 group-hover/bar:opacity-100 pointer-events-none
                                            transition-opacity duration-200 whitespace-nowrap">
                              <div className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-xl flex flex-col items-center gap-0.5">
                                <span className="text-[#C6FF3D]">{sharePct}%</span>
                                <span className="text-white/60">{item.value} orders</span>
                              </div>
                              {/* Arrow */}
                              <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 rounded-sm" />
                            </div>
                            {/* Bar */}
                            <div
                              className={`w-full rounded-t-md transition-all duration-700 cursor-pointer
                                          ${idx % 3 === 0 ? 'bg-primary group-hover/bar:bg-primary/80' : 'bg-primary-container group-hover/bar:bg-primary/60'}`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                  {data?.orderSummary?.map((s: any) => <span key={s.day}>{s.day}</span>)}
                </div>
              </div>
            </div>

            {/* Profit by Category */}
            <div className="bg-white rounded-2xl p-8 flex flex-col shadow-sm">
              <h4 className="text-lg font-bold text-on-surface mb-1">Profit by Category</h4>
              <p className="text-on-surface-variant text-xs mb-8">Performance breakdown this month</p>
              <div className="flex-1 flex flex-col justify-center items-center relative">
                <div className="w-48 h-48 rounded-full border-[20px] border-primary-container flex items-center justify-center relative">
                  <div className="absolute inset-0 border-[20px] border-primary border-r-transparent border-b-transparent border-l-transparent -rotate-45"></div>
                  <div className="text-center">
                    <span className="text-3xl font-extrabold text-on-surface">{data?.overallPercentage || 64}%</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Avg Margin</p>
                  </div>
                </div>
                <div className="w-full mt-8 space-y-3">
                  {(data?.profitByCategory || []).map((item, idx) => (
                    <div className="flex justify-between items-center" key={idx}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color === 'primary' ? 'bg-primary' : 'bg-primary-container'}`}></div>
                        <span className="text-xs font-semibold">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Alerts & Live Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Low Stock Alert Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-bold text-on-surface">Low Stock Alerts</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Warehouse &amp; all branches</p>
                </div>
                <button
                  onClick={() => navigate("/warehouse-inventory")}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View Warehouse
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ingredient</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Source</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty / Threshold</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {data?.lowStockItems?.length ? data.lowStockItems.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'EXPIRED' ? 'bg-error' : 'bg-amber-400'}`} />
                            <p className="text-sm font-semibold capitalize">{item.ingredientName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-slate-400">
                              {item.source === 'Warehouse' ? 'warehouse' : 'store'}
                            </span>
                            <span className="text-xs font-medium text-slate-600">{item.sourceName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${item.status === 'EXPIRED' ? 'text-error' : 'text-amber-600'}`}>
                              {item.quantity} {item.unit}
                            </span>
                            <span className="text-[10px] text-slate-400">/ {item.threshold} {item.unit}</span>
                          </div>
                          {/* mini progress bar */}
                          <div className="mt-1.5 w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.status === 'EXPIRED' ? 'bg-error' : 'bg-amber-400'}`}
                              style={{ width: `${Math.min((item.quantity / Math.max(item.threshold, 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${item.status === 'EXPIRED'
                            ? 'bg-error/10 text-error'
                            : 'bg-amber-100 text-amber-700'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-on-surface-variant text-sm">
                          <span className="material-symbols-outlined text-3xl block mb-2 text-slate-300">check_circle</span>
                          All stock levels are healthy.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-slate-900 text-white rounded-2xl p-8 flex flex-col shadow-xl">
              <h4 className="text-lg font-bold mb-6">Live Enterprise Feed</h4>
              <div className="flex-1 space-y-6 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-white/10"></div>

                {data?.recentActivity?.length ? data.recentActivity.map((log, idx) => (
                  <div key={idx} className="relative flex gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 ${log.action.includes("Stock") ? "bg-[#C6FF3D]" :
                      log.action.includes("Order") ? "bg-error" :
                        log.action.includes("Request") ? "bg-blue-500" : "bg-primary"
                      }`}>
                      <span className="material-symbols-outlined text-[14px] text-black font-bold">
                        {log.action.includes("Stock") ? "add" :
                          log.action.includes("Order") ? "remove" :
                            log.action.includes("Request") ? "swap_horiz" : "history"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90">{log.action}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{log.details}</p>
                      <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 inline-block">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <p className="text-white/30 text-xs">Awaiting fresh signal...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="mt-10 bg-white/40 border border-white/60 p-6 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Enterprise Quick Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/product")}
                className="flex items-center gap-2 px-4 py-2 bg-white text-on-surface text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="material-symbols-outlined text-sm">add_box</span>
                <span>Add Product</span>
              </button>
              <button
                onClick={() => navigate("/branches")}
                className="flex items-center gap-2 px-4 py-2 bg-white text-on-surface text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="material-symbols-outlined text-sm">add_business</span>
                <span>Add Branch</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-on-surface text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <span className="material-symbols-outlined text-sm">person_add_alt</span>
                <span>Add Manager</span>
              </button>
              <button
                onClick={() => navigate("/warehouse-orders")}
                className="flex items-center gap-2 px-4 py-2 bg-white text-on-surface text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="material-symbols-outlined text-sm">post_add</span>
                <span>Create Order</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3 group">
        <div className="flex flex-col gap-3 mb-2 translate-y-10 opacity-0 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300">
          <button className="bg-white text-on-surface px-4 py-2 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50">
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            Add Supplier
          </button>
          <button className="bg-white text-on-surface px-4 py-2 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50" onClick={() => navigate("/warehouse-orders")}>
            <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>
            Create Order
          </button>
          <button className="bg-white text-on-surface px-4 py-2 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50" onClick={() => navigate("/product")}>
            <span className="material-symbols-outlined text-sm">inventory</span>
            Add Product
          </button>
        </div>
        <button className="w-14 h-14 bg-slate-950 text-[#C6FF3D] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-3xl font-bold transition-transform group-hover:rotate-45">add</span>
        </button>
      </div>
    </div>
  );
}

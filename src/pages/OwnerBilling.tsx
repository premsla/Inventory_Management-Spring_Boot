import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (u: any) => u?.token ? `Bearer ${u.token}` : `Basic ${u.auth}`;

interface Branch { id: number; name: string; location: string; }
interface Product { id: number; name: string; price: number; category: string; description: string; imageUrl: string; }
interface CartItem { id: number; name: string; price: number; qty: number; }
interface HistoryBill {
    id: number; productName: string; totalAmount: number; quantity: number;
    customer: { name: string; phone: string }; createdAt: string;
}

export default function OwnerBilling() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"products" | "billing" | "history">("products");
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | "">("");
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [history, setHistory] = useState<HistoryBill[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (!userStr) { navigate("/"); return; }
        fetchBranches();
    }, [navigate]);

    useEffect(() => {
        if (selectedBranchId !== "") fetchHistory();
    }, [selectedBranchId]);

    const fetchBranches = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const res = await fetch(`${API_BASE}/branches/my`, { headers: { Authorization: getAuthHeader(user) } });
            if (res.ok) {
                const data: Branch[] = await res.json();
                setBranches(data);
                if (data.length > 0) setSelectedBranchId(data[0].id);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (selectedBranchId !== "") {
            fetchProducts(selectedBranchId as number);
            fetchHistory();
        }
    }, [selectedBranchId]);

    const fetchProducts = async (branchId: number) => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const res = await fetch(`${API_BASE}/products/available?branchId=${branchId}`, {
                headers: { Authorization: getAuthHeader(user) },
            });
            if (res.ok) setProducts(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchHistory = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const url = selectedBranchId
                ? `${API_BASE}/bills/branch/${selectedBranchId}`
                : `${API_BASE}/bills`;
            const res = await fetch(url, { headers: { Authorization: getAuthHeader(user) } });
            if (res.ok) setHistory(await res.json());
        } catch (err) { console.error(err); }
    };

    const addToCart = (p: Product) => {
        setCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
        });
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
    };

    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const handleFinalize = async () => {
        if (cart.length === 0 || !selectedBranchId) {
            setError("Select a branch and add items to cart first.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            for (const item of cart) {
                const res = await fetch(`${API_BASE}/orders/customer`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: getAuthHeader(user) },
                    body: JSON.stringify({
                        productId: item.id,
                        quantity: item.qty,
                        branchId: selectedBranchId,
                        customerName: customerName || "Walk-in",
                        customerPhone: customerPhone || "WALKIN",
                        taxPercent: 5.0,
                    }),
                });
                if (!res.ok) {
                    const msg = await res.text();
                    setError(msg || "Order failed.");
                    return;
                }
            }
            setCart([]);
            setCustomerName("");
            setCustomerPhone("");
            await fetchHistory();
            setActiveTab("history");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];
    const filtered = products.filter(p => {
        const matchCat = selectedCategory === "All" || p.category === selectedCategory;
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex font-['Inter'] antialiased">
            <Sidebar />

            <main className="ml-64 flex-grow min-h-screen flex flex-col">
                {/* Top bar */}
                <header className="fixed top-0 left-64 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-black/5 flex items-center justify-between px-8 z-40">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-black tracking-tight text-[#0c0f10]">Owner Billing</h1>
                        {/* Branch selector */}
                        <select
                            value={selectedBranchId}
                            onChange={e => setSelectedBranchId(Number(e.target.value))}
                            className="bg-[#eff1f3] border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c] appearance-none cursor-pointer"
                        >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    {/* Tab switcher */}
                    <div className="flex gap-1 bg-[#eff1f3] p-1 rounded-xl">
                        {(["products", "billing", "history"] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => { setActiveTab(t); if (t === "history") fetchHistory(); }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all capitalize ${activeTab === t ? "bg-white text-[#0c0f10] shadow-sm" : "text-[#595c5e] hover:text-[#0c0f10]"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="pt-20 px-8 pb-8 flex-grow">

                    {/* ── PRODUCTS TAB ── */}
                    {activeTab === "products" && (
                        <div className="flex gap-6 h-full">
                            {/* Product grid */}
                            <div className="flex-1 space-y-6">
                                {/* Search + category filter */}
                                <div className="space-y-3">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-black/5 outline-none focus:ring-2 focus:ring-[#c5fe3c]/50 text-sm font-medium shadow-sm"
                                            placeholder="Search products..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${selectedCategory === cat
                                                    ? "bg-[#c5fe3c] text-[#364b00] shadow-md"
                                                    : "bg-white text-slate-400 border border-black/5 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filtered.length > 0 ? filtered.map(p => {
                                        const cartItem = cart.find(i => i.id === p.id);
                                        return (
                                            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex flex-col group hover:shadow-lg transition-all">
                                                <div className="relative h-36 w-full mb-3 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                                                    {p.imageUrl ? (
                                                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop"; }} />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                                                    )}
                                                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/80 backdrop-blur-md rounded-lg text-[9px] font-black uppercase text-slate-500">{p.category}</div>
                                                </div>
                                                <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{p.name}</h3>
                                                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 mb-3 flex-grow">{p.description}</p>
                                                <div className="flex items-center justify-between mt-auto">
                                                    <span className="text-lg font-black text-[#496400]">₹{p.price.toFixed(2)}</span>
                                                    {cartItem ? (
                                                        <div className="flex items-center bg-[#c5fe3c]/10 rounded-xl border border-[#c5fe3c]/30 overflow-hidden">
                                                            <button onClick={() => updateQty(p.id, -1)} className="p-2 hover:bg-[#c5fe3c] transition-colors">
                                                                <span className="material-symbols-outlined text-sm">remove</span>
                                                            </button>
                                                            <span className="px-3 text-xs font-black text-[#364b00]">{cartItem.qty}</span>
                                                            <button onClick={() => updateQty(p.id, 1)} className="p-2 hover:bg-[#c5fe3c] transition-colors">
                                                                <span className="material-symbols-outlined text-sm">add</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => addToCart(p)}
                                                            className="bg-[#c5fe3c] text-[#364b00] px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[18px]">add</span> Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="col-span-full py-20 flex flex-col items-center text-slate-400">
                                            <span className="material-symbols-outlined text-5xl mb-2">inventory_2</span>
                                            <p className="font-bold">No products found</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cart sidebar */}
                            <aside className="w-80 bg-white rounded-2xl p-6 shadow-xl border border-black/5 h-fit sticky top-24 flex flex-col min-h-[500px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-black">Cart</h2>
                                    <span className="bg-[#eff1f3] px-3 py-1 rounded-full text-[10px] font-black text-[#595c5e]">
                                        {cart.reduce((s, i) => s + i.qty, 0)} items
                                    </span>
                                </div>
                                <div className="flex-grow space-y-3 overflow-y-auto no-scrollbar">
                                    {cart.length > 0 ? cart.map(item => (
                                        <div key={item.id} className="flex items-center gap-3 group">
                                            <div className="bg-slate-100 h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">x{item.qty}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{item.name}</p>
                                                <p className="text-[11px] font-black text-[#496400]">₹{(item.price * item.qty).toFixed(2)}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-slate-100 rounded"><span className="material-symbols-outlined text-xs">remove</span></button>
                                                <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-slate-100 rounded"><span className="material-symbols-outlined text-xs">add</span></button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                                            <span className="material-symbols-outlined text-5xl mb-2">shopping_bag</span>
                                            <p className="text-xs font-bold text-center">Cart is empty</p>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-5 border-t mt-4 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subtotal</span>
                                        <span className="text-xl font-black">₹{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab("billing")}
                                        disabled={cart.length === 0}
                                        className="w-full py-3 bg-black text-[#c5fe3c] font-black rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        Proceed to Billing
                                    </button>
                                </div>
                            </aside>
                        </div>
                    )}

                    {/* ── BILLING TAB ── */}
                    {activeTab === "billing" && (
                        <div className="flex gap-8">
                            <div className="flex-1 space-y-6">
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/5">
                                    <h3 className="text-xl font-black mb-6">Customer Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Customer Name</label>
                                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                                                className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c]"
                                                placeholder="Walk-in Guest" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Phone</label>
                                            <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                                className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c]"
                                                placeholder="+91 XXXXX XXXXX" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Branch</label>
                                        <select value={selectedBranchId} onChange={e => setSelectedBranchId(Number(e.target.value))}
                                            className="bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c] appearance-none w-full md:w-auto">
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    {error && <p className="mt-4 text-red-500 text-xs font-semibold">{error}</p>}
                                </div>
                            </div>

                            {/* Invoice preview */}
                            <aside className="w-80 bg-[#0c0f10] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-fit sticky top-24">
                                <div className="p-6 border-b border-white/10">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">#INV-PREVIEW</p>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-white/50">Customer</span>
                                            <span className="text-[#c5fe3c] font-bold">{customerName || "Walk-in"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-white/50">Branch</span>
                                            <span className="text-white font-bold">{branches.find(b => b.id === selectedBranchId)?.name || "—"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between text-xs">
                                            <span className="text-white/60">{item.name} x{item.qty}</span>
                                            <span className="text-white font-bold">₹{(item.price * item.qty).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 border-t border-white/10">
                                    <div className="flex justify-between mb-4">
                                        <span className="text-white/50 text-sm">Total</span>
                                        <span className="text-white font-black text-xl">₹{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={handleFinalize}
                                        disabled={isSubmitting || cart.length === 0}
                                        className="w-full py-3 bg-[#c5fe3c] text-[#364b00] font-black rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
                                    >
                                        {isSubmitting ? "Processing..." : "Finalize & Store"}
                                    </button>
                                </div>
                            </aside>
                        </div>
                    )}

                    {/* ── HISTORY TAB ── */}
                    {activeTab === "history" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-black">Billing History</h3>
                                <select value={selectedBranchId} onChange={e => { setSelectedBranchId(Number(e.target.value)); fetchHistory(); }}
                                    className="bg-white border border-black/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c] appearance-none shadow-sm">
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f5f6f8]">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f5f6f8]">
                                        {history.length > 0 ? history.map((b, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold">{b.customer?.name || "Walk-in"}</p>
                                                    <p className="text-[10px] text-slate-400">{b.customer?.phone}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">{b.productName}</td>
                                                <td className="px-6 py-4 text-sm font-medium">{b.quantity}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-black text-[#496400]">₹{b.totalAmount?.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                                                    No billing history for this branch.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

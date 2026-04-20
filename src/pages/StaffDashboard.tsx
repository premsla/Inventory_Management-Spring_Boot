import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) => user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}

interface HistoryBill {
  id: number;
  productName: string;
  totalAmount: number;
  quantity: number;
  customer: {
    name: string;
    phone: string;
  };
  createdAt: string;
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "billing" | "history">("products");
  const [orderFilter, setOrderFilter] = useState<"Pending" | "Preparing" | "Completed">("Pending");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // States for history
  const [history, setHistory] = useState<HistoryBill[]>([]);

  // Customer info for billing
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Cart state for the Current Order sidebar
  const [cart, setCart] = useState<CartItem[]>([]);

  // Orders management state (In-memory for current prep-flow)
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchHistory();
  }, []);

  const fetchProducts = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/products`, {
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API_BASE}/bills`, {
        headers: { 'Authorization': getAuthHeader(user) }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const finalizeAndStoreOrder = async () => {
    if (cart.length === 0) {
      alert("No items in cart to finalize!");
      return;
    }

    try {
      const userStr = localStorage.getItem("user");
      const userData = JSON.parse(userStr || "{}");
      const branchId = userData.branch?.id || 1; // Correctly pull branch ID from user session

      for (const item of cart) {
        const res = await fetch(`${API_BASE}/orders/customer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': getAuthHeader(userData)
          },
          body: JSON.stringify({
            productId: item.id,
            quantity: item.qty,
            branchId: branchId,
            customerName: customerName || "Guest",
            customerPhone: customerPhone || "WALKIN",
            taxPercent: 5.0
          })
        });

        if (!res.ok) {
          const rawError = await res.text();
          // This will now show the exact "Diagnosis" we added to the controller!
          alert(`Backend Error: ${rawError || res.statusText}`);
          return; // Stop the loop if one fails
        }
      }

      alert(`Success! Transaction finalized and stored.`);

      // Cleanup UI
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      fetchHistory(); // Refresh history from server
      setActiveTab("history");

    } catch (err: any) {
      alert("Billing failed: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Adding to cart logic
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      }).filter(item => item.qty > 0);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Placing IN-MEMORY order logic for kitchen view
  const placeKitchenOrder = () => {
    if (cart.length === 0) return;

    const newOrder = {
      id: `VNTR-${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      total: cartTotal,
      status: "Pending",
      customerName: customerName || "Guest",
      customerPhone: customerPhone || "Not Provided",
      items: cart.map(item => ({ name: item.name, qty: item.qty }))
    };

    setOrders([newOrder, ...orders]);
    setCart([]);
    setActiveTab("orders"); // Move to orders tab to see status
    setOrderFilter("Pending");
  };

  // Order state transition logic
  const advanceOrder = (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Pending" ? "Preparing" : "Completed";
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    setOrderFilter(nextStatus as any);
  };

  return (
    <div className="bg-background text-on-surface min-h-screen font-['Inter']">
      {/* Sidebar navigation */}
      <aside className="hidden md:flex flex-col h-screen w-56 fixed left-0 top-0 bg-[#0c0f10] z-40">
        <div className="px-6 py-8">
          <h1 className="text-xl font-bold text-[#c5fe3c] tracking-tighter">Ventorie</h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] mt-1 uppercase">Kitchen Hub</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-xl text-sm font-medium ${activeTab === "products" ? "text-[#c5fe3c] bg-white/5 relative before:absolute before:left-0 before:w-1 before:h-6 before:bg-[#c5fe3c] before:rounded-r-full" : "text-slate-500 hover:text-white"
              }`}
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            Products
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-xl text-sm font-medium ${activeTab === "orders" ? "text-[#c5fe3c] bg-white/5 relative before:absolute before:left-0 before:w-1 before:h-6 before:bg-[#c5fe3c] before:rounded-r-full" : "text-slate-500 hover:text-white"
              }`}
          >
            <span className="material-symbols-outlined">receipt_long</span>
            Orders
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-xl text-sm font-medium ${activeTab === "billing" ? "text-[#c5fe3c] bg-white/5 relative before:absolute before:left-0 before:w-1 before:h-6 before:bg-[#c5fe3c] before:rounded-r-full" : "text-slate-500 hover:text-white"
              }`}
          >
            <span className="material-symbols-outlined">payments</span>
            Billing
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              fetchHistory();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-xl text-sm font-medium ${activeTab === "history" ? "text-[#c5fe3c] bg-white/5 relative before:absolute before:left-0 before:w-1 before:h-6 before:bg-[#c5fe3c] before:rounded-r-full" : "text-slate-500 hover:text-white"
              }`}
          >
            <span className="material-symbols-outlined">history</span>
            History
          </button>
        </nav>
        <div className="p-6 mt-auto">
          <button onClick={handleLogout} className="w-full text-slate-500 flex items-center gap-3 px-4 py-3 hover:text-white transition-colors duration-200 font-medium text-sm rounded-lg hover:bg-white/5">
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-56 p-4 md:p-10">
        {/* --- PRODUCTS TAB --- */}
        {activeTab === "products" && (
          <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                  <input
                    className="w-full pl-12 pr-6 py-4 bg-white border border-black/5 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-[#c5fe3c]/50 transition-all font-medium"
                    placeholder="Search menu items..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-6 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-[#c5fe3c] text-[#364b00] shadow-md shadow-[#c5fe3c]/20" : "bg-white text-slate-400 hover:bg-slate-50 border border-black/5"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => {
                    const cartItem = cart.find(item => item.id === product.id);
                    return (
                      <div key={product.id} className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all border border-black/5 flex flex-col">
                        <div className="relative h-40 w-full mb-4 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              alt={product.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                              src={product.imageUrl}
                              onError={(e) => {
                                (e.target as any).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";
                              }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                          )}
                          <div className="absolute top-2 right-2 px-2 py-1 bg-white/80 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-tighter text-slate-500 border border-white/20">{product.category}</div>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-1 mb-4 flex-grow">{product.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xl font-black text-[#496400]">₹{product.price.toFixed(2)}</span>

                          {cartItem ? (
                            <div className="flex items-center bg-[#c5fe3c]/10 rounded-xl border border-[#c5fe3c]/30 overflow-hidden">
                              <button onClick={() => updateQty(product.id, -1)} className="p-2.5 hover:bg-[#c5fe3c] hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-sm font-black">remove</span>
                              </button>
                              <span className="px-3 font-black text-xs text-[#364b00]">{cartItem.qty}</span>
                              <button onClick={() => updateQty(product.id, 1)} className="p-2.5 hover:bg-[#c5fe3c] hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-sm font-black">add</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="bg-[#c5fe3c] text-[#364b00] px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-[#c5fe3c]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-5xl mb-2">inventory_2</span>
                    <p className="font-bold">No products found</p>
                  </div>
                )}
              </div>
            </div>

            <aside className="w-full lg:w-96 bg-white rounded-[2rem] p-8 shadow-xl border border-black/5 h-fit sticky top-10 flex flex-col min-h-[500px]">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xl font-black">Current Order</h2>
                  <span className="bg-[#eff1f3] px-3 py-1 rounded-full text-[10px] font-black text-[#595c5e]">T#12</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Alex Johnson • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <div className="flex-grow space-y-4">
                {cart.length > 0 ? (
                  cart.map(item => (
                    <div key={item.id} className="flex items-center gap-4 group">
                      <div className="bg-slate-100 h-10 w-10 text-[10px] rounded-lg flex items-center justify-center font-black text-slate-500">x{item.qty}</div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-800 line-clamp-1">{item.name}</p>
                        <p className="text-[11px] font-black text-[#496400]">₹{(item.price * item.qty).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1.5 hover:bg-slate-200 rounded-md">
                          <span className="material-symbols-outlined text-xs">remove</span>
                        </button>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1.5 hover:bg-slate-200 rounded-md">
                          <span className="material-symbols-outlined text-xs">add</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <span className="material-symbols-outlined text-6xl mb-2">shopping_bag</span>
                    <p className="text-sm font-bold text-center">Your sidebar is empty.<br />Add products to begin.</p>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Subtotal</span>
                  <span className="text-2xl font-black tracking-tighter leading-none">₹{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={placeKitchenOrder}
                  disabled={cart.length === 0}
                  className="w-full py-4 bg-black text-[#c5fe3c] font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-black/10 disabled:opacity-30 disabled:grayscale"
                >
                  Confirm & Send to Kitchen
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* --- ORDERS TAB --- */}
        {activeTab === "orders" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <h2 className="text-3xl font-black tracking-tighter">Kitchen Management</h2>
              <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl">
                {["Pending", "Preparing", "Completed"].map((t) => (
                  <button key={t} onClick={() => setOrderFilter(t as any)} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${orderFilter === t ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-black"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {orders.filter(o => o.status === orderFilter).length > 0 ? (
                orders.filter(o => o.status === orderFilter).map(order => (
                  <div key={order.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:-translate-y-1 transition-all group">
                    <div className="flex justify-between items-start mb-8">
                      <h4 className="text-xl font-black">#{order.id}</h4>
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full border ${order.status === "Pending" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                        order.status === "Preparing" ? "bg-blue-100 text-blue-700 border-blue-200" :
                          "bg-green-100 text-green-700 border-green-200"
                        }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-4 mb-10 text-xs font-medium text-slate-500">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {order.customerName}
                      </div>
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm text-black"><span className="font-bold">{item.name}</span><span className="text-slate-400">x{item.qty}</span></div>
                      ))}
                    </div>
                    <div className="pt-6 border-t flex items-center justify-between">
                      <div><p className="text-[10px] text-slate-400 font-bold uppercase">Total</p><p className="text-2xl font-black">₹{order.total.toFixed(2)}</p></div>

                      {order.status !== "Completed" && (
                        <button
                          onClick={() => advanceOrder(order.id, order.status)}
                          className="bg-[#c5fe3c] text-[#364b00] px-6 py-3 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-lg shadow-[#c5fe3c]/20"
                        >
                          {order.status === "Pending" ? "Start Preparing" : "Finish Order"}
                        </button>
                      )}

                      {order.status === "Completed" && (
                        <button
                          onClick={() => {
                            setActiveTab("billing");
                            // In memory mock settlement flow
                            setCart(order.items.map((it: any) => {
                              const prod = products.find(p => p.name === it.name);
                              return { id: prod?.id || 0, name: it.name, price: prod?.price || 0, qty: it.qty };
                            }));
                            setCustomerName(order.customerName);
                            setCustomerPhone(order.customerPhone);
                          }}
                          className="flex items-center gap-1 bg-black text-[#c5fe3c] px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest"
                        >
                          <span className="material-symbols-outlined text-sm">payments</span>
                          Bill & Settle
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-5xl mb-2">assignment_late</span>
                  <p className="font-bold tracking-tight">No {orderFilter} orders at the moment.</p>
                </div>
              )}

              <div className="bg-[#0c0f10] rounded-[2rem] p-10 text-white shadow-2xl flex flex-col justify-between min-h-[350px] relative overflow-hidden group">
                <div>
                  <p className="text-[10px] font-black text-[#c5fe3c] uppercase tracking-widest mb-8">KITCHEN LOAD</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="text-6xl font-black text-[#c5fe3c]">{orders.filter(o => o.status !== "Completed").length.toString().padStart(2, '0')}</h3>
                    <span className="text-sm font-bold opacity-40 uppercase">Active</span>
                  </div>
                  <p className="text-xs font-medium opacity-60">Average efficiency: <span className="text-white underline decoration-[#c5fe3c] underline-offset-4">98.2%</span></p>
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between mb-3 text-[10px] font-bold"><span className="opacity-40 uppercase">Efficiency</span><span className="text-[#c5fe3c]">85%</span></div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="bg-[#c5fe3c] h-full shadow-[0_0_15px_#c5fe3c]" style={{ width: "85%" }} /></div>
                </div>
                <div className="absolute -right-20 -top-20 w-60 h-60 bg-[#c5fe3c]/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
              </div>
            </div>
          </div>
        )}

        {/* --- BILLING TAB --- */}
        {activeTab === "billing" && (
          <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in zoom-in duration-500">
            <div className="flex-1 space-y-8">
              <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-black/5">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 bg-[#c5fe3c] rounded-2xl"><span className="material-symbols-outlined text-[#364b00]">person_add</span></div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Customer Information</h3>
                    <p className="text-sm font-medium text-slate-400">Collect details to send the digital invoice</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#eff1f3] border-none rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c]/50 transition-all"
                      placeholder="Enter name (e.g. John Doe)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Mobile Number</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-[#eff1f3] border-none rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c]/50 transition-all"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Settlement Method</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                  {[
                    { name: "Cash", icon: "payments" },
                    { name: "Credit Card", icon: "credit_card" },
                    { name: "Digital QR", icon: "qr_code_2" },
                    { name: "UPI Pay", icon: "account_balance_wallet" }
                  ].map((meth) => (
                    <button
                      key={meth.name}
                      className={`flex flex-col items-center gap-3 py-8 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${meth.name === "Cash" ? "border-[#c5fe3c] bg-[#c5fe3c]/10 text-[#364b00]" : "border-slate-100 text-slate-400 hover:border-black/10 hover:bg-slate-50"
                        }`}
                    >
                      <span className="material-symbols-outlined text-2xl">{meth.icon}</span>
                      {meth.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="w-full lg:w-[450px] bg-white rounded-[2.5rem] shadow-2xl border border-black/5 overflow-hidden flex flex-col h-fit lg:h-[calc(100vh-8rem)] sticky top-10">
              <div className="p-10 bg-[#0c0f10] text-white">
                <div className="flex justify-between items-center mb-8">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-[#c5fe3c]">description</span></div>
                  <span className="text-xs font-black opacity-30 tracking-[0.3em] font-['Space_Mono']">#INV-PREVIEW</span>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Customer Details</span>
                    <span className="font-bold text-[#c5fe3c]">{customerName || "Walk-in Guest"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Settlement Total</span>
                    <span className="font-black">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/10 w-full my-6" />
                  <div className="flex justify-between items-center"><span className="text-white/50 font-bold">GST (5%)</span><span className="font-black">₹{(cartTotal * 0.05).toFixed(2)}</span></div>
                </div>
              </div>
              <div className="p-10 bg-[#eff1f3]/50 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-end mb-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payable Amount</p>
                  <p className="text-5xl font-black text-black tracking-tighter decoration-[#c5fe3c] underline decoration-4 underline-offset-[14px]">₹{(cartTotal * 1.05).toFixed(2)}</p>
                </div>
                <button
                  onClick={finalizeAndStoreOrder}
                  className="w-full py-5 bg-[#c5fe3c] text-[#364b00] font-black rounded-2xl shadow-xl shadow-[#c5fe3c]/30 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">send_to_mobile</span> Finalize & Send Bill
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === "history" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black tracking-tighter">Backend History</h2>
                <p className="text-sm font-medium text-slate-400 italic">Review all finalized transactions fetched from the server.</p>
              </div>
              <button
                onClick={fetchHistory}
                className="bg-white border p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-black"
              >
                <span className="material-symbols-outlined text-sm">refresh</span> Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {history.length > 0 ? (
                history.map(bill => (
                  <div key={bill.id} className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-6">
                      <div className="bg-[#eff1f3] p-4 rounded-xl">
                        <span className="material-symbols-outlined text-slate-500">receipt_long</span>
                      </div>
                      <div>
                        <h4 className="font-black text-lg tracking-tight">#{bill.id}</h4>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          {bill.createdAt && !isNaN(new Date(bill.createdAt).getTime()) ? (
                            `${new Date(bill.createdAt).toLocaleDateString()} • ${new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          ) : (
                            "Recent Transaction"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 px-4 border-l border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Customer</p>
                      <p className="text-sm font-bold text-slate-800">{bill.customer?.name || "Guest"}</p>
                      <p className="text-[11px] text-slate-400">{bill.customer?.phone || "N/A"}</p>
                    </div>

                    <div className="flex-1 px-4 border-l border-slate-100 hidden md:block">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Product</p>
                      <p className="text-sm font-medium text-slate-600 line-clamp-1">
                        {bill.quantity}x {bill.productName}
                      </p>
                    </div>

                    <div className="text-right border-l border-slate-100 pl-4 w-full md:w-auto">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Amount</span>
                        <span className="text-xl font-black text-[#0c0f10] tracking-tighter">₹{bill.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-6xl mb-4">manage_search</span>
                  <p className="font-bold">No history available yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bar */}
      <nav className="fixed bottom-0 left-0 w-full md:hidden bg-white/80 backdrop-blur-xl border-t border-black/5 flex justify-around p-4 pb-8 z-50">
        {["products", "orders", "billing", "history"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === t ? "text-[#364b00] scale-110" : "text-slate-400"}`}>
            <span className="material-symbols-outlined">
              {t === "products" ? "shopping_bag" : t === "orders" ? "receipt_long" : t === "billing" ? "payments" : "history"}
            </span>
            <span className="text-[9px] font-black uppercase text-[8px]">{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userName = user?.name || "Premalatha";
  const userRole = user?.role === "OWNER" ? "Enterprise Owner" : "Operations Manager";

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem("user");
    navigate("/");
  };

  const navItems = [
    { label: "Dashboard", icon: "dashboard", path: "/dashboard" },
    { label: "Warehouse", icon: "warehouse", path: "/warehouse-inventory" },
    { label: "Products", icon: "inventory_2", path: "/product" },
    { label: "Branches", icon: "store", path: "/branches" },
    { label: "Suppliers", icon: "local_shipping", path: "#" },
    { label: "Orders", icon: "shopping_cart", path: "/warehouse-orders" },
    { label: "Billing", icon: "receipt_long", path: "/owner-billing" },
    { label: "Reports", icon: "bar_chart", path: "#" },
    { label: "Users", icon: "group", path: "/users" },
    { label: "Settings", icon: "settings", path: "#" },
  ];

  return (
    <aside className="bg-slate-950 h-screen w-64 fixed left-0 top-0 flex flex-col py-8 shadow-2xl shadow-black/20 z-50">
      <div className="px-8 mb-10">
        <h1
          className="text-2xl font-bold tracking-tighter text-[#C6FF3D] cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          Ventorie
        </h1>
        <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mt-1">Enterprise Tier</p>
      </div>

      <nav className="flex-1 space-y-1 font-['Inter'] font-medium tracking-tight overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.label}
              onClick={() => item.path !== "#" && navigate(item.path)}
              className={`flex items-center gap-3 px-8 py-3 cursor-pointer transition-all duration-200 ${isActive
                ? "text-[#C6FF3D] border-r-2 border-[#C6FF3D] bg-white/5"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="px-8 mt-auto pt-8 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm font-medium px-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

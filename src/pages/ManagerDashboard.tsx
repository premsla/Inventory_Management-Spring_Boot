﻿import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8080/Inventa/api";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

interface BranchInventory {
  id: number;
  ingredientName: string;
  quantity: number;
  pricePerUnit?: number;
  unit: string;
  threshold: number;
  imageUrl?: string;
  batchNumber?: string;
  expiryDate?: string;
  status?: string;
}

interface LowStockAlert {
  id: number;
  ingredientName: string;
  currentQuantity: number;
  threshold: number;
  branchName?: string;
}

interface StockRequest {
  id: number;
  productName?: string;
  ingredientName?: string;
  quantity?: number;
  requestedQuantity?: string;
  status: string;
  createdAt?: string;
  requestedAt?: string;
  requestedBy?: { name: string };
}

interface AuditLog {
  id: number;
  action: string;
  performedBy?: string;
  details?: string;
  timestamp?: string;
  createdAt?: string;
}

interface BranchBill {
  id: number;
  productName: string;
  totalAmount: number;
  quantity: number;
  createdAt?: string;
  customer?: {
    name?: string;
    phone?: string;
  };
  order?: {
    id?: number;
    branchId?: number;
  };
}

interface BranchProduct {
  id: number;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  instructions?: string;
  recipes?: { ingredientName: string; quantity: number; unit: string }[];
}

interface ManagerRecipe {
  ingredientName: string;
  quantity: number;
  unit: string;
}

// â”€â”€ Stock-level helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function stockLevel(qty: number, threshold: number): "critical" | "low" | "ok" {
  if (qty <= threshold * 0.5) return "critical";
  if (qty <= threshold) return "low";
  return "ok";
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [managerName, setManagerName] = useState("Manager");
  const [branchName, setBranchName] = useState("Main Branch");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [authHeader, setAuthHeader] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);

  // Data state
  const [inventory, setInventory] = useState<BranchInventory[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [branchBills, setBranchBills] = useState<BranchBill[]>([]);
  const [products, setProducts] = useState<BranchProduct[]>([]);
  const [viewingRecipeProduct, setViewingRecipeProduct] = useState<BranchProduct | null>(null);
  const [showProductEditor, setShowProductEditor] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BranchProduct | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCategory, setProdCategory] = useState("Main Course");
  const [customCategoryInput, setCustomCategoryInput] = useState(false);
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodInstructions, setProdInstructions] = useState("");
  const [prodIngredients, setProdIngredients] = useState<ManagerRecipe[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Stock update form
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [updateQty, setUpdateQty] = useState<number>(0);
  const [updateAction, setUpdateAction] = useState<"add" | "reduce">("add");
  const [isUpdating, setIsUpdating] = useState(false);

  // Stock request form
  const [reqIngredient, setReqIngredient] = useState("");
  const [reqQuantity, setReqQuantity] = useState<number | "">("");
  const [reqUnit] = useState("kg");
  const [isRequesting, setIsRequesting] = useState(false);

  // Inventory search
  const [inventorySearch, setInventorySearch] = useState("");

  // Billing state
  const [billingCart, setBillingCart] = useState<{ id: number; name: string; price: number; qty: number }[]>([]);
  const [billingCustomerName, setBillingCustomerName] = useState("");
  const [billingCustomerPhone, setBillingCustomerPhone] = useState("");
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingTab, setBillingTab] = useState<"products" | "checkout" | "history">("products");
  const [billingSearch, setBillingSearch] = useState("");
  const [billingCategory, setBillingCategory] = useState("All");
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Staff state
  const [staffList, setStaffList] = useState<{ id: number; name: string; email: string; phone: string; role: string }[]>([]);
  const [managerList, setManagerList] = useState<{ id: number; name: string; email: string; phone: string; role: string }[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffFormName, setStaffFormName] = useState("");
  const [staffFormEmail, setStaffFormEmail] = useState("");
  const [staffFormPhone, setStaffFormPhone] = useState("");
  const [staffFormPassword, setStaffFormPassword] = useState("");
  const [staffFormError, setStaffFormError] = useState<string | null>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // Add New Ingredient modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState<number>(0);
  const [newUnit, setNewUnit] = useState("kg");
  const [newThreshold, setNewThreshold] = useState<number>(10);
  const [newPricePerUnit, setNewPricePerUnit] = useState<number>(0);
  const [newBatchNumber, setNewBatchNumber] = useState("");
  const [newExpiry, setNewExpiry] = useState<string>("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<BranchInventory | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) { navigate("/"); return; }
    const user = JSON.parse(userStr);
    const name = user.name || user.username || user.fullName || user.email?.split("@")[0] || "Manager";
    setManagerName(name);
    if (user.branch?.name) setBranchName(user.branch.name);
    else if (user.branchName) setBranchName(user.branchName);
    if (user.branch?.id) setBranchId(Number(user.branch.id));
    else if (user.branchId) setBranchId(Number(user.branchId));
    if (user.token) setAuthHeader(`Bearer ${user.token}`);
    else if (user.auth) setAuthHeader(`Basic ${user.auth}`);
  }, [navigate]);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": authHeader
  }), [authHeader]);

  const fetchAll = useCallback(async () => {
    if (!authHeader) return;
    setLoading(true);
    setLoadingOrders(true);
    try {
      const [inventoryRes, alertsRes, requestsRes, auditRes, productsRes] = await Promise.allSettled([
        branchId ? fetch(`${API_BASE}/branch-inventory/branch/${branchId}`, { headers: headers() }) : Promise.reject("no branch"),
        fetch(`${API_BASE}/alerts/manager/open`, { headers: headers() }),
        fetch(`${API_BASE}/stock-requests/my-branch`, { headers: headers() }),
        fetch(`${API_BASE}/audit`, { headers: headers() }),
        fetch(`${API_BASE}/products`, { headers: headers() }),
      ]);
      if (inventoryRes.status === "fulfilled" && inventoryRes.value.ok) setInventory(await inventoryRes.value.json());
      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) setLowStockAlerts(await alertsRes.value.json());
      if (requestsRes.status === "fulfilled" && requestsRes.value.ok) setStockRequests(await requestsRes.value.json());
      if (auditRes.status === "fulfilled" && auditRes.value.ok) setAuditLogs(await auditRes.value.json());
      if (productsRes.status === "fulfilled" && productsRes.value.ok) {
        setProducts(await productsRes.value.json());
      }

      if (branchId) {
        try {
          const billsRes = await fetch(`${API_BASE}/bills/branch/${branchId}`, { headers: headers() });
          if (billsRes.ok) {
            const billsData = await billsRes.json();
            setBranchBills(Array.isArray(billsData) ? billsData : []);
          } else {
            setBranchBills([]);
          }
        } catch (e) {
          console.error("Failed to load branch bills", e);
          setBranchBills([]);
        }
      } else {
        setBranchBills([]);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
      setLoadingOrders(false);
    }
  }, [authHeader, branchId, headers]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUpdateStock = async () => {
    if (!selectedIngredient || !updateQty || !branchId) return;
    setIsUpdating(true);
    try {
      const current = inventory.find(i => i.ingredientName === selectedIngredient);
      const newQty = updateAction === "add"
        ? (current?.quantity || 0) + updateQty
        : Math.max(0, (current?.quantity || 0) - updateQty);
      await fetch(`${API_BASE}/branch-inventory`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          branchId,
          ingredientName: selectedIngredient,
          quantity: newQty,
          unit: current?.unit || "units",
          threshold: current?.threshold || 10,
          pricePerUnit: current?.pricePerUnit || 0,
          status: "ACTIVE",
        })
      });
      await fetchAll();
      setUpdateQty(0);
    } catch (err) { console.error(err); }
    finally { setIsUpdating(false); }
  };

  const handleStockRequest = async () => {
    if (!reqIngredient || !reqQuantity || !branchId) return;
    setIsRequesting(true);
    try {
      const res = await fetch(`${API_BASE}/stock-requests`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ branchId, ingredientName: reqIngredient, quantity: reqQuantity, unit: reqUnit })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to submit request.");
        return;
      }
      await fetchAll();
      setReqIngredient(""); setReqQuantity("");
    } catch (err) { console.error(err); }
    finally { setIsRequesting(false); }
  };

  const handleReceiveRequest = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/stock-requests/${id}/receive`, {
        method: "POST",
        headers: headers()
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to confirm receipt.");
        return;
      }
      await fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInventory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this ingredient?")) return;
    try {
      const res = await fetch(`${API_BASE}/branch-inventory/${id}`, {
        method: "DELETE",
        headers: headers()
      });
      if (res.ok) await fetchAll();
      else alert("Failed to delete item.");
    } catch (err) { console.error(err); }
  };

  const openEditModal = (item: BranchInventory) => {
    setEditingItem(item);
    setNewName(item.ingredientName);
    setNewQty(item.quantity);
    setNewUnit(item.unit);
    setNewThreshold(item.threshold);
    setNewPricePerUnit(item.pricePerUnit || 0);
    setNewBatchNumber(item.batchNumber || "");
    setNewExpiry(item.expiryDate || "");
    setNewImage(item.imageUrl || null);
    setShowAddModal(true);
  };

  const handleAddIngredient = async () => {
    if (!newName || (newQty === undefined || newQty === null) || !branchId) return;
    setIsAdding(true);
    try {
      const payload = {
        id: editingItem?.id, // include ID if editing
        branchId,
        ingredientName: newName,
        quantity: newQty,
        unit: newUnit,
        threshold: newThreshold,
        pricePerUnit: newPricePerUnit,
        batchNumber: newBatchNumber || undefined,
        expiryDate: newExpiry || undefined,
        status: editingItem?.status || "ACTIVE",
      };

      await fetch(`${API_BASE}/branch-inventory`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload)
      });
      await fetchAll();
      // reset form
      setNewName("");
      setNewQty(0);
      setNewUnit("kg");
      setNewThreshold(10);
      setNewPricePerUnit(0);
      setNewBatchNumber("");
      setNewExpiry("");
      setNewImage(null);
      setEditingItem(null);
      setShowAddModal(false);
    } catch (err) { console.error(err); }
    finally { setIsAdding(false); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setNewImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openNewProductEditor = () => {
    setSelectedProduct(null);
    setProdName("");
    setProdDesc("");
    setProdCategory("Main Course");
    setCustomCategoryInput(false);
    setProdPrice(0);
    setProdImageUrl("");
    setProdInstructions("");
    setProdIngredients([]);
    setIngredientSearch("");
    setShowProductEditor(true);
  };

  const openEditProductEditor = (product: BranchProduct) => {
    setSelectedProduct(product);
    setProdName(product.name || "");
    setProdDesc(product.description || "");
    setProdCategory(product.category || "Main Course");
    setProdPrice(product.price || 0);
    setProdImageUrl(product.imageUrl || "");
    setProdInstructions(product.instructions || "");
    setProdIngredients((product.recipes || []).map(r => ({
      ingredientName: r.ingredientName,
      quantity: Number(r.quantity) || 1,
      unit: r.unit || "kg",
    })));
    setIngredientSearch("");
    setShowProductEditor(true);
  };

  const addRecipeIngredient = (name: string) => {
    const val = name.trim();
    if (!val) return;
    const exists = prodIngredients.some(i => i.ingredientName?.toLowerCase() === val.toLowerCase());
    if (exists) {
      setIngredientSearch("");
      return;
    }
    const inv = inventory.find(i => i.ingredientName?.toLowerCase() === val.toLowerCase());
    setProdIngredients(prev => [...prev, { ingredientName: val, quantity: 1, unit: inv?.unit || "kg" }]);
    setIngredientSearch("");
  };

  const removeRecipeIngredient = (idx: number) => {
    setProdIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRecipeIngredient = (idx: number, field: keyof ManagerRecipe, value: string | number) => {
    setProdIngredients(prev => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSaveProduct = async () => {
    if (!prodName.trim()) return;
    setSavingProduct(true);
    try {
      const payload = {
        id: selectedProduct?.id,
        name: prodName,
        description: prodDesc,
        category: prodCategory,
        price: prodPrice,
        instructions: prodInstructions,
        imageUrl: prodImageUrl,
        branchId: branchId,
        recipes: prodIngredients,
      };
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(txt || "Failed to save product");
        return;
      }
      await fetchAll();
      setShowProductEditor(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem("user"); navigate("/"); };

  // â”€â”€ Billing helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchBillingHistory = async () => {
    if (!branchId) return;
    try {
      const res = await fetch(`${API_BASE}/bills/branch/${branchId}`, { headers: headers() });
      if (res.ok) setBillingHistory(await res.json());
    } catch (err) { console.error(err); }
  };

  const billingAddToCart = (p: BranchProduct) => {
    setBillingCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const billingUpdateQty = (id: number, delta: number) => {
    setBillingCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  const billingCartTotal = billingCart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleFinalizeBilling = async () => {
    if (billingCart.length === 0 || !branchId) return;
    setIsFinalizing(true);
    setBillingError(null);
    try {
      for (const item of billingCart) {
        const res = await fetch(`${API_BASE}/orders/customer`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            productId: item.id,
            quantity: item.qty,
            branchId,
            customerName: billingCustomerName || "Walk-in",
            customerPhone: billingCustomerPhone || "WALKIN",
            taxPercent: 5.0,
          }),
        });
        if (!res.ok) {
          const msg = await res.text();
          setBillingError(msg || "Order failed.");
          return;
        }
      }
      setBillingCart([]);
      setBillingCustomerName("");
      setBillingCustomerPhone("");
      await fetchBillingHistory();
      setBillingTab("history");
    } catch (err: any) {
      setBillingError(err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  // â”€â”€ Staff helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchStaff = async () => {
    if (!branchId) return;
    try {
      const res = await fetch(`${API_BASE}/users/branch/${branchId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setManagerList(data.managers || []);
        setStaffList(data.staff || []);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddStaff = async () => {
    if (!staffFormName || !staffFormEmail || !staffFormPhone || !staffFormPassword) {
      setStaffFormError("All fields are required.");
      return;
    }
    setIsAddingStaff(true);
    setStaffFormError(null);
    try {
      const res = await fetch(`${API_BASE}/users/create-staff`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name: staffFormName,
          email: staffFormEmail,
          phone: staffFormPhone,
          password: staffFormPassword,
          branchId,
        }),
      });
      if (res.ok) {
        setShowAddStaffModal(false);
        setStaffFormName(""); setStaffFormEmail(""); setStaffFormPhone(""); setStaffFormPassword("");
        await fetchStaff();
      } else {
        const msg = await res.text();
        setStaffFormError(msg || "Failed to create staff.");
      }
    } catch (err: any) {
      setStaffFormError(err.message);
    } finally {
      setIsAddingStaff(false);
    }
  };

  const navItems = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "inventory", icon: "inventory_2", label: "Branch Inventory" },
    { id: "update-stock", icon: "fastfood", label: "Products" },
    { id: "billing", icon: "receipt_long", label: "Billing" },
    { id: "orders", icon: "shopping_cart", label: "Orders" },
    { id: "stock-requests", icon: "rebase_edit", label: "Stock Requests" },
    { id: "reports", icon: "assessment", label: "Reports" },
    { id: "staff", icon: "group", label: "Staff" },
  ];

  const greeting = getGreeting();
  const totalInventoryValue = inventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.pricePerUnit || 0)), 0);
  const pendingRequests = stockRequests.filter(r => r.status === "PENDING").length;

  const formatDate = (d?: string) => {
    if (!d) return "â€”";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-[#e6ea5a] text-[#535500]", APPROVED: "bg-[#c5fe3c] text-[#455f00]",
      DISPATCHED: "bg-[#2563eb] text-white", DELIVERED: "bg-[#455f00] text-white",
      FULFILLED: "bg-[#dadde0] text-[#595c5e]", REJECTED: "bg-[#f95630] text-white",
    };
    return map[status?.toUpperCase()] || "bg-[#eff1f3] text-[#595c5e]";
  };

  const filteredInventory = inventory.filter(i =>
    i.ingredientName?.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  // â”€â”€ Page title helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pageTitle: Record<string, string> = {
    dashboard: `${greeting}, ${managerName}`,
    inventory: "Branch Inventory",
    "update-stock": "Products",
    orders: "Orders",
    "stock-requests": "Stock Requests",
    reports: "Reports",
    staff: "Staff",
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen font-['Inter'] antialiased">

      {/* â”€â”€ Add New Ingredient Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeInUp_0.25s_ease]">
            {/* Modal Header */}
            <div className="bg-[#0c0f10] px-8 py-6 flex justify-between items-center">
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">{editingItem ? "Edit Ingredient" : "Add New Ingredient"}</h2>
                <p className="text-white/40 text-xs mt-0.5">{editingItem ? "Update record for" : "Add a new item to"} {branchName}</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-5">
              {/* Image Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full h-36 rounded-xl border-2 border-dashed border-[#c5fe3c]/40 bg-[#f5f6f8] flex flex-col items-center justify-center cursor-pointer hover:border-[#c5fe3c] hover:bg-[#c5fe3c]/5 transition-all group overflow-hidden"
              >
                {newImage ? (
                  <img src={newImage} alt="preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl text-[#c5fe3c] group-hover:scale-110 transition-transform">add_photo_alternate</span>
                    <p className="text-xs text-[#595c5e] mt-2 font-medium">Click to upload ingredient image</p>
                    <p className="text-[10px] text-[#abadaf]">PNG, JPG, WEBP up to 5MB</p>
                  </>
                )}
                {newImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-xl">
                    <span className="material-symbols-outlined text-white text-3xl">edit</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Ingredient Name *</label>
                <input
                  value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                  placeholder="e.g., Tomatoes"
                />
              </div>

              {/* Qty + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Quantity *</label>
                  <input
                    value={newQty || ""} onChange={e => setNewQty(Number(e.target.value))}
                    type="number" min={0}
                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Unit</label>
                  <select
                    value={newUnit} onChange={e => setNewUnit(e.target.value)}
                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                  >
                    {["kg", "g", "liter", "ml", "pcs"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">
                    Low-Stock Threshold
                  </label>
                  <input
                    value={newThreshold || ""} onChange={e => setNewThreshold(Number(e.target.value))}
                    type="number" min={0}
                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">
                    Batch Number
                  </label>
                  <input
                    value={newBatchNumber}
                    onChange={e => setNewBatchNumber(e.target.value)}
                    type="text"
                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                    placeholder="e.g., B-2024-01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">
                  Expiry Date
                </label>
                <input
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  type="date"
                  className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">
                  Price Per Unit
                </label>
                <input
                  value={newPricePerUnit || ""}
                  onChange={e => setNewPricePerUnit(Number(e.target.value))}
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="flex-1 py-3 rounded-xl border border-black/10 text-sm font-semibold hover:bg-[#eff1f3] transition-all">
                Cancel
              </button>
              <button
                onClick={handleAddIngredient}
                disabled={isAdding || !newName || (newQty === undefined || newQty === null)}
                className="flex-1 py-3 rounded-xl bg-[#c5fe3c] text-[#364b00] text-sm font-black shadow-[0_4px_14px_0_rgba(197,254,60,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {isAdding ? (editingItem ? "Updating..." : "Adding...") : (editingItem ? "Update Record" : "Add Ingredient")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-[#0c0f10] flex flex-col py-8 px-4 z-50 shadow-[0px_24px_48px_rgba(44,47,49,0.12)]">
        <div className="mb-12 px-4">
          <h1 className="text-2xl font-black text-[#c5fe3c] tracking-tighter">Ventorie</h1>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Branch Hub</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 ${activeTab === item.id
                ? "text-[#c5fe3c] border-l-4 border-[#496400] bg-gradient-to-r from-[#496400]/10 to-transparent font-bold tracking-tight translate-x-1"
                : "text-gray-400 hover:text-white hover:bg-white/5 font-medium tracking-tight border-l-4 border-transparent"
                }`}>
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all rounded-lg">
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="ml-64 min-h-screen pb-12">
        {/* Top Bar */}
        <header className="flex justify-between items-center px-6 py-3 mx-6 mt-4 rounded-xl bg-white/80 backdrop-blur-md shadow-sm border border-black/5">
          <div className="flex items-center bg-[#eff1f3] px-4 py-2 rounded-full w-96">
            <span className="material-symbols-outlined text-[#595c5e] mr-2 text-xl">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-sm w-full p-0 outline-none placeholder-[#abadaf]"
              placeholder="Search inventory..."
              value={inventorySearch}
              disabled={!["inventory", "orders"].includes(activeTab)}
              onChange={e => setInventorySearch(e.target.value)}
              type="text"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(v => !v)}
                className="relative text-[#595c5e] hover:bg-[#eff1f3] p-2 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">notifications</span>
                {lowStockAlerts.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#b02500] rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[340px] bg-white rounded-2xl shadow-2xl border border-black/5 z-[200] overflow-hidden">
                  <div className="p-4 bg-[#f5f6f8] border-b border-black/5 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0c0f10]">Low Stock Alerts</p>
                    <span className="text-[10px] font-bold text-[#b02500]">{lowStockAlerts.length} Items</span>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto no-scrollbar">
                    {lowStockAlerts.length === 0 ? (
                      <div className="p-10 text-center">
                        <span className="material-symbols-outlined text-[40px] text-[#abadaf] opacity-20 block mb-2">check_circle</span>
                        <p className="text-xs font-bold text-[#abadaf]">All stock levels are healthy</p>
                      </div>
                    ) : (
                      lowStockAlerts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setActiveTab("inventory");
                            setShowNotifications(false);
                          }}
                          className="w-full text-left p-4 border-b border-black/5 hover:bg-[#eff1f3]/50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-black text-[#0c0f10] uppercase tracking-tighter">{a.ingredientName}</p>
                            <span className="text-[10px] font-black text-white bg-[#b02500] px-2 py-0.5 rounded-full">LOW</span>
                          </div>
                          <p className="text-[10px] font-bold text-[#595c5e]">
                            Current: <span className="text-[#0c0f10]">{a.currentQuantity}</span> â€¢ Threshold:{" "}
                            <span className="text-[#0c0f10]">{a.threshold}</span>
                          </p>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="p-3 bg-white border-t border-black/5 text-center">
                    <button
                      type="button"
                      onClick={() => { setActiveTab("inventory"); setShowNotifications(false); }}
                      className="text-[10px] font-black text-[#0c0f10] uppercase tracking-widest hover:text-[#496400] transition-colors"
                    >
                      View Branch Inventory
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => navigate("/profile")} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="text-right">
                <p className="text-sm font-bold tracking-tight">{managerName}</p>
                <p className="text-[10px] text-[#595c5e] font-medium uppercase tracking-widest">{branchName}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#c5fe3c] flex items-center justify-center font-black text-[#364b00] text-lg shadow-sm hover:shadow-md transition-shadow">
                {managerName.charAt(0).toUpperCase()}
              </div>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="px-8 mt-8">

          {/* Page heading */}
          <div className="flex justify-between items-end mb-8">
            <div>
              {activeTab === "dashboard" ? (
                <>
                  <h2 className="text-3xl font-semibold tracking-tight">
                    <span className="text-[#0c0f10] font-black">{greeting},</span>{" "}
                    <span className="font-black text-[#496400]">{managerName}</span>
                  </h2>
                  <p className="text-[#595c5e] mt-1 font-medium">
                    Here's what's happening at <span className="font-bold text-[#0c0f10]">{branchName}</span> today.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-black tracking-tight text-[#0c0f10]">{pageTitle[activeTab]}</h2>
                  <p className="text-[#595c5e] mt-1 font-medium">{branchName}</p>
                </>
              )}
            </div>
            <div className="flex gap-3">
              {activeTab === "inventory" && (
                <button
                  id="add-ingredient-btn"
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#c5fe3c] text-[#364b00] py-2.5 px-6 rounded-xl font-bold text-sm shadow-[0_4px_14px_0_rgba(197,254,60,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Add New Ingredient
                </button>
              )}
              {activeTab === "dashboard" && (
                <>

                </>
              )}
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TAB: DASHBOARD
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === "dashboard" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-xl hover:-translate-y-1 transition-all shadow-sm border border-black/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[#496400]/10 rounded-lg"><span className="material-symbols-outlined text-[#496400]">inventory</span></div>
                    <span className="text-[11px] font-bold py-1 px-2 bg-[#455f00] text-[#deff95] rounded-full">{inventory.length} items</span>
                  </div>
                  <p className="text-[#595c5e] text-sm font-medium">Inventory Value</p>
                  <h3 className="text-2xl font-bold mt-1">{loading ? "â€”" : `â‚¹${totalInventoryValue.toLocaleString()}`}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl hover:-translate-y-1 transition-all shadow-sm border border-black/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[#b02500]/10 rounded-lg"><span className="material-symbols-outlined text-[#b02500]">warning</span></div>
                    {lowStockAlerts.length > 0 && <span className="text-[11px] font-bold py-1 px-2 bg-[#b02500] text-white rounded-full">Action required</span>}
                  </div>
                  <p className="text-[#595c5e] text-sm font-medium">Low Stock Alerts</p>
                  <h3 className="text-2xl font-bold mt-1">{loading ? "â€”" : `${lowStockAlerts.length} items`}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl hover:-translate-y-1 transition-all shadow-sm border border-black/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[#5d5f00]/10 rounded-lg"><span className="material-symbols-outlined text-[#5d5f00]">shopping_basket</span></div>
                  </div>
                  <p className="text-[#595c5e] text-sm font-medium">Stock Requests</p>
                  <h3 className="text-2xl font-bold mt-1">{loading ? "â€”" : `${stockRequests.length} total`}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl hover:-translate-y-1 transition-all shadow-sm border border-black/5 border-l-4 border-l-[#c5fe3c]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[#eff1f3] rounded-lg"><span className="material-symbols-outlined text-[#595c5e]">pending_actions</span></div>
                  </div>
                  <p className="text-[#595c5e] text-sm font-medium">Pending Requests</p>
                  <h3 className="text-2xl font-bold mt-1">{loading ? "â€”" : `${pendingRequests} requests`}</h3>
                </div>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                  {/* Update Stock */}
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-black/5">
                    <h3 className="text-lg font-bold tracking-tight mb-6">Update Ingredients Stock</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-2">Ingredient</label>
                        <select value={selectedIngredient} onChange={e => setSelectedIngredient(e.target.value)} className="w-full bg-[#eff1f3] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none">
                          <option value="">Select ingredient...</option>
                          {inventory.map(i => <option key={i.id} value={i.ingredientName}>{i.ingredientName} ({i.quantity} {i.unit})</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-2">Quantity</label>
                          <input value={updateQty || ""} onChange={e => setUpdateQty(Number(e.target.value))} className="w-full bg-[#eff1f3] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none" placeholder="0" type="number" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-2">Action</label>
                          <div className="flex bg-[#eff1f3] p-1 rounded-xl">
                            <button onClick={() => setUpdateAction("add")} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${updateAction === "add" ? "bg-white shadow-sm text-[#0c0f10]" : "text-[#595c5e]"}`} type="button">Add</button>
                            <button onClick={() => setUpdateAction("reduce")} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${updateAction === "reduce" ? "bg-white shadow-sm text-[#0c0f10]" : "text-[#595c5e]"}`} type="button">Reduce</button>
                          </div>
                        </div>
                      </div>
                      <button onClick={handleUpdateStock} disabled={isUpdating || !selectedIngredient} className="w-full bg-[#496400] text-white py-4 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-all shadow-sm disabled:opacity-50">
                        {isUpdating ? "Updating..." : "Update Stock"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Low Stock Alerts */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-black/5">
                      <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-[#b02500]">report</span>
                        <h3 className="text-lg font-bold tracking-tight">Low Stock Alerts</h3>
                      </div>
                      {loading ? (
                        <p className="text-sm text-[#abadaf] text-center py-4">Loading alerts...</p>
                      ) : lowStockAlerts.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-[#c5fe3c]/20 rounded-xl">
                          <span className="material-symbols-outlined text-[#496400] text-3xl">check_circle</span>
                          <p className="text-sm text-[#595c5e] font-medium mt-2">All stock levels are healthy!</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                          {lowStockAlerts.map(alert => (
                            <div key={alert.id} className="flex justify-between items-center p-4 bg-[#b02500]/5 rounded-xl border-l-4 border-[#b02500]">
                              <div>
                                <p className="text-sm font-bold">{alert.ingredientName}</p>
                                <p className="text-xs text-[#b02500] font-medium">{alert.currentQuantity} left (Threshold: {alert.threshold})</p>
                              </div>
                              <span className="text-[10px] font-black px-2 py-1 bg-[#b02500] text-white rounded-lg">CRITICAL</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Activity Panel */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-black/5">
                      <h3 className="text-lg font-bold tracking-tight mb-6">Activity Panel</h3>
                      {loading ? (
                        <p className="text-sm text-[#abadaf] text-center py-4">Loading activity...</p>
                      ) : auditLogs.length === 0 ? (
                        <p className="text-sm text-[#abadaf] text-center py-4">No recent activity.</p>
                      ) : (
                        <div className="space-y-6 max-h-[250px] overflow-y-auto pr-1">
                          {auditLogs.slice(0, 5).map(log => (
                            <div key={log.id} className="flex gap-4">
                              <div className="w-8 h-8 rounded-full bg-[#c5fe3c] flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-[#496400] text-sm">history</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{log.action}</p>
                                {log.details && <p className="text-xs text-[#496400] font-bold">{log.details}</p>}
                                <p className="text-[10px] text-[#595c5e] mt-1">{formatDate(log.timestamp || log.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TAB: BRANCH INVENTORY
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === "inventory" && (
            <>
              {/* Summary row */}
              <div className="flex gap-4 mb-8">
                {[
                  { label: "Total Items", value: inventory.length, icon: "inventory_2", color: "text-[#496400]", bg: "bg-[#496400]/10" },
                  { label: "Inventory Value", value: `\u20B9${totalInventoryValue.toLocaleString()}`, icon: "payments", color: "text-[#5d5f00]", bg: "bg-[#5d5f00]/10" },
                  { label: "Low / Critical", value: inventory.filter(i => stockLevel(i.quantity, i.threshold) !== "ok").length, icon: "warning", color: "text-[#b02500]", bg: "bg-[#b02500]/10" },
                ].map(s => (
                  <div key={s.label} className="flex-1 bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm border border-black/5">
                    <div className={`p-3 rounded-xl ${s.bg}`}>
                      <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#595c5e] uppercase tracking-widest">{s.label}</p>
                      <p className="text-2xl font-black tracking-tight">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* â”€â”€ Ingredient list table â”€â”€ */}
              <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">

                {/* Column headers */}
                <div className="grid grid-cols-[2fr_1.2fr_1.5fr_1.8fr_1.5fr_auto] gap-6 items-center px-8 py-4 border-b border-black/5 bg-[#f9fafb]">
                  {["Ingredient / ID", "Current Level", "Expiry Risk", "Usage Rate", "New Stock", "Branch Action"].map(h => (
                    <span key={h} className="text-[10px] font-black text-[#abadaf] uppercase tracking-widest whitespace-nowrap">{h}</span>
                  ))}
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <span className="material-symbols-outlined text-5xl text-[#c5fe3c] animate-spin" style={{ animationDuration: "1.5s" }}>progress_activity</span>
                    <p className="text-[#595c5e] font-medium">Loading inventory...</p>
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-[#eff1f3] flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-[#abadaf]">inventory_2</span>
                    </div>
                    <p className="text-[#595c5e] font-semibold">
                      {inventorySearch ? `No ingredients matching "${inventorySearch}"` : "No ingredients in this branch yet."}
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-[#c5fe3c] text-[#364b00] py-2.5 px-6 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-all flex items-center gap-2 shadow-[0_4px_14px_0_rgba(197,254,60,0.4)]"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      Add First Ingredient
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    {filteredInventory.map((item) => {
                      const level = stockLevel(item.quantity, item.threshold);

                      const usageRate = Math.max(5, Math.min(95, Math.round((item.quantity / Math.max(item.threshold * 3, 1)) * 100)));

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[2fr_1.2fr_1.5fr_1.8fr_1.5fr_auto] gap-6 items-center px-8 py-6 hover:bg-[#fafafa] transition-colors border-b border-black-[0.02] last:border-b-0 group"
                        >
                          {/* Col 1 â€” Ingredient / ID */}
                          <div className="flex items-center gap-4">
                            <div className="relative w-12 h-12 rounded-xl bg-[#13171a] flex items-center justify-center overflow-hidden flex-shrink-0">
                              {level === "critical" && (
                                <span className="absolute top-1 right-0 text-[7px] font-black bg-[#c5fe3c] text-[#0c0f10] px-1 rounded-sm shadow-sm">NEW</span>
                              )}
                              <span className={`material-symbols-outlined text-[20px] ${level === "critical" ? "text-[#dc2626]" : "text-[#595c5e]"}`}>
                                {level === "critical" ? "shield_locked" : "inventory_2"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#0c0f10] text-sm tracking-tight leading-tight truncate">{item.ingredientName}</p>
                              <p className="text-[10px] text-[#abadaf] font-mono mt-0.5">#{String(item.id).padStart(3, "0")} / BATCH001</p>
                              <p className="text-[10px] text-[#abadaf]">(GLOBAL HUB)</p>
                            </div>
                          </div>

                          {/* Col 2 â€” Current Level */}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-black ${level === "critical" ? "text-[#dc2626]" : "text-[#2563eb]"
                                }`}>
                                {item.quantity} {item.unit || "units"}
                              </p>
                              <span className={`material-symbols-outlined text-sm font-bold ${level === "critical" ? "text-[#dc2626]" : "text-[#2563eb]"
                                }`}>
                                {level === "critical" ? "trending_down" : "trending_up"}
                              </span>
                            </div>
                          </div>

                          {/* Col 3 â€” Expiry Risk */}
                          <div>
                            <p className={`text-sm font-bold ${level === "critical" ? "text-[#dc2626]" : "text-[#0c0f10]"
                              }`}>
                              {level === "critical" ? "Expired" : "Low Risk"}
                            </p>
                            <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${level === "critical" ? "text-[#dc2626]" : "text-[#abadaf]"
                              }`}>
                              {level === "critical" ? "HAZARDOUS BATCH" : "STABLE"}
                            </p>
                          </div>

                          {/* Col 4 â€” Usage Rate */}
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-[#0c0f10] tracking-tight">{usageRate}% / day</span>
                            <div className="h-1.5 bg-[#eff1f3] rounded-full overflow-hidden w-12">
                              <div className="h-full rounded-full bg-[#364b00]" style={{ width: `${usageRate}%` }} />
                            </div>
                          </div>

                          {/* Col 5 â€” New Stock */}
                          <div>
                            {level === "critical" ? (
                              <button className="bg-[#0c0f10] text-[#c5fe3c] text-[9px] font-black px-4 py-2.5 rounded-lg hover:bg-[#1f2937] transition-all tracking-widest uppercase">
                                ADD NEW STOCK
                              </button>
                            ) : (
                              <span className="text-[9px] font-black text-[#dadde0] tracking-widest uppercase">
                                REPLENISHED
                              </span>
                            )}
                          </div>

                          {/* Col 6 â€” Branch Action */}
                          <div className="flex items-center gap-4 justify-end transition-opacity">
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-[#3b82f6] hover:scale-110 transition-transform"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteInventory(item.id)}
                              className="text-[#ef4444] hover:scale-110 transition-transform"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer / pagination */}
                {!loading && filteredInventory.length > 0 && (
                  <div className="px-6 py-4 border-t border-black/5 flex justify-between items-center bg-[#f9fafb]">
                    <p className="text-xs text-[#595c5e]">
                      Page <span className="font-bold text-[#0c0f10]">1</span> of{" "}
                      <span className="font-bold text-[#0c0f10]">{Math.ceil(filteredInventory.length / 10)}</span>{" "}
                      batches for <span className="font-bold text-[#496400]">{branchName}</span>
                    </p>
                    <div className="flex gap-1">
                      <button className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center text-[#595c5e] hover:bg-white hover:border-[#c5fe3c] transition-all">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>
                      <button className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center text-[#595c5e] hover:bg-white hover:border-[#c5fe3c] transition-all">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TAB: STOCK REQUESTS
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === "stock-requests" && (
            <div className="grid grid-cols-12 gap-8">
              {/* Request Form */}
              <div className="col-span-12 lg:col-span-4">
                <div className="bg-[#0c0f10] p-8 rounded-xl text-white shadow-xl shadow-black/5">
                  <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#c5fe3c]">add_shopping_cart</span>
                    Create Stock Request
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Product Name</label>
                      <select value={reqIngredient} onChange={e => setReqIngredient(e.target.value)} className="w-full bg-white/10 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none text-white">
                        <option className="text-black" value="">Select product...</option>
                        {inventory.map(i => <option key={i.id} className="text-black" value={i.ingredientName}>{i.ingredientName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Required Quantity</label>
                      <input value={reqQuantity} onChange={e => setReqQuantity(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-white/10 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none text-white placeholder-white/30" placeholder="e.g., 50" type="number" />
                    </div>
                    <button onClick={handleStockRequest} disabled={isRequesting || !reqIngredient} className="w-full bg-[#c5fe3c] text-[#364b00] py-4 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-all shadow-[0_4px_14px_0_rgba(197,254,60,0.4)] disabled:opacity-50 disabled:hover:translate-y-0">
                      {isRequesting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Request History */}
              <div className="col-span-12 lg:col-span-8 flex flex-col">
                <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden flex-1">
                  <div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#f5f6f8]">
                    <h3 className="text-lg font-bold tracking-tight">Request History</h3>
                  </div>
                  {loading ? (
                    <div className="p-12 text-center text-[#abadaf] text-sm">Loading requests...</div>
                  ) : stockRequests.length === 0 ? (
                    <div className="p-24 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-full bg-[#eff1f3] flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-[#abadaf]">history</span>
                      </div>
                      <p className="text-[#595c5e] font-semibold">No stock requests found.</p>
                      <p className="text-xs text-[#abadaf] mt-1">Submit your first request using the form.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white border-b border-black/5">
                          <tr>
                            {["Request ID", "Product", "Quantity", "Status", "Date", "Action"].map(h => (
                              <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-[#595c5e] uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {stockRequests.map(req => (
                            <tr key={req.id} className="hover:bg-[#fafafa] transition-colors group">
                              <td className="px-6 py-5 text-sm font-bold text-[#0c0f10]">#{`REQ-${req.id}`}</td>
                              <td className="px-6 py-5">
                                <span className="font-semibold">{req.productName || req.ingredientName || "â€”"}</span>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-sm font-black">{req.requestedQuantity || req.quantity || "â€”"}</span>
                              </td>
                              <td className="px-6 py-5">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-tight ${statusBadge(req.status)}`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-sm font-medium text-[#595c5e]">
                                {formatDate(req.createdAt || req.requestedAt)}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right">
                                {req.status === 'DISPATCHED' && (
                                  <button
                                    onClick={() => handleReceiveRequest(req.id)}
                                    className="bg-[#c5fe3c] text-[#364b00] text-xs font-bold px-4 py-2 rounded-lg hover:-translate-y-0.5 transition-all shadow-sm"
                                  >
                                    Confirm Receipt
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TAB: PRODUCTS (catalog view for branch manager)
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === "update-stock" && (
            <div className="space-y-8">
              {/* Stats Grid â€” match owner Product page */}
              <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-2 bg-white p-6 rounded-xl shadow-[0px_24px_48px_rgba(44,47,49,0.06)] flex flex-col justify-between overflow-hidden relative group">
                  <div className="z-10">
                    <p className="text-[#595c5e] text-sm font-medium mb-1">Total Inventory Value</p>
                    <h2 className="text-4xl font-extrabold tracking-tight text-[#2c2f31]">
                      â‚¹{products.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}
                    </h2>
                  </div>
                  <div className="mt-4 flex items-center gap-2 z-10">
                    <span className="bg-[#c5fe3c]/20 text-[#455f00] px-2 py-1 rounded-full text-xs font-bold">Live</span>
                    <span className="text-[#595c5e] text-xs italic">Based on current catalog</span>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <span className="material-symbols-outlined text-9xl">trending_up</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-[0px_24px_48px_rgba(44,47,49,0.06)]">
                  <p className="text-[#595c5e] text-sm font-medium mb-1">Total Products</p>
                  <h2 className="text-4xl font-extrabold tracking-tight text-[#2c2f31]">{products.length}</h2>
                  <p className="text-[#595c5e] text-xs mt-4">Visible to this branch</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-[0px_24px_48px_rgba(44,47,49,0.06)]">
                  <p className="text-[#595c5e] text-sm font-medium mb-1">Active Recipes</p>
                  <h2 className="text-4xl font-extrabold tracking-tight text-[#2c2f31]">
                    {products.filter(p => (p.recipes?.length || 0) > 0).length}
                  </h2>
                  <p className="text-[#595c5e] text-xs mt-4">Products with compositions</p>
                </div>
              </section>

              {/* Table Section â€” match owner Product page */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">Product Catalog</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openNewProductEditor}
                      className="bg-[#c5fe3c] text-[#364b00] px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1 hover:scale-105 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      New Product
                    </button>
                    <button className="p-2 hover:bg-[#e0e3e5] rounded-lg transition-colors" type="button">
                      <span className="material-symbols-outlined text-[#595c5e]">filter_list</span>
                    </button>
                    <button className="p-2 hover:bg-[#e0e3e5] rounded-lg transition-colors" type="button">
                      <span className="material-symbols-outlined text-[#595c5e]">sort</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-[0px_24px_48px_rgba(44,47,49,0.06)] overflow-hidden overflow-x-auto no-scrollbar">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#eff1f3]/50 border-b border-[#e0e3e5]">
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#595c5e]">Product</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#595c5e]">Category</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#595c5e]">Recipe Composition</th>
                        <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-[#595c5e] text-center">Retail Price</th>
                        <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-[#595c5e]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eff1f3]">
                      {(loading ? [] : products)
                        .filter(p => p.name.toLowerCase().includes(inventorySearch.toLowerCase()))
                        .map(product => (
                          <tr key={product.id} className="group hover:bg-[#eff1f3]/40 transition-colors duration-200">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    className="w-12 h-12 rounded-xl object-cover shadow-sm ring-1 ring-black/5"
                                    alt={product.name}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-[#eff1f3] flex items-center justify-center text-[#595c5e] font-bold shadow-sm ring-1 ring-black/5">
                                    {product.name.charAt(0)}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold">{product.name}</span>
                                  <span className="text-[10px] text-[#595c5e] w-48 truncate">{product.description || "No description provided"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="px-2 py-1 rounded-md bg-[#e0e3e5] text-[#2c2f31] text-[11px] font-medium">
                                {product.category || "Uncategorized"}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-1">
                                  {product.recipes && product.recipes.length > 0 ? (
                                    <>
                                      {product.recipes.slice(0, 2).map((r, i) => (
                                        <span key={i} className="px-1.5 py-0.5 rounded bg-black/5 text-[10px] text-[#595c5e] capitalize">{r.ingredientName}</span>
                                      ))}
                                      {product.recipes.length > 2 && (
                                        <span className="px-1.5 py-0.5 rounded bg-black/5 text-[10px] text-[#595c5e]">+{product.recipes.length - 2} more</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">No recipe</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setViewingRecipeProduct(product)}
                                  className="text-[#496400] text-[10px] font-bold flex items-center gap-1 hover:opacity-80 transition-opacity"
                                >
                                  <span className="material-symbols-outlined text-xs">visibility</span> VIEW RECIPE
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-sm font-bold text-[#2c2f31]">â‚¹{(product.price || 0).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button
                                type="button"
                                onClick={() => openEditProductEditor(product)}
                                className="material-symbols-outlined text-[#595c5e] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#496400]"
                              >
                                edit
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {loading && (
                    <div className="p-10 text-center text-[#abadaf] text-sm">Loading products...</div>
                  )}
                  {!loading && products.length === 0 && (
                    <div className="p-10 text-center text-[#abadaf] text-sm">No products found.</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TAB: ORDERS
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === "orders" && (
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 flex flex-col">
                <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden flex-1">
                  <div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#f5f6f8]">
                    <h3 className="text-lg font-bold tracking-tight">Order History</h3>
                    <span className="text-xs font-bold text-[#595c5e]">
                      {loadingOrders ? "Loading..." : `${branchBills.length} records`}
                    </span>
                  </div>

                  {loadingOrders ? (
                    <div className="p-12 text-center text-[#abadaf] text-sm">Loading orders...</div>
                  ) : branchBills.length === 0 ? (
                    <div className="p-24 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-full bg-[#eff1f3] flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-[#abadaf]">receipt_long</span>
                      </div>
                      <p className="text-[#595c5e] font-semibold">No orders found for this branch.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white border-b border-black/5">
                          <tr>
                            {["Bill ID", "Order ID", "Product", "Qty", "Customer", "Total", "Date"].map(h => (
                              <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-[#595c5e] uppercase tracking-widest">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {branchBills
                            .filter(b => {
                              const q = inventorySearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                String(b.id).includes(q) ||
                                String(b.order?.id ?? "").includes(q) ||
                                (b.productName || "").toLowerCase().includes(q) ||
                                (b.customer?.name || "").toLowerCase().includes(q)
                              );
                            })
                            .map(b => (
                              <tr key={b.id} className="hover:bg-[#fafafa] transition-colors">
                                <td className="px-6 py-5 text-sm font-bold text-[#0c0f10]">#{b.id}</td>
                                <td className="px-6 py-5 text-sm font-bold text-[#496400]">#{b.order?.id ?? "â€”"}</td>
                                <td className="px-6 py-5 text-sm font-semibold text-[#0c0f10]">{b.productName}</td>
                                <td className="px-6 py-5 text-sm">{b.quantity}</td>
                                <td className="px-6 py-5 text-sm text-[#595c5e]">
                                  <div className="font-medium text-[#0c0f10]">{b.customer?.name || "â€”"}</div>
                                  {b.customer?.phone && <div className="text-xs text-[#abadaf]">{b.customer.phone}</div>}
                                </td>
                                <td className="px-6 py-5 text-right text-sm font-black text-[#0c0f10]">
                                  â‚¹{Number(b.totalAmount).toFixed(2)}
                                </td>
                                <td className="px-6 py-5 text-right text-xs font-medium text-[#595c5e] whitespace-nowrap">
                                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "â€”"}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TAB: BILLING
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              {/* Sub-tab switcher */}
              <div className="flex gap-1 bg-[#eff1f3] p-1 rounded-xl w-fit">
                {(["products", "checkout", "history"] as const).map(t => (
                  <button key={t} onClick={() => { setBillingTab(t); if (t === "history") fetchBillingHistory(); }}
                    className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all capitalize ${billingTab === t ? "bg-white text-[#0c0f10] shadow-sm" : "text-[#595c5e] hover:text-[#0c0f10]"
                      }`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Products sub-tab */}
              {billingTab === "products" && (
                <div className="flex gap-6">
                  <div className="flex-1 space-y-5">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                      <input className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-black/5 outline-none focus:ring-2 focus:ring-[#c5fe3c]/50 text-sm font-medium shadow-sm"
                        placeholder="Search products..." value={billingSearch} onChange={e => setBillingSearch(e.target.value)} />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {["All", ...Array.from(new Set(products.map(p => p.category || "")))].filter(Boolean).map(cat => (
                        <button key={cat} onClick={() => setBillingCategory(cat)}
                          className={`px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${billingCategory === cat ? "bg-[#c5fe3c] text-[#364b00] shadow-md" : "bg-white text-slate-400 border border-black/5"
                            }`}>{cat}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {products
                        .filter(p => (billingCategory === "All" || p.category === billingCategory) && p.name.toLowerCase().includes(billingSearch.toLowerCase()))
                        .map(p => {
                          const cartItem = billingCart.find(i => i.id === p.id);
                          return (
                            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex flex-col group hover:shadow-lg transition-all">
                              <div className="relative h-32 w-full mb-3 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
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
                                <span className="text-lg font-black text-[#496400]">â‚¹{p.price.toFixed(2)}</span>
                                {cartItem ? (
                                  <div className="flex items-center bg-[#c5fe3c]/10 rounded-xl border border-[#c5fe3c]/30 overflow-hidden">
                                    <button onClick={() => billingUpdateQty(p.id, -1)} className="p-2 hover:bg-[#c5fe3c] transition-colors"><span className="material-symbols-outlined text-sm">remove</span></button>
                                    <span className="px-3 text-xs font-black text-[#364b00]">{cartItem.qty}</span>
                                    <button onClick={() => billingUpdateQty(p.id, 1)} className="p-2 hover:bg-[#c5fe3c] transition-colors"><span className="material-symbols-outlined text-sm">add</span></button>
                                  </div>
                                ) : (
                                  <button onClick={() => billingAddToCart(p)}
                                    className="bg-[#c5fe3c] text-[#364b00] px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">add</span> Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Cart sidebar */}
                  <aside className="w-72 bg-white rounded-2xl p-6 shadow-xl border border-black/5 h-fit sticky top-24 flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-5">
                      <h2 className="text-base font-black">Cart</h2>
                      <span className="bg-[#eff1f3] px-3 py-1 rounded-full text-[10px] font-black text-[#595c5e]">{billingCart.reduce((s, i) => s + i.qty, 0)} items</span>
                    </div>
                    <div className="flex-grow space-y-3 overflow-y-auto no-scrollbar">
                      {billingCart.length > 0 ? billingCart.map(item => (
                        <div key={item.id} className="flex items-center gap-3 group">
                          <div className="bg-slate-100 h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">x{item.qty}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{item.name}</p>
                            <p className="text-[11px] font-black text-[#496400]">â‚¹{(item.price * item.qty).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => billingUpdateQty(item.id, -1)} className="p-1 hover:bg-slate-100 rounded"><span className="material-symbols-outlined text-xs">remove</span></button>
                            <button onClick={() => billingUpdateQty(item.id, 1)} className="p-1 hover:bg-slate-100 rounded"><span className="material-symbols-outlined text-xs">add</span></button>
                          </div>
                        </div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                          <span className="material-symbols-outlined text-5xl mb-2">shopping_bag</span>
                          <p className="text-xs font-bold text-center">Cart is empty</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t mt-4 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subtotal</span>
                        <span className="text-xl font-black">â‚¹{billingCartTotal.toFixed(2)}</span>
                      </div>
                      <button onClick={() => setBillingTab("checkout")} disabled={billingCart.length === 0}
                        className="w-full py-3 bg-black text-[#c5fe3c] font-black rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30">
                        Proceed to Checkout
                      </button>
                    </div>
                  </aside>
                </div>
              )}

              {/* Checkout sub-tab */}
              {billingTab === "checkout" && (
                <div className="flex gap-8">
                  <div className="flex-1 bg-white rounded-2xl p-8 shadow-sm border border-black/5 space-y-6">
                    <h3 className="text-xl font-black">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Customer Name</label>
                        <input type="text" value={billingCustomerName} onChange={e => setBillingCustomerName(e.target.value)}
                          className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c]"
                          placeholder="Walk-in Guest" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Phone</label>
                        <input type="tel" value={billingCustomerPhone} onChange={e => setBillingCustomerPhone(e.target.value)}
                          className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#c5fe3c]"
                          placeholder="+91 XXXXX XXXXX" />
                      </div>
                    </div>
                    {billingError && <p className="text-red-500 text-xs font-semibold">{billingError}</p>}
                  </div>

                  {/* Invoice preview */}
                  <aside className="w-72 bg-[#0c0f10] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-fit sticky top-24">
                    <div className="p-6 border-b border-white/10">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">#INV-PREVIEW</p>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/50">Customer</span>
                          <span className="text-[#c5fe3c] font-bold">{billingCustomerName || "Walk-in"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Branch</span>
                          <span className="text-white font-bold">{branchName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                      {billingCart.map(item => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-white/60">{item.name} x{item.qty}</span>
                          <span className="text-white font-bold">â‚¹{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 border-t border-white/10">
                      <div className="flex justify-between mb-4">
                        <span className="text-white/50 text-sm">Total</span>
                        <span className="text-white font-black text-xl">â‚¹{billingCartTotal.toFixed(2)}</span>
                      </div>
                      <button onClick={handleFinalizeBilling} disabled={isFinalizing || billingCart.length === 0}
                        className="w-full py-3 bg-[#c5fe3c] text-[#364b00] font-black rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40">
                        {isFinalizing ? "Processing..." : "Finalize & Store"}
                      </button>
                    </div>
                  </aside>
                </div>
              )}

              {/* History sub-tab */}
              {billingTab === "history" && (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5">
                  <div className="p-5 border-b border-black/5 bg-[#f5f6f8] flex justify-between items-center">
                    <h3 className="font-black text-sm">Billing History â€” {branchName}</h3>
                    <button onClick={fetchBillingHistory} className="text-[10px] font-black text-[#496400] uppercase tracking-widest hover:underline">Refresh</button>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-[#f5f6f8]">
                      <tr>
                        {["Customer", "Product", "Qty", "Amount", "Date"].map(h => (
                          <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f6f8]">
                      {billingHistory.length > 0 ? billingHistory.map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold">{b.customer?.name || "Walk-in"}</p>
                            <p className="text-[10px] text-slate-400">{b.customer?.phone}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">{b.productName}</td>
                          <td className="px-6 py-4 text-sm">{b.quantity}</td>
                          <td className="px-6 py-4"><span className="text-sm font-black text-[#496400]">â‚¹{b.totalAmount?.toLocaleString()}</span></td>
                          <td className="px-6 py-4 text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">No billing history yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TAB: STAFF
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === "staff" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-[#0c0f10]">Branch Team</h3>
                  <p className="text-sm text-[#595c5e] mt-0.5">{branchName}</p>
                </div>
                <button onClick={() => { fetchStaff(); setShowAddStaffModal(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#c5fe3c] text-[#364b00] rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-md">
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Add Staff
                </button>
              </div>

              {staffList.length === 0 && managerList.length === 0 && (
                <div className="flex justify-center py-4">
                  <button onClick={fetchStaff} className="text-xs font-black text-[#496400] uppercase tracking-widest hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">refresh</span> Load Team
                  </button>
                </div>
              )}

              {managerList.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Managers ({managerList.length})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {managerList.map(u => (
                      <div key={u.id} className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-[#0c0f10] truncate">{u.name}</p>
                          <p className="text-[11px] text-[#595c5e] truncate">{u.email}</p>
                          <p className="text-[10px] text-[#abadaf]">{u.phone}</p>
                        </div>
                        <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-widest shrink-0">MGR</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-3">Staff ({staffList.length})</p>
                {staffList.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
                    <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">group_off</span>
                    <p className="text-slate-400 text-sm font-semibold">No staff assigned yet.</p>
                    <button onClick={() => setShowAddStaffModal(true)} className="mt-4 text-xs font-black text-[#496400] uppercase tracking-widest hover:underline">
                      + Add first staff member
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staffList.map(u => (
                      <div key={u.id} className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black text-lg shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-[#0c0f10] truncate">{u.name}</p>
                          <p className="text-[11px] text-[#595c5e] truncate">{u.email}</p>
                          <p className="text-[10px] text-[#abadaf]">{u.phone}</p>
                        </div>
                        <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-1 rounded-full uppercase tracking-widest shrink-0">STAFF</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              PLACEHOLDER TABS
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {!["dashboard", "inventory", "stock-requests", "orders", "billing", "update-stock", "staff"].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#eff1f3] flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-[#abadaf]">
                  {navItems.find(n => n.id === activeTab)?.icon || "hourglass_empty"}
                </span>
              </div>
              <p className="text-lg font-bold text-[#0c0f10]">{pageTitle[activeTab]}</p>
              <p className="text-sm text-[#595c5e]">This section is coming soon.</p>
            </div>
          )}

        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => activeTab === "inventory" ? setShowAddModal(true) : setActiveTab("update-stock")}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#c5fe3c] text-[#364b00] rounded-full shadow-2xl flex items-center justify-center hover:-translate-y-1 transition-all z-50"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* â”€â”€ Staff Tab Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "staff" && (
        <div className="fixed inset-0 z-0 pointer-events-none" />
      )}

      {/* â”€â”€ Add Staff Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-[#0c0f10] px-8 py-6 flex justify-between items-center">
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">Add Staff</h2>
                <p className="text-white/40 text-xs mt-0.5">Register new staff for {branchName}</p>
              </div>
              <button onClick={() => setShowAddStaffModal(false)} className="text-white/50 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-4">
              {[
                { label: "Full Name", value: staffFormName, setter: setStaffFormName, type: "text", placeholder: "e.g. Ravi Kumar" },
                { label: "Email", value: staffFormEmail, setter: setStaffFormEmail, type: "email", placeholder: "name@company.com" },
                { label: "Phone (10â€“15 digits)", value: staffFormPhone, setter: setStaffFormPhone, type: "tel", placeholder: "9876543210" },
                { label: "Password", value: staffFormPassword, setter: setStaffFormPassword, type: "password", placeholder: "Min 8 chars, upper, lower, number, special" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)}
                    className="w-full bg-[#eff1f3] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#c5fe3c] outline-none"
                    placeholder={f.placeholder} />
                </div>
              ))}
              {staffFormError && <p className="text-red-500 text-xs font-semibold">{staffFormError}</p>}
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => setShowAddStaffModal(false)}
                className="flex-1 py-3 rounded-xl border border-black/10 text-sm font-semibold hover:bg-[#eff1f3] transition-all">
                Cancel
              </button>
              <button onClick={handleAddStaff} disabled={isAddingStaff}
                className="flex-1 py-3 rounded-xl bg-[#c5fe3c] text-[#364b00] text-sm font-black shadow-[0_4px_14px_0_rgba(197,254,60,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {isAddingStaff ? "Creating..." : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Editor Modal (manager add/edit + recipe) */}
      {showProductEditor && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#0c0f10] px-8 py-6 flex justify-between items-center">
              <div>
                <h3 className="text-white font-black text-lg tracking-tight">{selectedProduct ? "Edit Product" : "New Product"}</h3>
                <p className="text-white/40 text-xs mt-0.5">Manage catalog item for all branches/owner</p>
              </div>
              <button onClick={() => setShowProductEditor(false)} className="text-white/60 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Product Name</label>
                  <input value={prodName} onChange={e => setProdName(e.target.value)} className="w-full bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none" />
                </div>
                {customCategoryInput ? (
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Category</label>
                    <div className="flex gap-2">
                      <input autoFocus
                        className="flex-1 bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c5fe3c]"
                        placeholder="New category name..."
                        value={prodCategory}
                        onChange={e => setProdCategory(e.target.value)}
                      />
                      <button type="button" onClick={() => setCustomCategoryInput(false)}
                        className="px-3 py-2 bg-[#eff1f3] rounded-xl text-xs font-bold text-[#595c5e] hover:bg-[#e0e3e5]">✕</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Category</label>
                    <select value={prodCategory}
                      onChange={e => {
                        if (e.target.value === "__new__") { setProdCategory(""); setCustomCategoryInput(true); }
                        else setProdCategory(e.target.value);
                      }}
                      className="w-full bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none">
                      {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {!products.some(p => p.category === prodCategory) && prodCategory && (
                        <option value={prodCategory}>{prodCategory}</option>
                      )}
                      <option value="__new__">＋ Add new category...</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Price</label>
                  <input type="number" value={prodPrice || ""} onChange={e => setProdPrice(Number(e.target.value))} className="w-full bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Image URL</label>
                <input value={prodImageUrl} onChange={e => setProdImageUrl(e.target.value)} className="w-full bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Description</label>
                <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} className="w-full bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none min-h-[70px]" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest mb-1.5">Preparation Instructions</label>
                <textarea value={prodInstructions} onChange={e => setProdInstructions(e.target.value)} className="w-full bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none min-h-[90px]" />
              </div>
            </div>

            <div className="pt-3 border-t border-black/5 space-y-3">
              <label className="block text-[11px] font-bold text-[#595c5e] uppercase tracking-widest">Recipe Composition</label>
              <div className="relative">
                <input
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                  placeholder="Search ingredient from branch inventory..."
                  className="w-full bg-[#eff1f3] rounded-xl px-4 py-3 text-sm outline-none pr-12"
                />
                <button type="button" onClick={() => addRecipeIngredient(ingredientSearch)} className="absolute right-2 top-2 bg-[#c5fe3c] text-[#364b00] p-1.5 rounded-md">
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
                {ingredientSearch && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#eff1f3] rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                    {inventory
                      .filter(i => i.ingredientName?.toLowerCase().includes(ingredientSearch.toLowerCase()))
                      .map(i => (
                        <button type="button" key={i.id} onClick={() => addRecipeIngredient(i.ingredientName)} className="block w-full text-left px-4 py-2 text-sm hover:bg-[#c5fe3c]/10">
                          {i.ingredientName}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {prodIngredients.length === 0 ? (
                  <div className="text-xs text-[#abadaf] italic py-2">No recipe ingredients added.</div>
                ) : prodIngredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_110px_110px_auto] gap-2 items-center bg-[#f9fafb] border border-black/5 rounded-xl p-2.5">
                    <div className="text-sm font-semibold truncate">{ing.ingredientName}</div>
                    <input type="number" value={ing.quantity} onChange={e => updateRecipeIngredient(idx, "quantity", Number(e.target.value))} className="bg-white border border-black/10 rounded-lg px-2 py-1.5 text-sm outline-none" />
                    <select value={ing.unit} onChange={e => updateRecipeIngredient(idx, "unit", e.target.value)} className="bg-white border border-black/10 rounded-lg px-2 py-1.5 text-sm outline-none">
                      <option>kg</option><option>g</option><option>liter</option><option>ml</option><option>pcs</option>
                    </select>
                    <button type="button" onClick={() => removeRecipeIngredient(idx)} className="p-1 text-error hover:bg-red-50 rounded-md">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="px-8 pb-8 flex gap-3">
            <button onClick={() => setShowProductEditor(false)} className="flex-1 py-3 rounded-xl border border-black/10 text-sm font-semibold hover:bg-[#eff1f3]">
              Cancel
            </button>
            <button onClick={handleSaveProduct} disabled={savingProduct || !prodName.trim()} className="flex-1 py-3 rounded-xl bg-[#c5fe3c] text-[#364b00] text-sm font-black disabled:opacity-50">
              {savingProduct ? "Saving..." : (selectedProduct ? "Update Product" : "Create Product")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

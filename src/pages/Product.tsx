import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:8080/Inventa/api";
const getAuthHeader = (user: any) => user?.token ? `Bearer ${user.token}` : `Basic ${user.auth}`;

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    description?: string;
    instructions?: string;
    imageUrl?: string;
    recipes?: Recipe[];
}

interface Recipe {
    id?: number;
    ingredientName: string;
    quantity: number;
    unit: string;
    ingredientId?: number;
}

interface Ingredient {
    id: number;
    ingredientName: string;
    unit: string;
}

interface Branch {
    id: number;
    name: string;
    location: string;
}

export default function Product() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [viewingRecipeProduct, setViewingRecipeProduct] = useState<Product | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Branch state
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | "">("");

    // Form State
    const [formName, setFormName] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formCategory, setFormCategory] = useState("Main Course");
    const [customCategoryInput, setCustomCategoryInput] = useState(false);
    const [formPrice, setFormPrice] = useState(0);
    const [formImageUrl, setFormImageUrl] = useState("");
    const [formInstructions, setFormInstructions] = useState("");
    const [formIngredients, setFormIngredients] = useState<Recipe[]>([]);

    const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
    const [ingredientSearch, setIngredientSearch] = useState("");

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            navigate("/");
            return;
        }
        fetchBranches();
        fetchAvailableIngredients();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [selectedBranchId]);

    const fetchBranches = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const res = await fetch(`${API_BASE}/branches/my`, {
                headers: { 'Authorization': getAuthHeader(user) }
            });
            if (res.ok) {
                const data: Branch[] = await res.json();
                setBranches(data);
            }
        } catch (err) {
            console.error("Failed to fetch branches", err);
        }
    };

    const fetchAvailableIngredients = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const res = await fetch(`${API_BASE}/warehouse/inventory`, {
                headers: { 'Authorization': getAuthHeader(user) }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter to unique names to avoid dropdown clutter
                const unique: Ingredient[] = [];
                const seen = new Set();
                data.forEach((item: any) => {
                    if (!item.ingredientName) return; // Skip null/undefined ingredient names
                    const name = item.ingredientName.toLowerCase();
                    if (!seen.has(name)) {
                        seen.add(name);
                        unique.push({
                            id: item.id,
                            ingredientName: item.ingredientName,
                            unit: item.unit
                        });
                    }
                });
                setAvailableIngredients(unique);
            }
        } catch (err) {
            console.error("Failed to fetch available ingredients", err);
        }
    };

    const fetchProducts = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const url = selectedBranchId !== ""
                ? `${API_BASE}/products/available?branchId=${selectedBranchId}`
                : `${API_BASE}/products`;
            const res = await fetch(url, {
                headers: { 'Authorization': getAuthHeader(user) }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            } else {
                const msg = await res.text();
                console.error("Failed to fetch products:", res.status, msg);
            }
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setFormName(product.name);
        setFormDesc(product.description || "");
        setFormCategory(product.category);
        setFormPrice(product.price);
        setFormImageUrl(product.imageUrl || "");
        setFormInstructions(product.instructions || "");
        setFormIngredients(product.recipes || []);
        setShowSidebar(true);
    };

    const handleAddNew = () => {
        setSelectedProduct(null);
        setFormName("");
        setFormDesc("");
        setFormCategory("Main Course");
        setCustomCategoryInput(false);
        setFormPrice(0);
        setFormImageUrl("");
        setFormInstructions("");
        setFormIngredients([]);
        setShowSidebar(true);
    };

    const addIngredient = (name: string) => {
        if (!name) return;
        const matchingAvailable = availableIngredients.find(i => i.ingredientName?.toLowerCase() === name.toLowerCase());
        const existing = formIngredients.find(i => i.ingredientName?.toLowerCase() === name.toLowerCase());

        if (!existing) {
            setFormIngredients([...formIngredients, {
                ingredientName: name,
                quantity: 1,
                unit: matchingAvailable?.unit || "kg",
                ingredientId: matchingAvailable?.id
            }]);
        }
        setIngredientSearch("");
    };

    const removeIngredient = (idx: number) => {
        setFormIngredients(formIngredients.filter((_, i) => i !== idx));
    };

    const updateIngredient = (idx: number, field: keyof Recipe, value: any) => {
        const newIngs = [...formIngredients];
        newIngs[idx] = { ...newIngs[idx], [field]: value };
        setFormIngredients(newIngs);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const payload = {
                id: selectedProduct?.id,
                name: formName,
                description: formDesc,
                category: formCategory,
                price: formPrice,
                instructions: formInstructions,
                imageUrl: formImageUrl,
                branchId: selectedBranchId !== "" ? selectedBranchId : null,
                recipes: formIngredients
            };

            const res = await fetch(`${API_BASE}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getAuthHeader(user)
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowSidebar(false);
                fetchProducts();
            }
        } catch (err) {
            console.error("Failed to save product", err);
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const res = await fetch(`${API_BASE}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getAuthHeader(user) }
            });
            if (res.ok) {
                fetchProducts();
            }
        } catch (err) {
            console.error("Failed to delete product", err);
        }
    };

    return (
        <div className="bg-[#f5f6f8] text-[#2c2f31] min-h-screen flex">
            <Sidebar />

            {/* Main Content */}
            <main className="ml-64 flex-grow min-h-screen">
                <Header
                    title="Product Catalog"
                    subtitle="Inventory Matrix"
                    searchPlaceholder="Search products..."
                    icon="inventory_2"
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                >
                    <button
                        onClick={handleAddNew}
                        className="bg-[#c5fe3c] text-[#364b00] px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all active:scale-95 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        New Product
                    </button>
                    {branches.length > 0 && (
                        <select
                            value={selectedBranchId}
                            onChange={e => setSelectedBranchId(e.target.value === "" ? "" : Number(e.target.value))}
                            className="bg-[#eff1f3] border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#c5fe3c] appearance-none cursor-pointer"
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                </Header>

                <div className="pt-24 px-8 pb-8 space-y-8">
                    {/* Stats Grid - 4 Column Layout for vertical alignment */}
                    <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-2 bg-white p-6 rounded-xl shadow-[0px_24px_48px_rgba(44,47,49,0.06)] flex flex-col justify-between overflow-hidden relative group">
                            <div className="z-10">
                                <p className="text-[#595c5e] text-sm font-medium mb-1">Total Inventory Value</p>
                                <h2 className="text-4xl font-extrabold tracking-tight text-[#2c2f31]">
                                    ₹{products.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}
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
                            <h2 className="text-4xl font-extrabold tracking-tight text-[#2c2f31]">
                                {products.length}
                            </h2>
                            <p className="text-[#595c5e] text-xs mt-4">Active SKUs in this business</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-[0px_24px_48px_rgba(44,47,49,0.06)]">
                            <p className="text-[#595c5e] text-sm font-medium mb-1">Active Recipes</p>
                            <h2 className="text-4xl font-extrabold tracking-tight text-[#2c2f31]">{products.length}</h2>
                            <p className="text-[#595c5e] text-xs mt-4">Across all departments</p>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                        {/* Table Section */}
                        <section className="lg:col-span-3 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold tracking-tight">Product Catalog</h3>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-[#e0e3e5] rounded-lg transition-colors"><span className="material-symbols-outlined text-[#595c5e]">filter_list</span></button>
                                    <button className="p-2 hover:bg-[#e0e3e5] rounded-lg transition-colors"><span className="material-symbols-outlined text-[#595c5e]">sort</span></button>
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
                                            <th className="px-6 py-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eff1f3]">
                                        {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
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
                                                    <span className="px-2 py-1 rounded-md bg-[#e0e3e5] text-[#2c2f31] text-[11px] font-medium">{product.category}</span>
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
                                                            onClick={() => setViewingRecipeProduct(product)}
                                                            className="text-[#496400] text-[10px] font-bold flex items-center gap-1 hover:opacity-80 transition-opacity"
                                                        >
                                                            <span className="material-symbols-outlined text-xs">visibility</span> VIEW RECIPE
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="text-sm font-bold text-[#2c2f31]">₹{product.price.toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditProduct(product)}
                                                            className="material-symbols-outlined text-[#595c5e] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#496400]"
                                                        >
                                                            edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(product.id)}
                                                            className="material-symbols-outlined text-error/40 opacity-0 group-hover:opacity-100 transition-opacity hover:text-error"
                                                        >
                                                            delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Management Sidebar */}
                        <aside className={`${showSidebar ? 'block' : 'hidden'} lg:block space-y-6 lg:col-span-1`}>
                            <div className="bg-white rounded-xl shadow-[0px_24px_48px_rgba(44,47,49,0.06)] p-6 sticky top-24">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold tracking-tight">{selectedProduct ? 'Update Item' : 'New Product'}</h3>
                                    <button onClick={() => setShowSidebar(false)} className="text-[#595c5e] hover:text-[#2c2f31] transition-colors lg:hidden">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            {formImageUrl && (
                                                <img src={formImageUrl} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Product Image URL</label>
                                                <input
                                                    className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-2 px-3 rounded-lg outline-none"
                                                    type="text"
                                                    value={formImageUrl}
                                                    onChange={(e) => setFormImageUrl(e.target.value)}
                                                    placeholder="https://example.com/image.jpg"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Product Name</label>
                                            <input
                                                className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-4 rounded-lg outline-none"
                                                type="text"
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Description</label>
                                            <textarea
                                                className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-4 rounded-lg outline-none min-h-[80px]"
                                                value={formDesc}
                                                onChange={(e) => setFormDesc(e.target.value)}
                                                placeholder="Enter product details..."
                                            />
                                        </div>
                                        {customCategoryInput && (
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Category</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        autoFocus
                                                        className="flex-1 bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-3 rounded-lg outline-none"
                                                        placeholder="New category name..."
                                                        value={formCategory}
                                                        onChange={e => setFormCategory(e.target.value)}
                                                    />
                                                    <button type="button" onClick={() => setCustomCategoryInput(false)}
                                                        className="px-3 py-2 bg-[#eff1f3] rounded-lg text-xs font-bold text-[#595c5e] hover:bg-[#e0e3e5]">✕</button>
                                                </div>
                                            </div>
                                        )}
                                        <div className={`grid gap-4 ${customCategoryInput ? "grid-cols-1" : "grid-cols-2"}`}>
                                            {!customCategoryInput && (
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Category</label>
                                                    <select
                                                        className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-3 rounded-lg outline-none"
                                                        value={formCategory}
                                                        onChange={e => {
                                                            if (e.target.value === "__new__") {
                                                                setFormCategory("");
                                                                setCustomCategoryInput(true);
                                                            } else {
                                                                setFormCategory(e.target.value);
                                                            }
                                                        }}
                                                    >
                                                        {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                        {!products.some(p => p.category === formCategory) && formCategory && (
                                                            <option value={formCategory}>{formCategory}</option>
                                                        )}
                                                        <option value="__new__">＋ Add new category...</option>
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Price</label>
                                                <input
                                                    className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-4 rounded-lg outline-none"
                                                    type="number"
                                                    value={formPrice}
                                                    onChange={(e) => setFormPrice(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Preparation Instructions</label>
                                            <textarea
                                                className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-4 rounded-lg outline-none min-h-[100px]"
                                                value={formInstructions}
                                                onChange={(e) => setFormInstructions(e.target.value)}
                                                placeholder="Steps to prepare this product..."
                                            />
                                        </div>
                                        {branches.length > 0 && (
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e] mb-1 block">Assign to Branch (Optional)</label>
                                                <select
                                                    className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-3 rounded-lg outline-none"
                                                    value={selectedBranchId}
                                                    onChange={(e) => setSelectedBranchId(e.target.value === "" ? "" : Number(e.target.value))}
                                                >
                                                    <option value="">No specific branch</option>
                                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-6 border-t border-[#eff1f3]">
                                        <div className="flex flex-col gap-3 mb-6">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#595c5e]">Recipe Composition</label>
                                            <div className="relative group">
                                                <input
                                                    className="w-full bg-[#eff1f3] border-none focus:ring-2 focus:ring-[#c5fe3c] text-sm py-3 px-4 pr-10 rounded-lg outline-none"
                                                    type="text"
                                                    placeholder="Search or add ingredient..."
                                                    value={ingredientSearch}
                                                    onChange={(e) => setIngredientSearch(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => addIngredient(ingredientSearch)}
                                                    className="absolute right-2 top-2 bg-[#c5fe3c] text-[#364b00] p-1.5 rounded-md hover:opacity-90 transition-opacity"
                                                >
                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                </button>

                                                {/* Suggestions Dropdown */}
                                                {ingredientSearch && (
                                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#eff1f3] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto no-scrollbar">
                                                        {availableIngredients
                                                            .filter(ing => ing.ingredientName?.toLowerCase().includes(ingredientSearch.toLowerCase()))
                                                            .map(ing => (
                                                                <div
                                                                    key={ing.id}
                                                                    onClick={() => addIngredient(ing.ingredientName)}
                                                                    className="px-4 py-3 text-sm hover:bg-[#c5fe3c]/10 cursor-pointer border-b border-[#eff1f3] last:border-0"
                                                                >
                                                                    {ing.ingredientName}
                                                                </div>
                                                            ))
                                                        }
                                                        {availableIngredients.filter(ing => ing.ingredientName?.toLowerCase().includes(ingredientSearch.toLowerCase())).length === 0 && (
                                                            <div className="px-4 py-3 text-xs text-gray-400 italic">No existing item found. Click "+" to add as new.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                                            {formIngredients.length === 0 ? (
                                                <div className="text-center py-10 bg-[#eff1f3]/40 rounded-2xl border-2 border-dashed border-[#e0e3e5]">
                                                    <p className="text-[10px] uppercase font-bold text-[#595c5e]">No ingredients added</p>
                                                    <p className="text-[9px] text-gray-400 mt-1 italic tracking-tight">Search above to build your recipe</p>
                                                </div>
                                            ) : (
                                                formIngredients.map((ing, idx) => (
                                                    <div key={idx} className="bg-white border border-[#eff1f3] rounded-2xl p-4 shadow-sm group/item hover:border-[#c5fe3c] transition-all">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-sm font-bold uppercase tracking-tight text-[#0c0f10]">{ing.ingredientName}</span>
                                                            <button
                                                                onClick={() => removeIngredient(idx)}
                                                                className="text-error/40 hover:text-error transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="relative">
                                                                <input
                                                                    className="w-full bg-[#eff1f3] border-none text-xs p-2 rounded-lg outline-none"
                                                                    type="number"
                                                                    value={ing.quantity}
                                                                    onChange={(e) => updateIngredient(idx, 'quantity', Number(e.target.value))}
                                                                />
                                                                <span className="absolute right-2 top-2 text-[8px] font-bold text-gray-400">QTY</span>
                                                            </div>
                                                            <div className="relative">
                                                                <select
                                                                    className="w-full bg-[#eff1f3] border-none text-xs p-2 rounded-lg outline-none"
                                                                    value={ing.unit}
                                                                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                                                                >
                                                                    <option>kg</option>
                                                                    <option>g</option>
                                                                    <option>ltr</option>
                                                                    <option>ml</option>
                                                                    <option>pcs</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSaveProduct}
                                        className="w-full bg-gradient-to-br from-[#496400] to-[#c5fe3c] text-[#deff95] py-4 rounded-xl font-bold tracking-tight text-sm shadow-lg hover:shadow-[#c5fe3c]/40 transition-all active:scale-95"
                                    >
                                        {selectedProduct ? 'Update Catalog' : 'Create Product'}
                                    </button>
                                </form>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
            {/* Recipe Details Modal */}
            {viewingRecipeProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all">
                    <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="relative h-48 bg-[#eff1f3]">
                            {viewingRecipeProduct.imageUrl ? (
                                <img src={viewingRecipeProduct.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-[#e0e3e5] uppercase">
                                    {viewingRecipeProduct.name.charAt(0)}
                                </div>
                            )}
                            <button
                                onClick={() => setViewingRecipeProduct(null)}
                                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white backdrop-blur-xl p-2 rounded-full transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8">
                            <h3 className="text-2xl font-black tracking-tighter mb-1 uppercase">{viewingRecipeProduct.name}</h3>
                            <p className="text-xs text-[#595c5e] mb-6 font-medium italic">#{viewingRecipeProduct.id} • {viewingRecipeProduct.category}</p>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#496400] mb-3">Ingredient Composition</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {viewingRecipeProduct.recipes && viewingRecipeProduct.recipes.length > 0 ? (
                                            viewingRecipeProduct.recipes.map((ing, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-[#eff1f3]/50 rounded-2xl group hover:bg-[#c5fe3c]/10 transition-colors border border-[#eff1f3]">
                                                    <span className="text-sm font-bold uppercase tracking-tighter text-[#2c2f31]">{ing.ingredientName}</span>
                                                    <span className="bg-white px-2 py-1 rounded-lg text-[10px] font-black text-[#595c5e] shadow-sm">{ing.quantity} {ing.unit}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No ingredients found for this recipe.</p>
                                        )}
                                    </div>
                                </div>

                                {viewingRecipeProduct.instructions && (
                                    <div>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#496400] mb-3">Preparation Guide</h4>
                                        <div className="p-4 bg-[#eff1f3]/50 rounded-2xl text-[13px] text-[#595c5e] leading-relaxed whitespace-pre-line border border-[#eff1f3]">
                                            {viewingRecipeProduct.instructions}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    handleEditProduct(viewingRecipeProduct);
                                    setViewingRecipeProduct(null);
                                }}
                                className="w-full mt-8 py-4 bg-black text-white rounded-2xl font-bold tracking-tight text-sm hover:bg-black/90 transition-all active:scale-95 shadow-xl"
                            >
                                Edit System Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

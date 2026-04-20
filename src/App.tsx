import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Product from "./pages/Product";
import WarehouseInventory from "./pages/WarehouseInventory";
import WarehouseOrders from "./pages/WarehouseOrders";
import BranchManagement from "./pages/BranchManagement";
import BranchInventoryView from "./pages/BranchInventoryView";
import ManagerDashboard from "./pages/ManagerDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import UsersManagement from "./pages/UsersManagement";
import OwnerBilling from "./pages/OwnerBilling";
import Profile from "./pages/Profile";

function OwnerLayout() {
  return (
    <div className="layout-root">
      <aside className="layout-sidebar">
        <div className="layout-brand">
          <div className="auth-logo-icon small" />
          <span className="auth-logo-text">Ventorie</span>
        </div>
        <nav className="layout-nav">
          <button className="layout-nav-item active">Overview</button>
          <button className="layout-nav-item">Warehouses</button>
          <button className="layout-nav-item">Inventory</button>
          <button className="layout-nav-item">Stock Requests</button>
          <button className="layout-nav-item">Bills</button>
          <button className="layout-nav-item">Alerts</button>
          <button className="layout-nav-item">Settings</button>
        </nav>
      </aside>
      <main className="layout-main">
        <header className="layout-header">
          <h1>Owner Overview</h1>
          <p>High-level snapshot of your inventory operations.</p>
        </header>
        <section className="layout-content">
          <div className="layout-placeholder-card">
            Owner dashboard content will go here.
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/owner" element={<OwnerLayout />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/product" element={<Product />} />
      <Route path="/warehouse-inventory" element={<WarehouseInventory />} />
      <Route path="/warehouse-orders" element={<WarehouseOrders />} />
      <Route path="/branches" element={<BranchManagement />} />
      <Route path="/branch-inventory/:branchId" element={<BranchInventoryView />} />
      <Route path="/manager-dashboard" element={<ManagerDashboard />} />
      <Route path="/staff-dashboard" element={<StaffDashboard />} />
      <Route path="/users" element={<UsersManagement />} />
      <Route path="/owner-billing" element={<OwnerBilling />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}


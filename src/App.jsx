import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIProvider";
import AdminLayout from "./components/layout/AdminLayout";
import PrivateRoute from "./routes/PrivateRoute";

// Components
import Splash from "./components/common/Splash";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import NotFound from "./pages/NotFound";

// Enterprise Features
import EnterpriseDashboard from "./pages/dashboard/Dashboard";

// Stock
import StockList from "./pages/stock/StockList";
import AddStock from "./pages/stock/AddStock";
import EditStock from "./pages/stock/EditStock";

// Production
import DailyProduction from "./pages/production/DailyProduction";
import ProductionReport from "./pages/production/ProductionReport";
import EditProduction from "./pages/production/EditProduction";

// Cash Book
import CashBook from "./pages/cash/CashBook";
import CashEntry from "./pages/cash/CashEntry";
import CashReport from "./pages/cash/CashReport";
import EditCash from "./pages/cash/EditCash";

// Invoices
import InvoiceList from "./pages/invoices/InvoiceList";
import CreateInvoice from "./pages/invoices/CreateInvoice";
import InvoiceView from "./pages/invoices/InvoiceView";
import EditInvoice from "./pages/invoices/EditInvoice";

// HR / Employees
import EmployeeList from "./pages/employees/EmployeeList";
import AddEmployee from "./pages/employees/AddEmployee";
import EditEmployee from "./pages/employees/EditEmployee";
import SalaryManagement from "./pages/employees/SalaryManagement";

// Transportation Features
import TransportationDashboard from "./pages/dashboard/TransportationDashboard";
import VehicleLog from "./pages/vehicles/VehicleLog";
import FuelTracker from "./pages/vehicles/FuelTracker"; // 👈 Naya Import
import Maintenance from "./pages/vehicles/Maintenance"; // 👈 Naya Import
import ElectricBill from "./pages/electricity/ElectricBill";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <Splash
        onComplete={() => {
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <UIProvider>
        <Router>
          <Routes>
            {/* =========================================================
                🌐 PUBLIC ROUTES
               ========================================================= */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* =========================================================
                🔐 PROTECTED ADMIN ROUTES
               ========================================================= */}
            <Route element={<PrivateRoute />}>
              <Route element={<AdminLayout />}>
                {/* --- 🏭 ENTERPRISE PORTAL --- */}
                <Route
                  path="/enterprise/dashboard"
                  element={<EnterpriseDashboard />}
                />

                {/* Stock Management */}
                <Route path="/enterprise/stock" element={<StockList />} />
                <Route path="/enterprise/stock/add" element={<AddStock />} />
                <Route
                  path="/enterprise/stock/edit/:id"
                  element={<EditStock />}
                />

                {/* Production */}
                <Route
                  path="/enterprise/production"
                  element={<DailyProduction />}
                />
                <Route
                  path="/enterprise/production/report"
                  element={<ProductionReport />}
                />
                <Route
                  path="/enterprise/production/edit/:id"
                  element={<EditProduction />}
                />

                {/* Finance / Cash Book */}
                <Route path="/enterprise/cash" element={<CashBook />} />
                <Route path="/enterprise/cash/add" element={<CashEntry />} />
                <Route
                  path="/enterprise/cash/report"
                  element={<CashReport />}
                />
                <Route
                  path="/enterprise/cash/edit/:id"
                  element={<EditCash />}
                />

                {/* Invoices */}
                <Route path="/enterprise/invoices" element={<InvoiceList />} />
                <Route
                  path="/enterprise/invoices/create"
                  element={<CreateInvoice />}
                />
                <Route
                  path="/enterprise/invoices/view/:id"
                  element={<InvoiceView />}
                />
                <Route
                  path="/enterprise/invoices/edit/:id"
                  element={<EditInvoice />}
                />

                {/* HR / Employees */}
                <Route
                  path="/enterprise/employees"
                  element={<EmployeeList />}
                />
                <Route
                  path="/enterprise/employees/add"
                  element={<AddEmployee />}
                />
                <Route
                  path="/enterprise/employees/edit/:id"
                  element={<EditEmployee />}
                />
                <Route
                  path="/enterprise/salary-history"
                  element={<SalaryManagement />}
                />

                {/* --- 🚚 TRANSPORTATION PORTAL --- */}
                <Route
                  path="/transportation/dashboard"
                  element={<TransportationDashboard />}
                />
                <Route path="/transportation/logs" element={<VehicleLog />} />
                {/* 🚀 Naye Transportation Routes Add Kiye */}
                <Route path="/transportation/fuel" element={<FuelTracker />} />
                <Route
                  path="/transportation/maintenance"
                  element={<Maintenance />}
                />

                {/* Shared / Utilities */}
                <Route path="/electricity" element={<ElectricBill />} />
              </Route>
            </Route>

            {/* ✅ 404 PAGE (Catches all unknown routes) */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;

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
import ForgotPassword from "./pages/auth/ForgotPassword"; // ✅ Naya import add kiya
import NotFound from "./pages/NotFound";

// Enterprise Features
import EnterpriseDashboard from "./pages/dashboard/Dashboard";
import StockList from "./pages/stock/StockList";
import AddStock from "./pages/stock/AddStock";
import EditStock from "./pages/stock/EditStock";
import DailyProduction from "./pages/production/DailyProduction";
import ProductionReport from "./pages/production/ProductionReport";
import CashBook from "./pages/cash/CashBook";
import InvoiceList from "./pages/invoices/InvoiceList";
import CreateInvoice from "./pages/invoices/CreateInvoice";
import InvoiceView from "./pages/invoices/InvoiceView";
import EmployeeList from "./pages/employees/EmployeeList";
import AddEmployee from "./pages/employees/AddEmployee";
import SalaryManagement from "./pages/employees/SalaryManagement";

// Transportation Features
import TransportationDashboard from "./pages/dashboard/TransportationDashboard";
import VehicleLog from "./pages/vehicles/VehicleLog";
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
            <Route path="/forgot-password" element={<ForgotPassword />} />{" "}
            {/* ✅ Naya route add kiya */}
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

                {/* Finance */}
                <Route path="/enterprise/cash" element={<CashBook />} />
                <Route path="/enterprise/invoices" element={<InvoiceList />} />
                <Route
                  path="/enterprise/invoices/create"
                  element={<CreateInvoice />}
                />
                <Route
                  path="/enterprise/invoices/view/:id"
                  element={<InvoiceView />}
                />

                {/* HR */}
                <Route
                  path="/enterprise/employees"
                  element={<EmployeeList />}
                />
                <Route
                  path="/enterprise/employees/add"
                  element={<AddEmployee />}
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

import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIProvider";
import AdminLayout from "./components/layout/AdminLayout";
import PrivateRoute from "./routes/PrivateRoute";

import Splash from "./components/common/Splash";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import NotFound from "./pages/NotFound";

import EnterpriseDashboard from "./pages/dashboard/Dashboard";

import StockList from "./pages/stock/StockList";
import AddStock from "./pages/stock/AddStock";
import EditStock from "./pages/stock/EditStock";

import DailyProduction from "./pages/production/DailyProduction";
import ProductionReport from "./pages/production/ProductionReport";
import EditProduction from "./pages/production/EditProduction";
import EditPayout from "./pages/production/EditPayout";

// 🚀 SALES IMPORTS
import Sales from "./pages/sales/Sales";
import SalesReport from "./pages/sales/SalesReport";
import EditSale from "./pages/sales/EditSale";

import CashBook from "./pages/cash/CashBook";
import CashEntry from "./pages/cash/CashEntry";
import CashReport from "./pages/cash/CashReport";
import EditCash from "./pages/cash/EditCash";

import InvoiceList from "./pages/invoices/InvoiceList";
import CreateInvoice from "./pages/invoices/CreateInvoice";
import InvoiceView from "./pages/invoices/InvoiceView";
import EditInvoice from "./pages/invoices/EditInvoice";

import EmployeeList from "./pages/employees/EmployeeList";
import AddEmployee from "./pages/employees/AddEmployee";
import EditEmployee from "./pages/employees/EditEmployee";
import SalaryManagement from "./pages/employees/SalaryManagement";

import TransportationDashboard from "./pages/dashboard/TransportationDashboard";
import VehicleLog from "./pages/vehicles/VehicleLog";
import FuelTracker from "./pages/vehicles/FuelTracker";
import Maintenance from "./pages/vehicles/Maintenance";
import ElectricBill from "./pages/electricity/ElectricBill";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) return <Splash onComplete={() => setShowSplash(false)} />;

  return (
    <AuthProvider>
      <UIProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route element={<PrivateRoute />}>
              <Route element={<AdminLayout />}>
                <Route
                  path="/enterprise/dashboard"
                  element={<EnterpriseDashboard />}
                />

                <Route path="/enterprise/stock" element={<StockList />} />
                <Route path="/enterprise/stock/add" element={<AddStock />} />
                <Route
                  path="/enterprise/stock/edit/:id"
                  element={<EditStock />}
                />

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
                <Route
                  path="/enterprise/labour/edit/:id"
                  element={<EditPayout />}
                />

                {/* 🚀 SALES ROUTES ORDER MATTERS */}
                <Route path="/enterprise/sales" element={<Sales />} />
                <Route
                  path="/enterprise/sales/report"
                  element={<SalesReport />}
                />
                <Route
                  path="/enterprise/sales/edit/:id"
                  element={<EditSale />}
                />

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

                <Route
                  path="/transportation/dashboard"
                  element={<TransportationDashboard />}
                />
                <Route path="/transportation/logs" element={<VehicleLog />} />
                <Route path="/transportation/fuel" element={<FuelTracker />} />
                <Route
                  path="/transportation/maintenance"
                  element={<Maintenance />}
                />

                <Route path="/electricity" element={<ElectricBill />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;

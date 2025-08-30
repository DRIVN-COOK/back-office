import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, setApiBaseUrl } from '@drivn-cook/shared';
import { API_URL } from './config.js';

/* Pages */
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

const FranchiseesPage = lazy(() => import('./pages/franchisees/FranchiseesPage'));
const AgreementsPage = lazy(() => import('./pages/franchisees/AgreementsPage'));

const TrucksPage = lazy(() => import('./pages/trucks/TrucksPage'));
const DeploymentsPage = lazy(() => import('./pages/trucks/DeploymentsPage'));
const MaintenancePage = lazy(() => import('./pages/trucks/MaintenancePage'));

const WarehousesPage = lazy(() => import('./pages/warehouses/WarehousesPage'));
const InventoryPage = lazy(() => import('./pages/warehouses/InventoryPage'));
const StockMovementsPage = lazy(() => import('./pages/warehouses/StockMovementsPage'));

const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'));
const ProductsPage = lazy(() => import('./pages/catalog/ProductsPage'));
const PricesPage = lazy(() => import('./pages/catalog/PricesPage'));

const PurchaseOrdersPage = lazy(() => import('./pages/procurement/PurchaseOrdersPage'));

const CustomerOrdersPage = lazy(() => import('./pages/sales/CustomerOrdersPage'));
const PaymentsPage = lazy(() => import('./pages/sales/PaymentsPage'));
const InvoicesPage = lazy(() => import('./pages/sales/InvoicesPage'));

const LoyaltyPage = lazy(() => import('./pages/loyalty/LoyaltyPage'));
const EventsPage = lazy(() => import('./pages/events/EventsPage'));

const ReportingPage = lazy(() => import('./pages/reporting/ReportingPage'));
const RoyaltiesPage = lazy(() => import('./pages/reporting/RoyaltiesPage'));

const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));

/* Layouts */
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

/* Guard */
function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!['ADMIN', 'HQ_STAFF'].includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useEffect(() => { setApiBaseUrl(API_URL); }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            {/* Auth publiques */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Admin protégées */}
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<HomePage />} />

              {/* Franchise */}
              <Route path="franchisees" element={<FranchiseesPage />} />
              <Route path="agreements" element={<AgreementsPage />} />

              {/* Camions */}
              <Route path="trucks" element={<TrucksPage />} />
              <Route path="deployments" element={<DeploymentsPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />

              {/* Entrepôts & stocks */}
              <Route path="warehouses" element={<WarehousesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="movements" element={<StockMovementsPage />} />

              {/* Catalogue */}
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="prices" element={<PricesPage />} />

              {/* Appro */}
              <Route path="purchase-orders" element={<PurchaseOrdersPage />} />

              {/* Ventes */}
              <Route path="customer-orders" element={<CustomerOrdersPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />

              {/* Fidélité & évènements */}
              <Route path="loyalty" element={<LoyaltyPage />} />
              <Route path="events" element={<EventsPage />} />

              {/* Reporting */}
              <Route path="reporting" element={<ReportingPage />} />
              <Route path="royalties" element={<RoyaltiesPage />} />

              {/* Admin */}
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/audit" element={<AuditLogPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

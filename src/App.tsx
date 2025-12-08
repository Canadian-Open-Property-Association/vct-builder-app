import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppSelectionPage from './pages/AppSelectionPage';
import AuthGuard from './components/Auth/AuthGuard';
import AdminGuard from './components/Auth/AdminGuard';
import PlatformShell from './components/Platform/PlatformShell';
import VctBuilderApp from './apps/VctBuilder/VctBuilderApp';
import SchemaBuilderApp from './apps/SchemaBuilder/SchemaBuilderApp';
import AdminLogsApp from './apps/AdminLogs/AdminLogsApp';
import DataCatalogueApp from './apps/DataCatalogue/DataCatalogueApp';

// App icons for the platform bar
const VctBuilderIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
  </svg>
);

const SchemaBuilderIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const AdminLogsIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DataCatalogueIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/apps"
          element={
            <AuthGuard>
              <PlatformShell>
                <AppSelectionPage />
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/vct-builder/*"
          element={
            <AuthGuard>
              <PlatformShell appName="VCT Builder" appIcon={VctBuilderIcon}>
                <VctBuilderApp />
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/schema-builder/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Schema Builder" appIcon={SchemaBuilderIcon}>
                <SchemaBuilderApp />
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/admin-logs/*"
          element={
            <AuthGuard>
              <AdminGuard>
                <PlatformShell appName="Access Logs" appIcon={AdminLogsIcon}>
                  <AdminLogsApp />
                </PlatformShell>
              </AdminGuard>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/data-catalogue/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Data Catalogue" appIcon={DataCatalogueIcon}>
                <DataCatalogueApp />
              </PlatformShell>
            </AuthGuard>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/apps" replace />} />
        <Route path="*" element={<Navigate to="/apps" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

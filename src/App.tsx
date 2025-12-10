import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AppSelectionPage from './pages/AppSelectionPage';
import AuthGuard from './components/Auth/AuthGuard';
import AdminGuard from './components/Auth/AdminGuard';
import PlatformShell from './components/Platform/PlatformShell';
import VctBuilderApp from './apps/VctBuilder/VctBuilderApp';
import SchemaBuilderApp from './apps/SchemaBuilder/SchemaBuilderApp';
import AdminLogsApp from './apps/AdminLogs/AdminLogsApp';
import DataDictionaryApp from './apps/DataDictionary/DataDictionaryApp';
import EntityManagerApp from './apps/EntityManager/EntityManagerApp';
import DevToolsApp from './apps/DevTools/DevToolsApp';

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

const DataDictionaryIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const EntityManagerIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const DevToolsIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />

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
          path="/apps/data-dictionary/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Data Dictionary" appIcon={DataDictionaryIcon}>
                <DataDictionaryApp />
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/entity-manager/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Entity Manager" appIcon={EntityManagerIcon}>
                <EntityManagerApp />
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/dev-tools/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Developer Tools" appIcon={DevToolsIcon}>
                <DevToolsApp />
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

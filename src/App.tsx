import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AppSelectionPage from './pages/AppSelectionPage';
import PublicFormPage from './pages/PublicFormPage';
import AuthGuard from './components/Auth/AuthGuard';
import AdminGuard from './components/Auth/AdminGuard';
import PlatformShell from './components/Platform/PlatformShell';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import VctBuilderApp from './apps/VctBuilder/VctBuilderApp';
import SchemaBuilderApp from './apps/SchemaBuilder/SchemaBuilderApp';
import AdminLogsApp from './apps/AdminLogs/AdminLogsApp';
import DataDictionaryApp from './apps/DataDictionary/DataDictionaryApp';
import DataHarmonizationApp from './apps/DataHarmonization/DataHarmonizationApp';
import EntityManagerApp from './apps/EntityManager/EntityManagerApp';
import DevToolsApp from './apps/DevTools/DevToolsApp';
import ProofTemplatesApp from './apps/ProofTemplates/ProofTemplatesApp';
import FormsBuilderApp from './apps/FormsBuilder/FormsBuilderApp';
import TestIssuerApp from './apps/TestIssuer/TestIssuerApp';
import BadgesApp from './apps/Badges/BadgesApp';

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

const DataHarmonizationIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
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

const ProofsTemplateBuilderIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const FormsBuilderIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const TestIssuerIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);

const BadgesIcon = (
  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />
        <Route path="/f/:slug" element={<PublicFormPage />} />

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
                <AppErrorBoundary appName="VCT Builder">
                  <VctBuilderApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/schema-builder/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Schema Builder" appIcon={SchemaBuilderIcon}>
                <AppErrorBoundary appName="Schema Builder">
                  <SchemaBuilderApp />
                </AppErrorBoundary>
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
                  <AppErrorBoundary appName="Access Logs">
                    <AdminLogsApp />
                  </AppErrorBoundary>
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
                <AppErrorBoundary appName="Data Dictionary">
                  <DataDictionaryApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/data-harmonization/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Data Harmonization" appIcon={DataHarmonizationIcon}>
                <AppErrorBoundary appName="Data Harmonization">
                  <DataHarmonizationApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/entity-manager/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Entity Manager" appIcon={EntityManagerIcon}>
                <AppErrorBoundary appName="Entity Manager">
                  <EntityManagerApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/dev-tools/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Developer Tools" appIcon={DevToolsIcon}>
                <AppErrorBoundary appName="Developer Tools">
                  <DevToolsApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/proofs-template-builder/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Proof Templates Builder" appIcon={ProofsTemplateBuilderIcon}>
                <AppErrorBoundary appName="Proof Templates Builder">
                  <ProofTemplatesApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/forms-builder/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Forms Builder" appIcon={FormsBuilderIcon}>
                <AppErrorBoundary appName="Forms Builder">
                  <FormsBuilderApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/test-issuer/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Test Issuer" appIcon={TestIssuerIcon}>
                <AppErrorBoundary appName="Test Issuer">
                  <TestIssuerApp />
                </AppErrorBoundary>
              </PlatformShell>
            </AuthGuard>
          }
        />

        <Route
          path="/apps/badges/*"
          element={
            <AuthGuard>
              <PlatformShell appName="Badges" appIcon={BadgesIcon}>
                <AppErrorBoundary appName="Badges">
                  <BadgesApp />
                </AppErrorBoundary>
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

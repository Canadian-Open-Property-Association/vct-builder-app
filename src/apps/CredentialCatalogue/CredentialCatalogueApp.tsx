/**
 * Credential Catalogue App
 *
 * Main application component for importing and managing external AnonCreds
 * credentials from other ecosystems for verification testing.
 *
 * Features:
 * - Import credentials from IndyScan URLs
 * - Register with Orbit for verification
 * - Tag credentials by ecosystem
 * - Browse and manage imported credentials
 */

import { Routes, Route } from 'react-router-dom';
import { useAppTracking } from '../../hooks/useAppTracking';
import CatalogueGrid from './components/CatalogueGrid';
import ImportWizard from './components/ImportWizard';
import CredentialDetail from './components/CredentialDetail';

export default function CredentialCatalogueApp() {
  useAppTracking('credential-catalogue', 'Credential Catalogue');

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-auto">
      <Routes>
        <Route path="/" element={<CatalogueGrid />} />
        <Route path="/import" element={<ImportWizard />} />
        <Route path="/:id" element={<CredentialDetail />} />
      </Routes>
    </div>
  );
}

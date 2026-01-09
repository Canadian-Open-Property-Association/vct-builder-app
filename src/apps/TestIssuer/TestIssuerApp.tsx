/**
 * Test Issuer App
 *
 * Main application component for issuing test credentials via Orbit LOB.
 * Allows selecting credential schemas, filling in data, and generating QR codes
 * for wallet scanning.
 */

import { Routes, Route } from 'react-router-dom';
import { useAppTracking } from '../../hooks/useAppTracking';
import CredentialCatalog from './components/CredentialCatalog';
import CredentialForm from './components/CredentialForm';
import OffersList from './components/OffersList';
import OfferDetail from './components/OfferDetail';

export default function TestIssuerApp() {
  useAppTracking('test-issuer', 'Test Issuer');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Routes>
        <Route path="/" element={<CredentialCatalog />} />
        <Route path="/issue/:schemaId" element={<CredentialForm />} />
        <Route path="/offers" element={<OffersList />} />
        <Route path="/offers/:id" element={<OfferDetail />} />
      </Routes>
    </div>
  );
}

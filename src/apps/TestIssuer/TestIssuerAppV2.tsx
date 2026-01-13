/**
 * Test Issuer App V2
 *
 * Redesigned 3-column layout for issuing test credentials.
 * - Left: Credential list from Credential Catalogue
 * - Middle: Attribute form with random fill
 * - Right: QR code display after generating offer
 *
 * Uses credentials that have been cloned and enabled for issuance
 * in the Credential Catalogue.
 */

import { useState, useCallback } from 'react';
import { useAppTracking } from '../../hooks/useAppTracking';
import { useOrbitSocket, OrbitEventType, OrbitEventData } from '../../hooks/useOrbitSocket';
import type { CatalogueCredential } from '../../types/catalogue';
import CredentialSidebar from './components/CredentialSidebar';
import AttributeForm from './components/AttributeForm';
import QRCodePanel, { OfferData, OfferStatus } from './components/QRCodePanel';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

export default function TestIssuerAppV2() {
  useAppTracking('test-issuer', 'Test Issuer');

  // State
  const [selectedCredential, setSelectedCredential] = useState<CatalogueCredential | null>(null);
  const [currentOffer, setCurrentOffer] = useState<OfferData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle socket events for real-time updates
  const handleSocketEvent = useCallback(
    (event: OrbitEventType, data: OrbitEventData) => {
      console.log('[TestIssuer] Socket event:', event, data);

      // Map socket events to offer status updates
      let newStatus: OfferStatus | null = null;

      switch (event) {
        case 'offer_accepted':
          newStatus = 'accepted';
          break;
        case 'credential_issued':
          newStatus = 'issued';
          break;
        case 'done':
          newStatus = 'completed';
          break;
        case 'error':
          newStatus = 'failed';
          break;
      }

      if (newStatus && currentOffer) {
        // Check if this event is for our current offer
        if (data.offerId === currentOffer.offerId || !data.offerId) {
          setCurrentOffer((prev) => (prev ? { ...prev, status: newStatus! } : null));
        }
      }
    },
    [currentOffer]
  );

  // Connect to Orbit WebSocket for real-time updates
  const { connected, sessionId, error: socketError } = useOrbitSocket({
    appName: 'testIssuer',
    onEvent: handleSocketEvent,
    enabled: true,
  });

  // Handle credential selection
  const handleSelectCredential = (credential: CatalogueCredential) => {
    setSelectedCredential(credential);
    setCurrentOffer(null);
    setError(null);
  };

  // Handle generate offer
  const handleGenerateOffer = async (attributeValues: Record<string, string>) => {
    if (!selectedCredential || !selectedCredential.clonedOrbitCredDefId) {
      setError('Selected credential is not properly configured for issuance');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/issuer/offers/catalogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          catalogueCredentialId: selectedCredential.id,
          credentialId: selectedCredential.clonedOrbitCredDefId,
          credAttributes: attributeValues,
          socketSessionId: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create credential offer');
      }

      const data = await response.json();

      setCurrentOffer({
        offerId: data.offerId || data.credOfferId,
        shortUrl: data.shortUrl,
        longUrl: data.longUrl,
        status: 'pending',
        credentialName: selectedCredential.name,
        expiresAt: data.expiresAt,
      });
    } catch (err) {
      console.error('[TestIssuer] Failed to create offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create credential offer');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle reset (after completion or cancel)
  const handleReset = () => {
    setCurrentOffer(null);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Test Issuer</h1>
              <p className="text-xs text-gray-500">Issue test credentials from your catalogue</p>
            </div>
          </div>

          {/* Socket status indicator */}
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
              connected
                ? 'bg-green-100 text-green-700'
                : socketError
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
            title={connected ? `Connected: ${sessionId}` : socketError || 'Connecting...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : socketError ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
              }`}
            />
            {connected ? 'Connected' : socketError ? 'Disconnected' : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="flex-1 p-6 min-h-0">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Credential List */}
          <div className="h-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <CredentialSidebar
              selectedCredential={selectedCredential}
              onSelectCredential={handleSelectCredential}
            />
          </div>

          {/* Middle Column - Attribute Form */}
          <div className="h-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <AttributeForm
              credential={selectedCredential}
              onGenerateOffer={handleGenerateOffer}
              isGenerating={isGenerating}
            />
          </div>

          {/* Right Column - QR Code */}
          <div className="h-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <QRCodePanel offer={currentOffer} onReset={handleReset} />
          </div>
        </div>
      </div>
    </div>
  );
}

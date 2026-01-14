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
import ExpandableError, { ApiErrorDetails } from './components/ExpandableError';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

export default function TestIssuerAppV2() {
  useAppTracking('test-issuer', 'Test Issuer');

  // State
  const [selectedCredential, setSelectedCredential] = useState<CatalogueCredential | null>(null);
  const [currentOffer, setCurrentOffer] = useState<OfferData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorDetails | null>(null);

  // Handle socket events for real-time updates
  const handleSocketEvent = useCallback(
    (event: OrbitEventType, data: OrbitEventData) => {
      console.log('[TestIssuer] Socket event:', event, data);

      // Map socket events to offer status updates
      let newStatus: OfferStatus | null = null;

      switch (event) {
        case 'offer_received':
          // Holder received offer in wallet (scanned QR)
          newStatus = 'scanned';
          break;
        case 'offer_accepted':
          // Holder accepted the credential offer
          newStatus = 'accepted';
          break;
        case 'credential_issued':
          // Credential stored in wallet - complete!
          newStatus = 'completed';
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
    setErrorDetails(null);
  };

  // Handle generate offer - uses prepare-url-offer endpoint for proper QR code generation
  const handleGenerateOffer = async (attributeValues: Record<string, string>) => {
    if (!selectedCredential || !selectedCredential.clonedOrbitCredDefId) {
      setError('Selected credential is not properly configured for issuance');
      setErrorDetails(null);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Use the prepare endpoint which calls Orbit's prepare-url-offer
      const response = await fetch(`${API_BASE}/api/issuer/offers/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credentialId: selectedCredential.clonedOrbitCredDefId,
          credAttributes: attributeValues,
          socketSessionId: sessionId,
        }),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(responseData.error || 'Failed to prepare credential offer');
        // Set detailed error info if available from backend
        if (responseData.apiDetails) {
          setErrorDetails(responseData.apiDetails);
        }
        return;
      }

      setCurrentOffer({
        offerId: responseData.offerId || responseData.credOfferId,
        shortUrl: responseData.shortUrl,
        longUrl: responseData.longUrl,
        status: 'pending',
        credentialName: selectedCredential.name,
        expiresAt: responseData.expiresAt,
      });
    } catch (err) {
      console.error('[TestIssuer] Failed to prepare offer:', err);
      setError(err instanceof Error ? err.message : 'Failed to prepare credential offer');
      setErrorDetails(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle reset (after completion or cancel)
  const handleReset = () => {
    setCurrentOffer(null);
    setError(null);
    setErrorDetails(null);
  };

  // Handle error dismiss
  const handleDismissError = () => {
    setError(null);
    setErrorDetails(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Error Banner with Expandable Details */}
      {error && (
        <ExpandableError
          message={error}
          details={errorDetails}
          onDismiss={handleDismissError}
        />
      )}

      {/* 3-Column Layout */}
      <div className="flex-1 p-6 min-h-0">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Credential List */}
          <div className="h-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <CredentialSidebar
              selectedCredential={selectedCredential}
              onSelectCredential={handleSelectCredential}
              socketConnected={connected}
              socketError={socketError}
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

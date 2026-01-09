/**
 * OfferDetail Component
 *
 * Shows detailed view of a credential offer.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTestIssuerStore } from '../../../store/testIssuerStore';
import type { CredentialOfferStatus } from '../../../types/issuer';

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const { offers, isLoading, refreshOfferStatus } = useTestIssuerStore();
  const [offer, setOffer] = useState(offers.find((o) => o.id === id));

  // Refresh offer status on mount and periodically if pending
  useEffect(() => {
    if (!id) return;

    const refresh = async () => {
      try {
        const updated = await refreshOfferStatus(id);
        setOffer(updated);
      } catch (err) {
        // Silently handle
      }
    };

    refresh();

    // Poll if pending or scanned
    if (offer?.status === 'pending' || offer?.status === 'scanned') {
      const interval = setInterval(refresh, 3000);
      return () => clearInterval(interval);
    }
  }, [id, offer?.status, refreshOfferStatus]);

  // Update local offer when store updates
  useEffect(() => {
    const storeOffer = offers.find((o) => o.id === id);
    if (storeOffer) {
      setOffer(storeOffer);
    }
  }, [offers, id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusDisplay = (status: CredentialOfferStatus) => {
    const configs = {
      pending: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending', icon: '🕐' },
      scanned: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Scanned', icon: '📲' },
      claimed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Claimed', icon: '✓' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired', icon: '⏰' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed', icon: '✗' },
    };
    return configs[status];
  };

  if (isLoading && !offer) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Offer not found.</p>
          <Link
            to="/apps/test-issuer/offers"
            className="mt-3 text-yellow-700 hover:text-yellow-900 underline block"
          >
            Back to Offers
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusDisplay(offer.status);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/apps/test-issuer/offers"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Offer Details</h1>
          <p className="text-gray-600">{offer.schemaName}</p>
        </div>
        <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.icon} {statusConfig.label}
        </span>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Offer Information</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Offer ID</dt>
            <dd className="font-mono text-sm text-gray-900 break-all">{offer.id}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Schema</dt>
            <dd className="text-gray-900">{offer.schemaName}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Created</dt>
            <dd className="text-gray-900">{formatDate(offer.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Expires</dt>
            <dd className="text-gray-900">{formatDate(offer.expiresAt)}</dd>
          </div>
          {offer.claimedAt && (
            <div>
              <dt className="text-sm text-gray-500">Claimed</dt>
              <dd className="text-gray-900">{formatDate(offer.claimedAt)}</dd>
            </div>
          )}
          {offer.errorMessage && (
            <div className="col-span-2">
              <dt className="text-sm text-gray-500">Error</dt>
              <dd className="text-red-600">{offer.errorMessage}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* QR Code (if pending) */}
      {offer.status === 'pending' && offer.qrCodeUrl && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h2>
          <div className="flex justify-center">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
              <img
                src={offer.qrCodeUrl}
                alt="Scan with wallet"
                className="w-48 h-48"
              />
            </div>
          </div>
          <p className="text-center text-gray-500 mt-4">Scan with your digital wallet</p>
        </div>
      )}

      {/* Credential Data */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Credential Data</h2>
        </div>
        <div className="p-6">
          <pre className="text-sm font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(offer.credentialData, null, 2)}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(offer.credentialData, null, 2))}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Data
        </button>
        {offer.offerUrl && (
          <button
            onClick={() => navigator.clipboard.writeText(offer.offerUrl!)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy Offer URL
          </button>
        )}
      </div>
    </div>
  );
}

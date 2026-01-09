/**
 * OffersList Component
 *
 * Shows history of credential offers with their status.
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTestIssuerStore } from '../../../store/testIssuerStore';
import type { CredentialOfferStatus } from '../../../types/issuer';

export default function OffersList() {
  const navigate = useNavigate();
  const { offers, isLoading, error, fetchOffers, cancelOffer, clearError } = useTestIssuerStore();

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: CredentialOfferStatus) => {
    const configs = {
      pending: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending' },
      scanned: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Scanned' },
      claimed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Claimed' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
    };
    const config = configs[status];
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Cancel this offer?')) return;
    try {
      await cancelOffer(id);
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/apps/test-issuer"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Offers History</h1>
            <p className="text-gray-600 mt-1">View and manage credential offers</p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-800">{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && offers.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && offers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No offers yet</h3>
          <p className="text-gray-500 mb-4">Issue credentials to see offer history</p>
          <Link
            to="/apps/test-issuer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Catalog
          </Link>
        </div>
      )}

      {/* Offers table */}
      {offers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credential
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offers.map((offer) => (
                <tr
                  key={offer.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/apps/test-issuer/offers/${offer.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{offer.schemaName}</span>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-xs">{offer.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(offer.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(offer.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(offer.expiresAt)}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {offer.status === 'pending' && (
                      <button
                        onClick={(e) => handleCancel(offer.id, e)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

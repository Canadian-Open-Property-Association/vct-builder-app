/**
 * QRCodeDisplay Component
 *
 * Displays a QR code for wallet scanning and shows real-time offer status.
 */

import { useEffect, useState, useRef } from 'react';
import { useTestIssuerStore } from '../../../store/testIssuerStore';
import type { CredentialOffer } from '../../../types/issuer';

interface QRCodeDisplayProps {
  offer: CredentialOffer;
  onBack: () => void;
  onNewCredential: () => void;
}

export default function QRCodeDisplay({ offer, onBack, onNewCredential }: QRCodeDisplayProps) {
  const { refreshOfferStatus } = useTestIssuerStore();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Calculate time remaining
  useEffect(() => {
    const updateTimeRemaining = () => {
      const expiresAt = new Date(offer.expiresAt);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [offer.expiresAt]);

  // Poll for status updates
  useEffect(() => {
    if (offer.status === 'pending' || offer.status === 'scanned') {
      pollIntervalRef.current = setInterval(() => {
        refreshOfferStatus(offer.id).catch(() => {
          // Silently ignore polling errors
        });
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [offer.id, offer.status, refreshOfferStatus]);

  const getStatusDisplay = () => {
    switch (offer.status) {
      case 'pending':
        return {
          color: 'blue',
          icon: (
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Waiting for wallet scan...',
        };
      case 'scanned':
        return {
          color: 'yellow',
          icon: (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          text: 'Processing credential...',
        };
      case 'claimed':
        return {
          color: 'green',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Credential issued successfully!',
        };
      case 'expired':
        return {
          color: 'gray',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Offer expired',
        };
      case 'failed':
        return {
          color: 'red',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: offer.errorMessage || 'Issuance failed',
        };
      default:
        return {
          color: 'gray',
          icon: null,
          text: 'Unknown status',
        };
    }
  };

  const status = getStatusDisplay();
  const statusColorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Catalog
      </button>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <h1 className="text-xl font-semibold">Credential Offer</h1>
          <p className="text-blue-100 text-sm mt-1">{offer.schemaName}</p>
        </div>

        {/* QR Code */}
        <div className="p-8 flex flex-col items-center">
          {offer.status === 'pending' && !isExpired && offer.qrCodeUrl ? (
            <>
              <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-inner">
                <img
                  src={offer.qrCodeUrl}
                  alt="Scan with wallet"
                  className="w-64 h-64"
                />
              </div>
              <p className="mt-4 text-gray-600 text-center">
                Scan this QR code with your digital wallet
              </p>
            </>
          ) : offer.status === 'claimed' ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Success!</h2>
              <p className="text-gray-600 mt-2">The credential has been issued to the wallet.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                {status.icon}
              </div>
              <p className="text-gray-600">{status.text}</p>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className={`px-6 py-4 border-t ${statusColorClasses[status.color as keyof typeof statusColorClasses]}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.icon}
              <span className="font-medium">{status.text}</span>
            </div>
            {offer.status === 'pending' && !isExpired && (
              <span className="text-sm font-mono">
                Expires in {timeRemaining}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            {(offer.status === 'claimed' || offer.status === 'expired' || offer.status === 'failed') && (
              <button
                onClick={onNewCredential}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Issue Another
              </button>
            )}
            {offer.offerUrl && (
              <button
                onClick={() => navigator.clipboard.writeText(offer.offerUrl!)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy URL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Credential data preview */}
      <details className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 font-medium text-gray-700">
          View Credential Data
        </summary>
        <div className="p-4 border-t">
          <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(offer.credentialData, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

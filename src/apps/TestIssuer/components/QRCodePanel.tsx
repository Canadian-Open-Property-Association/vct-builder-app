/**
 * QR Code Panel
 *
 * Right panel showing the generated QR code for credential offers.
 * Displays status updates as the credential exchange progresses.
 */

import { QRCodeSVG } from 'qrcode.react';

export type OfferStatus = 'pending' | 'scanned' | 'accepted' | 'issued' | 'completed' | 'failed' | 'expired';

export interface OfferData {
  offerId: string;
  shortUrl: string;
  longUrl?: string;
  status: OfferStatus;
  credentialName: string;
  expiresAt?: string;
}

interface QRCodePanelProps {
  offer: OfferData | null;
  onReset: () => void;
}

/**
 * Get status display info
 */
const getStatusInfo = (status: OfferStatus) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Waiting for scan',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    case 'scanned':
      return {
        label: 'QR Code scanned',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        ),
      };
    case 'accepted':
      return {
        label: 'Offer accepted',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        icon: (
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ),
      };
    case 'issued':
    case 'completed':
      return {
        label: 'Credential issued',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    case 'failed':
      return {
        label: 'Issuance failed',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    case 'expired':
      return {
        label: 'Offer expired',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    default:
      return {
        label: 'Unknown status',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: null,
      };
  }
};

export default function QRCodePanel({ offer, onReset }: QRCodePanelProps) {
  if (!offer) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code</h3>
          <p className="text-sm text-gray-500 max-w-[300px] mx-auto">
            Fill in the credential attributes and click "Generate Offer" to create a QR code for
            wallet scanning.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(offer.status);
  const isComplete = offer.status === 'issued' || offer.status === 'completed';
  const isFailed = offer.status === 'failed' || offer.status === 'expired';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Credential Offer</h2>
        <p className="text-xs text-gray-500 mt-1">{offer.credentialName}</p>
      </div>

      {/* QR Code Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* QR Code */}
        <div
          className={`p-4 rounded-xl ${
            isComplete ? 'bg-green-50' : isFailed ? 'bg-red-50' : 'bg-white'
          } shadow-lg`}
        >
          {isComplete ? (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-green-700">Credential Issued!</p>
              </div>
            </div>
          ) : isFailed ? (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-700">
                  {offer.status === 'expired' ? 'Offer Expired' : 'Issuance Failed'}
                </p>
              </div>
            </div>
          ) : (
            <QRCodeSVG value={offer.shortUrl} size={200} level="M" includeMargin={true} />
          )}
        </div>

        {/* Status Badge */}
        <div
          className={`mt-6 px-4 py-2 rounded-full flex items-center gap-2 ${statusInfo.bgColor} ${statusInfo.color}`}
        >
          {statusInfo.icon}
          <span className="text-sm font-medium">{statusInfo.label}</span>
        </div>

        {/* Scan instruction */}
        {!isComplete && !isFailed && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            Scan with your mobile wallet to accept the credential
          </p>
        )}

        {/* Expiry info */}
        {offer.expiresAt && !isComplete && !isFailed && (
          <p className="mt-2 text-xs text-gray-400">
            Expires: {new Date(offer.expiresAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={onReset}
          className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isComplete || isFailed
              ? 'text-white bg-purple-600 hover:bg-purple-700'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {isComplete ? 'Issue Another' : isFailed ? 'Try Again' : 'Cancel Offer'}
        </button>
      </div>
    </div>
  );
}

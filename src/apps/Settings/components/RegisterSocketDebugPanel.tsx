/**
 * RegisterSocket Debug Panel
 *
 * Debug panel for testing and monitoring socket.io connections to Orbit RegisterSocket.
 * Shows connection status, session ID, and event log for troubleshooting.
 */

import { useState, useEffect, useCallback } from 'react';
import { socketService, SocketEventLog, SocketConnectionStatus } from '../../../lib/socketService';

interface RegisterSocketDebugPanelProps {
  socketUrl: string | null;
  lobId: string | null;
}

export default function RegisterSocketDebugPanel({ socketUrl, lobId }: RegisterSocketDebugPanelProps) {
  const [status, setStatus] = useState<SocketConnectionStatus>(socketService.getStatus());
  const [sessionId, setSessionId] = useState<string | null>(socketService.getSessionId());
  const [eventLog, setEventLog] = useState<SocketEventLog[]>(socketService.getEventLog());
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = socketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setSessionId(socketService.getSessionId());
    });

    return unsubscribe;
  }, []);

  // Subscribe to events to update log
  useEffect(() => {
    const unsubscribe = socketService.subscribe(() => {
      setEventLog(socketService.getEventLog());
    });

    return unsubscribe;
  }, []);

  // Refresh event log periodically when expanded
  useEffect(() => {
    if (!isLogExpanded) return;

    const interval = setInterval(() => {
      setEventLog(socketService.getEventLog());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLogExpanded]);

  const handleConnect = useCallback(async () => {
    if (!socketUrl || !lobId) {
      setError('Socket URL and LOB ID are required');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await socketService.connect(socketUrl, lobId);
      setSessionId(socketService.getSessionId());
      setEventLog(socketService.getEventLog());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, [socketUrl, lobId]);

  const handleDisconnect = useCallback(() => {
    socketService.disconnect();
    setSessionId(null);
    setEventLog(socketService.getEventLog());
  }, []);

  const handleReconnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await socketService.reconnect();
      setSessionId(socketService.getSessionId());
      setEventLog(socketService.getEventLog());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconnection failed');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleClearLog = useCallback(() => {
    socketService.clearEventLog();
    setEventLog([]);
  }, []);

  const handleCopyLog = useCallback(() => {
    const logText = JSON.stringify(eventLog, null, 2);
    navigator.clipboard.writeText(logText);
  }, [eventLog]);

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Disconnected
          </span>
        );
    }
  };

  const canConnect = !!(socketUrl && lobId);

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">Connection Status</h3>
          {getStatusBadge()}
        </div>

        {/* Configuration Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-sm text-gray-500 w-24 flex-shrink-0">Socket URL:</span>
            <span className="text-sm font-mono text-gray-700 break-all">
              {socketUrl || <span className="text-gray-400 italic">Not configured</span>}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-sm text-gray-500 w-24 flex-shrink-0">LOB ID:</span>
            <span className="text-sm font-mono text-gray-700 break-all">
              {lobId || <span className="text-gray-400 italic">Not configured</span>}
            </span>
          </div>
          {sessionId && (
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-500 w-24 flex-shrink-0">Session ID:</span>
              <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 break-all">
                {sessionId}
              </code>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2">
          {status === 'disconnected' || status === 'error' ? (
            <button
              onClick={handleConnect}
              disabled={!canConnect || isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Connect
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Disconnect
              </button>
              <button
                onClick={handleReconnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                    Reconnecting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reconnect
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {!canConnect && (
          <p className="mt-3 text-xs text-gray-500">
            Configure the Base URL and save in the Overview tab to enable socket connection.
          </p>
        )}
      </div>

      {/* Event Log Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsLogExpanded(!isLogExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">Event Log</span>
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {eventLog.length}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isLogExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isLogExpanded && (
          <div className="border-t border-gray-200">
            {/* Log Controls */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex justify-end gap-2">
              <button
                onClick={handleClearLog}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                Clear
              </button>
              <button
                onClick={handleCopyLog}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </button>
            </div>

            {/* Log Entries */}
            <div className="max-h-80 overflow-y-auto p-4">
              {eventLog.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-8 h-8 text-gray-300 mx-auto mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">No events logged yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Connect to the socket to see events
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventLog.map((log, index) => (
                    <div
                      key={`${log.timestamp}-${index}`}
                      className="text-xs font-mono bg-gray-50 border border-gray-100 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{log.event}</span>
                        <span className="text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-gray-600 whitespace-pre-wrap overflow-x-auto">
                        {typeof log.data === 'object'
                          ? JSON.stringify(log.data, null, 2)
                          : String(log.data)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About RegisterSocket</h4>
        <p className="text-sm text-blue-700">
          RegisterSocket provides real-time event notifications for credential issuance and
          verification. When connected, you'll receive events like:
        </p>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>
            <code className="text-xs bg-blue-100 px-1 rounded">ISSUANCE_RESPONSE</code> - Credential
            offer status updates
          </li>
          <li>
            <code className="text-xs bg-blue-100 px-1 rounded">VERIFICATION_RESPONSE</code> - Proof
            request status updates
          </li>
          <li>
            <code className="text-xs bg-blue-100 px-1 rounded">CONNECTION_RESPONSE</code> -
            Connection state changes
          </li>
        </ul>
      </div>
    </div>
  );
}

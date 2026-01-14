/**
 * Socket Service
 *
 * Singleton service for managing socket.io connection to Orbit RegisterSocket API.
 * Provides hybrid connection model: connects on login, apps can refresh/reconnect as needed.
 *
 * Based on Orbit's RegisterSocket documentation:
 * - Emit REGISTER_SOCKET with lobId to register session
 * - Listen for REGISTER_SOCKET_RESPONSE to get socketSessionId
 * - Listen for ISSUANCE_RESPONSE events for credential status updates
 */

import { io, Socket } from 'socket.io-client';

export interface SocketEventLog {
  timestamp: string;
  event: string;
  data: unknown;
}

export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SocketEventHandler {
  (eventType: string, data: unknown): void;
}

class SocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private lobId: string | null = null;
  private socketUrl: string | null = null;
  private eventLog: SocketEventLog[] = [];
  private maxLogSize = 100;
  private eventHandlers: Set<SocketEventHandler> = new Set();
  private connectionStatus: SocketConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: SocketConnectionStatus) => void> = new Set();

  /**
   * Connect to Orbit RegisterSocket service
   */
  async connect(socketUrl: string, lobId: string): Promise<string> {
    this.socketUrl = socketUrl;
    this.lobId = lobId;

    // Reuse existing live connection
    if (this.socket?.connected && this.sessionId) {
      console.log('[SocketService] Reusing existing connection:', this.sessionId);
      return this.sessionId;
    }

    // Clean up existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        console.log('[SocketService] Connecting to:', socketUrl);

        this.socket = io(socketUrl, {
          transports: ['websocket'],
          timeout: 15000,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
          console.log('[SocketService] Socket connected, id:', this.socket?.id);
          this.logEvent('connect', { socketId: this.socket?.id });

          // Register socket with LOB ID
          console.log('[SocketService] Emitting REGISTER_SOCKET with lobId:', lobId);
          this.socket?.emit('REGISTER_SOCKET', lobId);
        });

        this.socket.on('REGISTER_SOCKET_RESPONSE', (response: unknown) => {
          console.log('[SocketService] REGISTER_SOCKET_RESPONSE:', response);
          this.logEvent('REGISTER_SOCKET_RESPONSE', response);

          const resp = response as { success?: boolean; socketId?: string };
          if (resp?.success) {
            this.sessionId = resp.socketId || this.socket?.id || null;
            this.setStatus('connected');
            console.log('[SocketService] Registered with sessionId:', this.sessionId);
            resolve(this.sessionId || '');
          } else {
            this.setStatus('error');
            reject(new Error('Socket registration failed'));
          }
        });

        this.socket.on('disconnect', (reason: string) => {
          console.log('[SocketService] Disconnected:', reason);
          this.logEvent('disconnect', { reason });
          this.setStatus('disconnected');
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('[SocketService] Connection error:', error);
          this.logEvent('connect_error', { message: error.message });
          this.setStatus('error');
          reject(error);
        });

        this.socket.on('reconnect_attempt', (n: number) => {
          console.log('[SocketService] Reconnect attempt:', n);
          this.logEvent('reconnect_attempt', { attempt: n });
          this.setStatus('connecting');
        });

        this.socket.on('reconnect', (n: number) => {
          console.log('[SocketService] Reconnected after', n, 'attempts');
          this.logEvent('reconnect', { attempts: n });
          // Re-register after reconnect
          if (this.lobId) {
            this.socket?.emit('REGISTER_SOCKET', this.lobId);
          }
        });

        this.socket.on('reconnect_error', (err: Error) => {
          console.warn('[SocketService] Reconnect error:', err);
          this.logEvent('reconnect_error', { message: err.message });
        });

        this.socket.on('reconnect_failed', () => {
          console.error('[SocketService] Reconnect failed');
          this.logEvent('reconnect_failed', {});
          this.setStatus('error');
        });

        // Set up event listeners for credential and verification events
        this.setupEventListeners();

        // Timeout if registration doesn't complete
        setTimeout(() => {
          if (this.connectionStatus === 'connecting') {
            console.warn('[SocketService] Registration timeout');
            this.setStatus('error');
            reject(new Error('Socket registration timeout'));
          }
        }, 20000);
      } catch (error) {
        this.setStatus('error');
        reject(error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Catch-all for debugging
    this.socket.onAny((event: string, ...args: unknown[]) => {
      console.log('[SocketService] Event:', event, args[0]);
      this.logEvent(event, args[0]);
    });

    // ISSUANCE_RESPONSE - credential offer status updates
    this.socket.on('ISSUANCE_RESPONSE', (msg: unknown) => {
      console.log('[SocketService] ISSUANCE_RESPONSE:', JSON.stringify(msg, null, 2));

      const message = msg as {
        payload?: {
          credentialStatus?: string;
          credOfferId?: string;
        };
      };

      const payload = message?.payload || {};
      const status = payload.credentialStatus;
      const credOfferId = payload.credOfferId;

      if (!status || !credOfferId) {
        console.warn('[SocketService] Missing status or credOfferId in ISSUANCE_RESPONSE');
        return;
      }

      // Map Orbit status to internal event types
      let mappedEvent: string;
      switch (status) {
        case 'offer-received':
          mappedEvent = 'offer_received';
          break;
        case 'credential-accepted':
          mappedEvent = 'offer_accepted';
          break;
        case 'stored-in-wallet':
        case 'done':
          mappedEvent = 'credential_issued';
          break;
        default:
          mappedEvent = status;
      }

      this.notifyHandlers(mappedEvent, {
        offerId: credOfferId,
        status,
        raw: payload,
      });
    });

    // CONNECTION_RESPONSE - connection state updates
    this.socket.on('CONNECTION_RESPONSE', (msg: unknown) => {
      console.log('[SocketService] CONNECTION_RESPONSE:', msg);
      const message = msg as { payload?: { state?: string } };
      const state = message?.payload?.state;
      this.notifyHandlers('connection', { state, raw: msg });
    });

    // VERIFICATION_RESPONSE - proof request status updates
    this.socket.on('VERIFICATION_RESPONSE', (msg: unknown) => {
      console.log('[SocketService] VERIFICATION_RESPONSE:', msg);
      const message = msg as { payload?: { proofRequestStatus?: string } };
      const status = message?.payload?.proofRequestStatus;
      this.notifyHandlers('verification', { status, raw: msg });
    });
  }

  private logEvent(event: string, data: unknown) {
    const logEntry: SocketEventLog = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };

    this.eventLog.unshift(logEntry);

    // Keep log size manageable
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(0, this.maxLogSize);
    }
  }

  private setStatus(status: SocketConnectionStatus) {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private notifyHandlers(eventType: string, data: unknown) {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(eventType, data);
      } catch (e) {
        console.error('[SocketService] Handler error:', e);
      }
    });
  }

  /**
   * Subscribe to socket events
   * @returns Unsubscribe function
   */
  subscribe(handler: SocketEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to connection status changes
   * @returns Unsubscribe function
   */
  onStatusChange(listener: (status: SocketConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Immediately notify of current status
    listener(this.connectionStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Disconnect from socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
    this.setStatus('disconnected');
  }

  /**
   * Reconnect to socket (uses stored socketUrl and lobId)
   */
  async reconnect(): Promise<string> {
    if (!this.socketUrl || !this.lobId) {
      throw new Error('Cannot reconnect: no previous connection info');
    }
    this.disconnect();
    return this.connect(this.socketUrl, this.lobId);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get event log for debugging
   */
  getEventLog(): SocketEventLog[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog() {
    this.eventLog = [];
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected === true && this.connectionStatus === 'connected';
  }

  /**
   * Get current connection status
   */
  getStatus(): SocketConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get socket URL (for debugging)
   */
  getSocketUrl(): string | null {
    return this.socketUrl;
  }

  /**
   * Get LOB ID (for debugging)
   */
  getLobId(): string | null {
    return this.lobId;
  }
}

// Export singleton instance
export const socketService = new SocketService();

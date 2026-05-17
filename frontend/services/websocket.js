const RECONNECT_DELAY_MS = 3000;

// Derive WS URL from NEXT_PUBLIC_API_URL (http(s) → ws(s)). Falls back to
// localhost for SSR / dev outside of Next.
function resolveWsUrl() {
  if (typeof window !== 'undefined') {
    const api =
      process.env.NEXT_PUBLIC_API_URL ||
      `${window.location.protocol}//${window.location.hostname}:8000`;
    try {
      const u = new URL(api);
      const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${u.host}/ws`;
    } catch {
      // fall through
    }
  }
  return 'ws://localhost:8000/ws';
}

const WS_URL = resolveWsUrl();

class WebSocketService {
  constructor() {
    this._ws = null;
    this._listeners = {};
    this._shouldReconnect = false;
    this._reconnectTimer = null;
    this._connected = false;
  }

  connect() {
    if (this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._shouldReconnect = true;
    this._createSocket();
  }

  _createSocket() {
    try {
      this._ws = new WebSocket(WS_URL);

      this._ws.onopen = () => {
        this._connected = true;
        this._emit('connected', { connected: true });
      };

      this._ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Emit both the specific event type and a wildcard 'message' event
          if (data.event) {
            this._emit(data.event, data);
          }
          this._emit('message', data);
        } catch {
          // Non-JSON message — ignore
        }
      };

      this._ws.onclose = () => {
        this._connected = false;
        this._emit('disconnected', { connected: false });
        if (this._shouldReconnect) {
          this._scheduleReconnect();
        }
      };

      this._ws.onerror = () => {
        this._connected = false;
        this._emit('error', { message: 'WebSocket error' });
      };
    } catch (err) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._shouldReconnect) {
        this._createSocket();
      }
    }, RECONNECT_DELAY_MS);
  }

  disconnect() {
    this._shouldReconnect = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._connected = false;
  }

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    return () => this.off(event, callback); // return unsubscribe fn
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((cb) => cb !== callback);
  }

  _emit(event, data) {
    const handlers = this._listeners[event] || [];
    handlers.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('WebSocket listener error:', e);
      }
    });
  }

  get isConnected() {
    return this._connected;
  }
}

// Singleton instance
const wsService = new WebSocketService();
export default wsService;

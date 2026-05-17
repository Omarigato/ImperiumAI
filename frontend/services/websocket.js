const RECONNECT_DELAY_MS = 3000;

// Resolve the WebSocket URL from `NEXT_PUBLIC_API_URL`.
//
//   • Accepts full URLs:        https://example.com  →  wss://example.com/ws
//   • Accepts bare hosts:       example.com          →  wss://example.com/ws
//                               (assumes wss:// when the page itself is https)
//   • Accepts hosts with port:  example.com:8000     →  ws(s)://example.com:8000/ws
//   • Falls back to localhost   when the env is missing.
function resolveWsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws';

  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();

  // No env → use the page's host on port 8000 (local dev pattern).
  if (!raw) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.hostname}:8000/ws`;
  }

  // Normalise: if the user pasted a bare host like "api.example.com" or
  // "api.example.com:8000", prepend a protocol matching the page so SSL
  // traffic doesn't get downgraded.
  let withScheme = raw;
  if (!/^https?:\/\//i.test(withScheme)) {
    const pageProto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    withScheme = `${pageProto}//${withScheme}`;
  }

  try {
    const u = new URL(withScheme);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/ws`;
  } catch {
    // Malformed URL — bail out to a safe localhost default.
    return 'ws://localhost:8000/ws';
  }
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

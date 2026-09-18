import {
  WEBSOCKET_EVENT_TYPES,
  type JsonObject,
  type TelemetryEvent,
  type WebSocketEventType,
} from './contracts';
import type {
  FirmwareTelemetryService,
  TelemetryListener,
} from './ports';

type WebSocketLike = Pick<
  WebSocket,
  'close' | 'readyState' | 'send' | 'onopen' | 'onclose' | 'onerror' | 'onmessage'
>;

type WebSocketFactory = (url: string) => WebSocketLike;

interface TelemetryOptions {
  readonly location?: Pick<Location, 'hostname' | 'protocol'>;
  readonly webSocketFactory?: WebSocketFactory;
  readonly reconnectDelayMs?: number;
  readonly setTimeoutImpl?: typeof setTimeout;
  readonly clearTimeoutImpl?: typeof clearTimeout;
}

const KNOWN_EVENT_TYPES = new Set<string>(WEBSOCKET_EVENT_TYPES);

function parseWireEvent(data: unknown): TelemetryEvent | null {
  if (typeof data !== 'string') return null;

  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.type !== 'string' || !KNOWN_EVENT_TYPES.has(source.type)) {
    return null;
  }

  const { type, ...payload } = source;
  return {
    type: type as WebSocketEventType,
    payload: payload as JsonObject,
  };
}

export function firmwareWebSocketUrl(
  locationLike: Pick<Location, 'hostname' | 'protocol'>,
): string {
  const scheme = locationLike.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${locationLike.hostname}:81/ws`;
}

export class SameHostFirmwareTelemetryService implements FirmwareTelemetryService {
  private readonly listeners = new Set<TelemetryListener>();
  private readonly locationLike: Pick<Location, 'hostname' | 'protocol'>;
  private readonly webSocketFactory: WebSocketFactory;
  private readonly reconnectDelayMs: number;
  private readonly setTimeoutImpl: typeof setTimeout;
  private readonly clearTimeoutImpl: typeof clearTimeout;
  private socket: WebSocketLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(options: TelemetryOptions = {}) {
    this.locationLike = options.location ?? window.location;
    this.webSocketFactory =
      options.webSocketFactory ?? ((url) => new WebSocket(url));
    this.reconnectDelayMs = options.reconnectDelayMs ?? 1000;
    this.setTimeoutImpl = options.setTimeoutImpl ?? setTimeout;
    this.clearTimeoutImpl = options.clearTimeoutImpl ?? clearTimeout;
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect(): void {
    this.shouldReconnect = true;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      this.clearTimeoutImpl(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private openSocket(): void {
    const socket = this.webSocketFactory(firmwareWebSocketUrl(this.locationLike));
    this.socket = socket;

    socket.onmessage = (event) => {
      const parsed = parseWireEvent(event.data);
      if (!parsed) return;
      for (const listener of this.listeners) listener(parsed);
    };

    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      // WebSocket close drives reconnect. Do not create a second error protocol.
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer !== null) return;
    this.reconnectTimer = this.setTimeoutImpl(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) this.openSocket();
    }, this.reconnectDelayMs);
  }
}

export { parseWireEvent };

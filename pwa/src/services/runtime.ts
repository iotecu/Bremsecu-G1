import type {
  JsonObject,
  TelemetryEvent,
  TestStartRequest,
} from './contracts';
import type {
  FirmwareConnectionState,
  FirmwareServices,
} from './ports';

export interface FirmwareRuntimeState {
  readonly connection: FirmwareConnectionState;
  readonly device: JsonObject | null;
  readonly status: JsonObject | null;
  readonly settings: JsonObject | null;
  readonly report: JsonObject | null;
  readonly latestTelemetry: Readonly<Record<string, TelemetryEvent>>;
  readonly channelUpdates: Readonly<Record<string, JsonObject>>;
  readonly cableProgressByPin: Readonly<Record<string, JsonObject>>;
  readonly crossScanByPair: Readonly<Record<string, JsonObject>>;
  readonly activeMeasurement: JsonObject | null;
  readonly latestLoadCurrent: JsonObject | null;
  readonly latestTermination: JsonObject | null;
  readonly latestCableCompleted: JsonObject | null;
  readonly lastError: unknown | null;
}

type RuntimeListener = (state: FirmwareRuntimeState) => void;
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export const EMPTY_FIRMWARE_RUNTIME_STATE: FirmwareRuntimeState = {
  connection: 'idle',
  device: null,
  status: null,
  settings: null,
  report: null,
  latestTelemetry: {},
  channelUpdates: {},
  cableProgressByPin: {},
  crossScanByPair: {},
  activeMeasurement: null,
  latestLoadCurrent: null,
  latestTermination: null,
  latestCableCompleted: null,
  lastError: null,
};

function payloadString(payload: JsonObject, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' ? value : null;
}

function payloadNumber(payload: JsonObject, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' ? value : null;
}

function voltageKey(payload: JsonObject): string | null {
  const mode = payloadString(payload, 'mode');
  const pin = payloadNumber(payload, 'pin');
  return mode && pin !== null ? mode + ':' + pin : null;
}

function cablePinKey(payload: JsonObject): string | null {
  const socket = payloadString(payload, 'socket');
  const pin = payloadNumber(payload, 'currentPin');
  return socket && pin !== null ? socket + ':' + pin : null;
}

function crossPairKey(payload: JsonObject): string | null {
  const mode = payloadString(payload, 'mode');
  const focus = payloadNumber(payload, 'focusPin');
  const scanned = payloadNumber(payload, 'scannedPin');
  return mode && focus !== null && scanned !== null
    ? mode + ':' + focus + ':' + scanned
    : null;
}

export class FirmwareRuntime {
  private readonly listeners = new Set<RuntimeListener>();
  private state: FirmwareRuntimeState = EMPTY_FIRMWARE_RUNTIME_STATE;
  private unsubscribeTelemetry: (() => void) | null = null;
  private unsubscribeConnection: (() => void) | null = null;
  private started = false;
  private recoveryGeneration = 0;

  constructor(private readonly services: FirmwareServices) {}

  getSnapshot(): FirmwareRuntimeState {
    return this.state;
  }

  subscribe(listener: RuntimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.unsubscribeTelemetry = this.services.telemetry.subscribe((event) => {
      this.onTelemetry(event);
    });
    this.unsubscribeConnection = this.services.telemetry.subscribeConnection((connection) => {
      this.patch({ connection });
      if (connection === 'open') void this.recoverAuthority();
    });
    this.services.telemetry.connect();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.recoveryGeneration += 1;
    this.unsubscribeTelemetry?.();
    this.unsubscribeConnection?.();
    this.unsubscribeTelemetry = null;
    this.unsubscribeConnection = null;
    this.services.telemetry.disconnect();
    this.patch({ connection: 'idle' });
  }

  async recoverAuthority(): Promise<void> {
    const generation = ++this.recoveryGeneration;

    const [deviceResult, statusResult, settingsResult] = await Promise.allSettled([
      this.services.http.getDevice(),
      this.services.http.getStatus(),
      this.services.http.getSettings(),
    ]);

    if (generation !== this.recoveryGeneration) return;

    const patch: Partial<Mutable<FirmwareRuntimeState>> = {
      lastError: null,
    };

    if (deviceResult.status === 'fulfilled') patch.device = deviceResult.value;
    if (statusResult.status === 'fulfilled') patch.status = statusResult.value;
    if (settingsResult.status === 'fulfilled') patch.settings = settingsResult.value;

    const failure = [deviceResult, statusResult, settingsResult].find(
      (result) => result.status === 'rejected',
    );
    if (failure?.status === 'rejected') patch.lastError = failure.reason;

    this.patch(patch);

    const activeRecordId =
      statusResult.status === 'fulfilled' &&
      typeof statusResult.value.activeRecordId === 'string'
        ? statusResult.value.activeRecordId
        : null;

    if (activeRecordId) {
      try {
        const report = await this.services.http.getReport(activeRecordId);
        if (generation === this.recoveryGeneration) this.patch({ report });
      } catch {
        // A record can exist before it has reportable test evidence.
      }
    }
  }

  async startTest(request: TestStartRequest): Promise<JsonObject> {
    const result = await this.services.http.startTest(request);
    await this.refreshStatus();
    return result;
  }

  async stopTest(): Promise<JsonObject> {
    const result = await this.services.http.stopTest();
    await this.refreshStatus();
    return result;
  }

  async confirmTest(request: JsonObject): Promise<JsonObject> {
    return this.services.http.confirmTest(request);
  }

  async createRecord(request: JsonObject): Promise<JsonObject> {
    const result = await this.services.http.createRecord(request);
    await this.refreshStatus();
    return result;
  }

  searchRecords(query?: Readonly<Record<string, string>>): Promise<JsonObject> {
    return this.services.http.getRecords(query);
  }

  async saveCurrentResult(request: JsonObject = {}): Promise<JsonObject> {
    const result = await this.services.http.saveCurrentResult(request);
    await this.refreshReport();
    return result;
  }

  async refreshReport(recordId?: string): Promise<JsonObject | null> {
    try {
      const report = await this.services.http.getReport(recordId);
      this.patch({ report, lastError: null });
      return report;
    } catch (error) {
      this.patch({ lastError: error });
      return null;
    }
  }

  async updateReport(request: JsonObject, recordId?: string): Promise<JsonObject> {
    const result = await this.services.http.updateReport(request, recordId);
    await this.refreshReport(recordId);
    return result;
  }

  async updateSettings(request: JsonObject): Promise<JsonObject> {
    const result = await this.services.http.updateSettings(request);
    this.patch({ settings: result, lastError: null });
    return result;
  }

  private async refreshStatus(): Promise<void> {
    try {
      const status = await this.services.http.getStatus();
      this.patch({ status, lastError: null });
    } catch (error) {
      this.patch({ lastError: error });
    }
  }

  private onTelemetry(event: TelemetryEvent): void {
    const patch: Partial<Mutable<FirmwareRuntimeState>> = {
      latestTelemetry: {
        ...this.state.latestTelemetry,
        [event.type]: event,
      },
    };

    if (event.type === 'test_started') {
      patch.channelUpdates = {};
      patch.cableProgressByPin = {};
      patch.crossScanByPair = {};
      patch.activeMeasurement = null;
      patch.latestLoadCurrent = null;
      patch.latestTermination = null;
      patch.latestCableCompleted = null;
    }

    if (event.type === 'active_measurement') {
      patch.activeMeasurement = event.payload;
    }

    if (event.type === 'channel_update') {
      const key = voltageKey(event.payload);
      if (key) {
        patch.channelUpdates = {
          ...this.state.channelUpdates,
          [key]: event.payload,
        };
      }
    }

    if (event.type === 'cable_test_progress') {
      const key = cablePinKey(event.payload);
      if (key) {
        patch.cableProgressByPin = {
          ...this.state.cableProgressByPin,
          [key]: event.payload,
        };
      }
    }

    if (event.type === 'cross_scan_update') {
      const key = crossPairKey(event.payload);
      if (key) {
        patch.crossScanByPair = {
          ...this.state.crossScanByPair,
          [key]: event.payload,
        };
      }
    }

    if (event.type === 'load_current_update') {
      patch.latestLoadCurrent = event.payload;
    }

    if (event.type === 'termination_result') {
      patch.latestTermination = event.payload;
    }

    if (event.type === 'cable_test_completed') {
      patch.latestCableCompleted = event.payload;
    }

    this.patch(patch);

    if (event.type === 'record_updated') {
      void this.refreshStatus();
      void this.refreshReport();
    }
  }

  private patch(patch: Partial<FirmwareRuntimeState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }
}

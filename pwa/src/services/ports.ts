import type {
  JsonObject,
  TelemetryEvent,
  TestStartRequest,
} from './contracts';

export interface FirmwareHttpService {
  getDevice(): Promise<JsonObject>;
  getStatus(): Promise<JsonObject>;

  startTest(request: TestStartRequest): Promise<JsonObject>;
  stopTest(): Promise<JsonObject>;
  confirmTest(request: JsonObject): Promise<JsonObject>;

  getRecords(query?: Readonly<Record<string, string>>): Promise<JsonObject>;
  createRecord(request: JsonObject): Promise<JsonObject>;

  saveCurrentResult(request?: JsonObject): Promise<JsonObject>;
  getReport(recordId?: string): Promise<JsonObject>;
  updateReport(request: JsonObject, recordId?: string): Promise<JsonObject>;

  getSettings(): Promise<JsonObject>;
  updateSettings(request: JsonObject): Promise<JsonObject>;
}

export type TelemetryListener = (event: TelemetryEvent) => void;

export type FirmwareConnectionState = 'idle' | 'connecting' | 'open' | 'closed';
export type FirmwareConnectionListener = (state: FirmwareConnectionState) => void;

export interface FirmwareTelemetryService {
  subscribe(listener: TelemetryListener): () => void;
  subscribeConnection(listener: FirmwareConnectionListener): () => void;
  connect(): void;
  disconnect(): void;
}

export interface FirmwareServices {
  readonly http: FirmwareHttpService;
  readonly telemetry: FirmwareTelemetryService;
}

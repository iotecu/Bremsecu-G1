import {
  API_ENDPOINTS,
  type JsonObject,
  type TestStartRequest,
} from './contracts';
import type { FirmwareHttpService } from './ports';

export class FirmwareHttpError extends Error {
  readonly status: number;
  readonly body: JsonObject | null;

  constructor(status: number, body: JsonObject | null) {
    super(
      typeof body?.message === 'string'
        ? body.message
        : typeof body?.error === 'string'
          ? body.error
          : `Firmware HTTP request failed with status ${status}`,
    );
    this.name = 'FirmwareHttpError';
    this.status = status;
    this.body = body;
  }
}

type FetchLike = typeof fetch;

interface FirmwareHttpClientOptions {
  readonly fetchImpl?: FetchLike;
  readonly requestTimeoutMs?: number;
}

function asJsonObject(value: unknown): JsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonObject;
  }
  throw new Error('Invalid firmware JSON object');
}

export class SameHostFirmwareHttpService implements FirmwareHttpService {
  private readonly fetchImpl: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: FirmwareHttpClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10000;
  }

  private async request(
    path: string,
    init?: RequestInit,
  ): Promise<JsonObject> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchImpl(path, {
        ...init,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...init?.headers,
        },
      });

      let parsed: JsonObject | null = null;
      const text = await response.text();
      if (text) {
        try {
          parsed = asJsonObject(JSON.parse(text));
        } catch {
          parsed = null;
        }
      }

      if (!response.ok) {
        throw new FirmwareHttpError(response.status, parsed);
      }

      if (!parsed) throw new FirmwareHttpError(response.status, { error: 'INVALID_RESPONSE' });
      if (parsed.ok === false) throw new FirmwareHttpError(response.status, parsed);
      const settingsRepresentation = path === API_ENDPOINTS.settings && init?.method === 'PUT' &&
        typeof parsed.language === 'string' && typeof parsed.keepScreenAwake === 'boolean' &&
        typeof parsed.serviceCompany === 'string' && Array.isArray(parsed.technicians);
      if (init?.method && init.method !== 'GET' && parsed.ok !== true && !settingsRepresentation) {
        throw new FirmwareHttpError(response.status, { error: 'INVALID_RESPONSE' });
      }
      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  }

  getDevice(): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.device);
  }

  getStatus(): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.status);
  }

  sampleCalibration(channelId: number): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.calibrationSample, {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
  }

  startTest(request: TestStartRequest): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.testStart, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  stopTest(): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.testStop, { method: 'POST' });
  }

  confirmTest(request: JsonObject): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.testConfirm, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  getRecords(query: Readonly<Record<string, string>> = {}): Promise<JsonObject> {
    const params = new URLSearchParams(query);
    const suffix = params.size ? `?${params.toString()}` : '';
    return this.request(`${API_ENDPOINTS.records}${suffix}`);
  }

  createRecord(request: JsonObject): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.records, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  saveCurrentResult(request: JsonObject = {}): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.reportSaveResult, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  getReport(recordId?: string): Promise<JsonObject> {
    const suffix = recordId ? `?recordId=${encodeURIComponent(recordId)}` : '';
    return this.request(`${API_ENDPOINTS.report}${suffix}`);
  }

  updateReport(request: JsonObject, recordId?: string): Promise<JsonObject> {
    const body = recordId ? { ...request, recordId } : request;
    return this.request(API_ENDPOINTS.report, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  getSettings(): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.settings);
  }

  updateSettings(request: JsonObject): Promise<JsonObject> {
    return this.request(API_ENDPOINTS.settings, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }
}

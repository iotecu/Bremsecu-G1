import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FirmwareHttpError,
  SameHostFirmwareHttpService,
} from '../src/services/http-client';
import {
  firmwareWebSocketUrl,
  parseWireEvent,
  SameHostFirmwareTelemetryService,
} from '../src/services/telemetry-client';

test('same-host HTTP client uses the approved firmware paths and JSON verbs', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response('{"ok":true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const http = new SameHostFirmwareHttpService({ fetchImpl });
  await http.getDevice();
  await http.startTest({ mode: 'iso7638_voltage' });
  await http.getRecords({ tractorPlate: '34 ABC 123' });
  await http.updateReport({ diagnosisNote: 'note' });

  assert.equal(calls[0]?.url, '/api/v1/device');
  assert.equal(calls[1]?.url, '/api/v1/test/start');
  assert.equal(calls[1]?.init?.method, 'POST');
  assert.match(String(calls[1]?.init?.body), /iso7638_voltage/);
  assert.equal(
    calls[2]?.url,
    '/api/v1/records?tractorPlate=34+ABC+123',
  );
  assert.equal(calls[3]?.url, '/api/v1/report');
  assert.equal(calls[3]?.init?.method, 'PUT');
});

test('HTTP errors preserve firmware machine payloads', async () => {
  const http = new SameHostFirmwareHttpService({
    fetchImpl: async () =>
      new Response(
        '{"error":"SAFETY_INTERLOCK","i18nKey":"error.safety_interlock"}',
        { status: 409 },
      ),
  });

  await assert.rejects(
    () => http.startTest({ mode: 'axle_lift' }),
    (error: unknown) => {
      assert.ok(error instanceof FirmwareHttpError);
      assert.equal(error.status, 409);
      assert.equal(error.body?.error, 'SAFETY_INTERLOCK');
      return true;
    },
  );
});

test('firmware WebSocket URL follows the active page host and port 81', () => {
  assert.equal(
    firmwareWebSocketUrl({ protocol: 'http:', hostname: '192.168.4.1' }),
    'ws://192.168.4.1:81/ws',
  );
  assert.equal(
    firmwareWebSocketUrl({ protocol: 'https:', hostname: 'bremsecu.local' }),
    'wss://bremsecu.local:81/ws',
  );
});

test('flat firmware WebSocket messages normalize to typed payload events', () => {
  const event = parseWireEvent(
    '{"type":"channel_update","mode":"iso7638_voltage","pin":1,"engineeringValue":24.1,"unit":"V","classificationFinal":false}',
  );
  assert.equal(event?.type, 'channel_update');
  assert.equal(event?.payload.pin, 1);
  assert.equal(event?.payload.engineeringValue, 24.1);
  assert.equal(event?.payload.classificationFinal, false);

  assert.equal(parseWireEvent('not-json'), null);
  assert.equal(parseWireEvent('{"type":"unknown_event"}'), null);
});

test('telemetry reconnects after close without inventing a command channel', () => {
  const sockets: Array<{
    readyState: number;
    close(): void;
    send(): void;
    onopen: ((event: Event) => unknown) | null;
    onclose: ((event: CloseEvent) => unknown) | null;
    onerror: ((event: Event) => unknown) | null;
    onmessage: ((event: MessageEvent) => unknown) | null;
  }> = [];
  const timers: Array<() => void> = [];

  const telemetry = new SameHostFirmwareTelemetryService({
    location: { protocol: 'http:', hostname: '10.0.0.22' },
    webSocketFactory: () => {
      const socket = {
        readyState: 0,
        close() {},
        send() {},
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
      };
      sockets.push(socket);
      return socket as never;
    },
    setTimeoutImpl: ((callback: TimerHandler) => {
      timers.push(callback as () => void);
      return 1 as never;
    }) as typeof setTimeout,
    clearTimeoutImpl: (() => undefined) as typeof clearTimeout,
  });

  telemetry.connect();
  assert.equal(sockets.length, 1);
  sockets[0]?.onclose?.({} as CloseEvent);
  assert.equal(timers.length, 1);
  timers[0]?.();
  assert.equal(sockets.length, 2);
  telemetry.disconnect();
});

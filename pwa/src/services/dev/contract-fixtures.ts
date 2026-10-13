import {
  API_ENDPOINTS,
  type JsonObject,
  type TelemetryEvent,
  type TestStartRequest,
} from '../contracts';

interface FixtureOptions {
  readonly allowOutsideViteDevForTests?: boolean;
}

export interface DevelopmentContractFixtures {
  readonly endpointExamples: Readonly<Record<keyof typeof API_ENDPOINTS, string>>;
  readonly device: JsonObject;
  readonly status: JsonObject;
  readonly testStartRequest: TestStartRequest;
  readonly telemetry: readonly TelemetryEvent[];
}

function isViteDevelopmentBuild(): boolean {
  const meta = import.meta as ImportMeta & {
    readonly env?: {
      readonly DEV?: boolean;
    };
  };

  return meta.env?.DEV === true;
}

export function getDevelopmentContractFixtures(
  options: FixtureOptions = {},
): DevelopmentContractFixtures {
  if (!isViteDevelopmentBuild() && !options.allowOutsideViteDevForTests) {
    throw new Error('Development firmware fixtures are disabled outside Vite development mode.');
  }

  return {
    endpointExamples: API_ENDPOINTS,
    device: {
      productIdentity: 'BREMSECU G1',
      firmwareVersion: 'development-fixture',
      boardRevision: 'development-fixture',
      serialNumber: 'DEV-ONLY',
      networkState: {
        mode: 'development',
      },
      capabilities: [],
    },
    status: {
      safeState: 'idle',
      activeTest: null,
      activeChannel: null,
      relayOutputStateSummary: {},
      unresolvedEngineeringFlags: [],
    },
    testStartRequest: {
      mode: 'iso7638_voltage',
    },
    telemetry: [
      {
        type: 'active_measurement',
        payload: {
          testId: 'dev-test',
          mode: 'iso7638_voltage',
          channelId: 'dev-channel',
          engineeringValue: 0,
          unit: 'V',
          status: 'development',
          classificationFinal: false,
          timestamp: 0,
        },
      },
      {
        type: 'warning',
        payload: {
          code: 'ENGINEERING_VALUE_PENDING',
          i18nKey: 'errors.engineeringValuePending',
        },
      },
    ],
  };
}

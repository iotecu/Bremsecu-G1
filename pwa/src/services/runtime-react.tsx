import React, {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { SameHostFirmwareHttpService } from './http-client';
import { FirmwareRuntime, EMPTY_FIRMWARE_RUNTIME_STATE } from './runtime';
import { SameHostFirmwareTelemetryService } from './telemetry-client';

const FirmwareRuntimeContext = createContext<FirmwareRuntime | null>(null);

export function createBrowserFirmwareRuntime(): FirmwareRuntime {
  return new FirmwareRuntime({
    http: new SameHostFirmwareHttpService(),
    telemetry: new SameHostFirmwareTelemetryService(),
  });
}

export function FirmwareRuntimeProvider({
  children,
  runtime,
}: {
  readonly children: ReactNode;
  readonly runtime: FirmwareRuntime;
}) {
  useEffect(() => {
    runtime.start();
    return () => runtime.stop();
  }, [runtime]);

  return (
    <FirmwareRuntimeContext.Provider value={runtime}>
      {children}
    </FirmwareRuntimeContext.Provider>
  );
}

export function useFirmwareRuntime(): FirmwareRuntime | null {
  return useContext(FirmwareRuntimeContext);
}

export function useFirmwareSnapshot() {
  const runtime = useFirmwareRuntime();

  return useSyncExternalStore(
    runtime ? (listener) => runtime.subscribe(listener) : () => () => undefined,
    runtime ? () => runtime.getSnapshot() : () => EMPTY_FIRMWARE_RUNTIME_STATE,
    () => EMPTY_FIRMWARE_RUNTIME_STATE,
  );
}

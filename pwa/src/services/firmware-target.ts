type FirmwareEnv = {
  readonly VITE_FIRMWARE_ORIGIN?: string;
  readonly VITE_NATIVE_APP?: string;
};

function firmwareEnv(): FirmwareEnv {
  const meta = import.meta as ImportMeta & { readonly env?: FirmwareEnv };
  return meta.env ?? {};
}

function configuredFirmwareOrigin(): string | null {
  const value = firmwareEnv().VITE_FIRMWARE_ORIGIN?.trim();
  return value ? value.replace(/\/+$/, '') : null;
}

export function isNativeAppBuild(): boolean {
  return firmwareEnv().VITE_NATIVE_APP === '1';
}

export function firmwareHttpUrl(path: string): string {
  const origin = configuredFirmwareOrigin();
  if (!origin) return path;
  return origin + (path.startsWith('/') ? path : '/' + path);
}

export function firmwareTelemetryUrl(
  locationLike: Pick<Location, 'hostname' | 'protocol'>,
): string {
  const origin = configuredFirmwareOrigin();
  if (origin) {
    const target = new URL(origin);
    const scheme = target.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${scheme}//${target.hostname}:81/ws`;
  }

  const scheme = locationLike.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${locationLike.hostname}:81/ws`;
}

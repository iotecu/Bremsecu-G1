function configuredFirmwareOrigin(): string | null {
  const value = import.meta.env?.VITE_FIRMWARE_ORIGIN?.trim();
  return value ? value.replace(/\/+$/, '') : null;
}

export function isNativeAppBuild(): boolean {
  return import.meta.env?.VITE_NATIVE_APP === '1';
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

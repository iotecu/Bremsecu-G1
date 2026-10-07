function nativeEnvValue(name: 'VITE_FIRMWARE_ORIGIN' | 'VITE_NATIVE_APP'): string | undefined {
  if (typeof import.meta.env === 'undefined') return undefined;
  return name === 'VITE_FIRMWARE_ORIGIN'
    ? import.meta.env.VITE_FIRMWARE_ORIGIN
    : import.meta.env.VITE_NATIVE_APP;
}

function configuredFirmwareOrigin(): string | null {
  const value = nativeEnvValue('VITE_FIRMWARE_ORIGIN')?.trim();
  return value ? value.replace(/\/+$/, '') : null;
}

export function isNativeAppBuild(): boolean {
  return nativeEnvValue('VITE_NATIVE_APP') === '1';
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

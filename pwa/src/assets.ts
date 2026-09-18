export const ASSET_FILES = [
  'battery-status.svg',
  'bremsecu-logo.png',
  'cable-662-5072.png',
  'cable-683-7072.png',
  'find.svg',
  'hotspot.png',
  'icon-back.svg',
  'icon-home.svg',
  'icon-settings-large.svg',
  'icon-settings.svg',
  'icon-wifi.svg',
  'iso12098-socket.png',
  'iso7638-socket.png',
  'lamp-test.png',
  'login-background.png',
  'report-2.svg',
  'resistance.svg',
  'save1.svg',
  'tiger.png',
  'tractor-icon.png',
  'trailer-icon.png',
  'write.svg',
] as const;

export type AssetFile = (typeof ASSET_FILES)[number];

function baseUrl(): string {
  const candidate = import.meta.env.BASE_URL || './';
  return candidate.endsWith('/') ? candidate : `${candidate}/`;
}

export function assetUrl(asset: AssetFile): string {
  return `${baseUrl()}assets/${asset}`;
}

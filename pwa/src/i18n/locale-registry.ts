import registryData from './locale-registry.json';
import type { LocaleCode, LocaleDefinition } from './types';

export const DEFAULT_LOCALE: LocaleCode = 'tr';
export const FALLBACK_LOCALE: LocaleCode = 'tr';
export const LOCALE_STORAGE_KEY = 'bremsecu.locale';

export const localeRegistry = registryData as readonly LocaleDefinition[];

const localeCodes = new Set<string>(localeRegistry.map(({ code }) => code));

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && localeCodes.has(value);
}

export function getLocaleDefinition(locale: LocaleCode): LocaleDefinition {
  const definition = localeRegistry.find(({ code }) => code === locale);

  if (!definition) {
    throw new Error(`Approved locale is not registered: ${locale}`);
  }

  return definition;
}

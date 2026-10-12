import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './locale-registry';
import { isLocaleCode } from './locale-registry';
import type { LocaleCode } from './types';

export function readStoredLocale(storage?: Pick<Storage, 'getItem'>): LocaleCode {
  if (!storage) {
    return DEFAULT_LOCALE;
  }

  try {
    const storedLocale = storage.getItem(LOCALE_STORAGE_KEY);
    return isLocaleCode(storedLocale) ? storedLocale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function persistLocale(
  locale: LocaleCode,
  storage?: Pick<Storage, 'setItem'>,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

export function getInitialLocale(): LocaleCode {
  return readStoredLocale(typeof window === 'undefined' ? undefined : window.localStorage);
}

export const LOCALES = [
  { code: 'tr', label: 'Türkçe', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'it', label: 'Italiano', dir: 'ltr' },
  { code: 'el', label: 'Ελληνικά', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fa', label: 'فارسی', dir: 'rtl' },
  { code: 'bg', label: 'Български', dir: 'ltr' },
  { code: 'pl', label: 'Polski', dir: 'ltr' },
  { code: 'sr', label: 'Srpski', dir: 'ltr' },
  { code: 'ro', label: 'Română', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
] as const;

export type LocaleCode = typeof LOCALES[number]['code'];
export const DEFAULT_LOCALE: LocaleCode = 'tr';
export const LOCALE_STORAGE_KEY = 'bremsecu.locale';

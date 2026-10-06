import { DEFAULT_LOCALE, LOCALES, LOCALE_STORAGE_KEY, type LocaleCode } from './locale-registry';
import tr from './locales/tr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import el from './locales/el.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import fa from './locales/fa.json';
import bg from './locales/bg.json';
import pl from './locales/pl.json';
import sr from './locales/sr.json';
import ro from './locales/ro.json';
import es from './locales/es.json';

type Dictionary = typeof tr;
type TranslationKey = keyof Dictionary;

const dictionaries: Record<LocaleCode, Dictionary> = {
  tr, en, de, fr, it, el, ru, ar, fa, bg, pl, sr, ro, es,
};

const listeners = new Set<() => void>();

function isLocale(value: string | null): value is LocaleCode {
  return LOCALES.some((locale) => locale.code === value);
}

function initialLocale(): LocaleCode {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

let currentLocale: LocaleCode = initialLocale();

function applyDocumentLanguage(locale: LocaleCode) {
  if (typeof document === 'undefined') return;
  const meta = LOCALES.find((item) => item.code === locale)!;
  document.documentElement.lang = locale;
  document.documentElement.dir = meta.dir;
}

applyDocumentLanguage(currentLocale);

export function getLocale(): LocaleCode {
  return currentLocale;
}

export function setLocale(locale: LocaleCode): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
  applyDocumentLanguage(locale);
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: TranslationKey): string {
  return dictionaries[currentLocale][key] ?? tr[key] ?? String(key);
}

export { LOCALES };
export type { LocaleCode, TranslationKey };

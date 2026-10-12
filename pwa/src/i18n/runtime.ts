import ar from './locales/ar.json';
import bg from './locales/bg.json';
import de from './locales/de.json';
import el from './locales/el.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fa from './locales/fa.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import sr from './locales/sr.json';
import tr from './locales/tr.json';
import { FALLBACK_LOCALE, getLocaleDefinition } from './locale-registry';
import type {
  LocaleCode,
  TranslationDictionary,
  TranslationKey,
  TranslationVariables,
} from './types';

export const dictionaries: Readonly<Record<LocaleCode, TranslationDictionary>> = {
  tr,
  en,
  de,
  fr,
  it,
  el,
  ru,
  ar,
  fa,
  bg,
  pl,
  sr,
  ro,
  es,
};

function getPathValue(dictionary: TranslationDictionary, key: TranslationKey): string | undefined {
  let current: unknown = dictionary;

  for (const segment of key.split('.')) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' && current.trim().length > 0 ? current : undefined;
}

function interpolate(template: string, variables?: TranslationVariables): string {
  if (!variables) {
    return template;
  }

  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (placeholder, name: string) => {
    const value = variables[name];
    return value === undefined ? placeholder : String(value);
  });
}

export function translate(
  locale: LocaleCode,
  key: TranslationKey,
  variables?: TranslationVariables,
): string {
  return resolveTranslation(
    dictionaries[locale],
    dictionaries[FALLBACK_LOCALE],
    key,
    variables,
  );
}

export function resolveTranslation(
  targetDictionary: TranslationDictionary,
  sourceDictionary: TranslationDictionary,
  key: TranslationKey,
  variables?: TranslationVariables,
): string {
  const sourceValue = getPathValue(sourceDictionary, key);

  if (!sourceValue) {
    throw new Error(`Turkish source translation is missing: ${key}`);
  }

  const localizedValue = getPathValue(targetDictionary, key) ?? sourceValue;
  return interpolate(localizedValue, variables);
}

export function formatLocalizedNumber(
  locale: LocaleCode,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocaleDefinition(locale).intlLocale, options).format(value);
}

export function formatLocalizedDate(
  locale: LocaleCode,
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getLocaleDefinition(locale).intlLocale, options).format(value);
}

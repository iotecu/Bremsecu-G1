import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  getLocaleDefinition,
  isLocaleCode,
  localeRegistry,
} from './locale-registry';
import {
  formatLocalizedDate,
  formatLocalizedNumber,
  translate,
} from './runtime';
import { persistLocale } from './storage';
import type { I18nContextValue, LocaleCode } from './types';

const I18nContext = createContext<I18nContextValue | null>(null);

export function applyDocumentLocale(locale: LocaleCode): void {
  if (typeof document === 'undefined') {
    return;
  }

  const definition = getLocaleDefinition(locale);
  document.documentElement.lang = definition.code;
  document.documentElement.dir = definition.direction;
}

interface I18nProviderProps {
  readonly children: ReactNode;
  readonly initialLocale?: LocaleCode;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale);

  useLayoutEffect(() => {
    applyDocumentLocale(locale);
    persistLocale(locale, typeof window === 'undefined' ? undefined : window.localStorage);
  }, [locale]);

  const setLocale = useCallback((nextLocale: LocaleCode | string) => {
    setLocaleState(isLocaleCode(nextLocale) ? nextLocale : DEFAULT_LOCALE);
  }, []);

  const contextValue = useMemo<I18nContextValue>(() => {
    const definition = getLocaleDefinition(locale);

    return {
      locale,
      direction: definition.direction,
      availableLocales: localeRegistry,
      setLocale,
      t: (key, variables) => translate(locale, key, variables),
      formatNumber: (value, options) => formatLocalizedNumber(locale, value, options),
      formatDate: (value, options) => formatLocalizedDate(locale, value, options),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider.');
  }

  return context;
}

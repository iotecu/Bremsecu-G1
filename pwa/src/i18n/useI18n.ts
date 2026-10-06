import { useSyncExternalStore } from 'react';
import { getLocale, LOCALES, setLocale, subscribeLocale, t } from './index';

export function useI18n() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return { locale, locales: LOCALES, setLocale, t };
}

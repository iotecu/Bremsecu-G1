import type tr from './locales/tr.json';

export type LocaleCode =
  | 'tr'
  | 'en'
  | 'de'
  | 'fr'
  | 'it'
  | 'el'
  | 'ru'
  | 'ar'
  | 'fa'
  | 'bg'
  | 'pl'
  | 'sr'
  | 'ro'
  | 'es';

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleDefinition {
  readonly code: LocaleCode;
  readonly nativeLabel: string;
  readonly direction: TextDirection;
  readonly intlLocale: string;
}

type TranslationSource = typeof tr;

type LeafPaths<T> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Key
    : T[Key] extends Record<string, unknown>
      ? `${Key}.${LeafPaths<T[Key]>}`
      : never;
}[keyof T & string];

export type TranslationKey = LeafPaths<TranslationSource>;
export type TranslationDictionary = TranslationSource;
export type TranslationVariables = Readonly<Record<string, string | number>>;

export interface I18nContextValue {
  readonly locale: LocaleCode;
  readonly direction: TextDirection;
  readonly availableLocales: readonly LocaleDefinition[];
  readonly setLocale: (locale: LocaleCode | string) => void;
  readonly t: (key: TranslationKey, variables?: TranslationVariables) => string;
  readonly formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  readonly formatDate: (
    value: Date | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
}

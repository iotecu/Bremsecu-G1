import React from 'react';
import { useI18n } from '../i18n/useI18n';
import type { LocaleCode } from '../i18n';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LanguageSelector({ open, onClose }: Props) {
  const { locale, locales, setLocale, t } = useI18n();
  if (!open) return null;

  return (
    <div className="language-selector__scrim" role="presentation" onClick={onClose}>
      <section
        className="language-selector"
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.language')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="language-selector__header">
          <h2>{t('settings.language')}</h2>
          <button type="button" className="language-selector__close" onClick={onClose} aria-label={t('settings.language')}>
            ×
          </button>
        </header>
        <div className="language-selector__list">
          {locales.map((item) => (
            <button
              type="button"
              key={item.code}
              className={item.code === locale ? 'language-selector__item is-active' : 'language-selector__item'}
              dir={item.dir}
              onClick={() => {
                setLocale(item.code as LocaleCode);
                onClose();
              }}
            >
              <span>{item.label}</span>
              <span className="language-selector__code">{item.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

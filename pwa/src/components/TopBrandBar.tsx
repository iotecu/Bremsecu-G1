import React from 'react';
import { assetUrl } from '../assets';
import type { LocaleDefinition } from '../i18n';

interface TopBrandBarProps {
  readonly availableLocales: readonly LocaleDefinition[];
  readonly compact?: boolean;
  readonly locale: string;
  readonly onLocaleChange: (locale: string) => void;
  readonly title: string;
  readonly wifiConnected: boolean;
}

export function TopBrandBar({
  availableLocales, compact = false, locale, onLocaleChange, title, wifiConnected,
}: TopBrandBarProps) {
  return (
    <header className={compact ? 'top-brand-bar top-brand-bar--compact' : 'top-brand-bar'}>
      {!compact ? <img alt={title} className="top-brand-bar__logo" src={assetUrl('bremsecu-logo.png')} /> : null}
      <img alt="" aria-hidden="true" className="top-brand-bar__wifi" data-connected={wifiConnected ? 'true' : 'false'} src={assetUrl('icon-wifi.svg')} />
      <select aria-label={title} className="top-brand-bar__language" lang={locale} onChange={(event) => onLocaleChange(event.target.value)} value={locale}>
        {availableLocales.map((item) => <option key={item.code} value={item.code}>{item.code.toUpperCase()}</option>)}
      </select>
    </header>
  );
}

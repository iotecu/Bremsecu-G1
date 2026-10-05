import { wifiSvg } from './wifi-svg';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined); else void document.documentElement.requestFullscreen?.().catch(() => undefined); };
  return (
    <header className={compact ? 'top-brand-bar top-brand-bar--compact' : 'top-brand-bar'}>
      {!compact ? <button className="top-brand-bar__fullscreen" aria-label={t('navigation.fullscreen')} onClick={fullscreen}><img alt={title} className="top-brand-bar__logo" src={assetUrl('bremsecu-logo.png')} /></button> : null}
      <span aria-label={wifiConnected ? 'Wi-Fi ✓' : 'Wi-Fi ×'} className="top-brand-bar__wifi" data-connected={wifiConnected ? 'true' : 'false'} style={{color:wifiConnected ? '#5A9B24':'#DA130D'}} dangerouslySetInnerHTML={{__html:wifiSvg}} />
      <select aria-label={title} className="top-brand-bar__language" lang={locale} onChange={(event) => onLocaleChange(event.target.value)} value={locale}>
        {availableLocales.map((item) => <option key={item.code} value={item.code}>{item.code.toUpperCase()}</option>)}
      </select>
    </header>
  );
}

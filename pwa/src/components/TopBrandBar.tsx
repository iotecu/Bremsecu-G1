import React from 'react';
import { assetUrl } from '../assets';

interface TopBrandBarProps {
  readonly locale: string;
  readonly title: string;
}

export function TopBrandBar({ locale, title }: TopBrandBarProps) {
  return (
    <header className="top-brand-bar">
      <img alt={title} className="top-brand-bar__logo" src={assetUrl('bremsecu-logo.png')} />
      <div className="top-brand-bar__status">
        <img alt="" aria-hidden="true" className="top-brand-bar__wifi" src={assetUrl('icon-wifi.svg')} />
        <span className="top-brand-bar__language" lang={locale}>{locale.toUpperCase()}</span>
      </div>
    </header>
  );
}

import React from 'react';
import { assetUrl } from '../assets';

interface BottomNavigationProps {
  readonly backLabel: string;
  readonly homeLabel: string;
  readonly settingsLabel: string;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onSettings: () => void;
}

export function BottomNavigation({
  backLabel,
  homeLabel,
  settingsLabel,
  onBack,
  onHome,
  onSettings,
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label={homeLabel}>
      <button aria-label={backLabel} className="bottom-navigation__button" data-nav="back" type="button" onClick={onBack}>
        <img alt="" aria-hidden="true" src={assetUrl('icon-back.svg')} />
      </button>
      <button aria-label={homeLabel} className="bottom-navigation__button bottom-navigation__button--home" data-nav="home" type="button" onClick={onHome}>
        <img alt="" aria-hidden="true" src={assetUrl('icon-home.svg')} />
      </button>
      <button aria-label={settingsLabel} className="bottom-navigation__button" data-nav="settings" type="button" onClick={onSettings}>
        <img alt="" aria-hidden="true" src={assetUrl('icon-settings.svg')} />
      </button>
    </nav>
  );
}

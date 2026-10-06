import React from 'react';
import { assetUrl } from '../assets';

interface BottomNavigationProps {
  readonly backLabel: string;
  readonly homeLabel: string;
  readonly settingsLabel: string;
  readonly vehicleLabel: string;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onSettings: () => void;
  readonly onVehicle: () => void;
}

export function BottomNavigation({
  backLabel,
  homeLabel,
  settingsLabel,
  vehicleLabel,
  onBack,
  onHome,
  onSettings,
  onVehicle,
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label={homeLabel}>
      <div className="bottom-navigation__inner">
        <button aria-label={backLabel} className="bottom-navigation__button" data-nav="back" type="button" onClick={onBack}>
          <img alt="" aria-hidden="true" src={assetUrl('icon-back.svg')} />
        </button>
        <button aria-label={vehicleLabel} className="bottom-navigation__button" data-nav="vehicle" type="button" onClick={onVehicle}>
          <svg className="bottom-navigation__vehicle-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6.5h10v9H3zM13 9h4l3 3v3.5h-7zM6.5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17.5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          </svg>
        </button>
        <button aria-label={homeLabel} className="bottom-navigation__button bottom-navigation__button--home" data-nav="home" type="button" onClick={onHome}>
          <img alt="" aria-hidden="true" src={assetUrl('icon-home.svg')} />
        </button>
        <button aria-label={settingsLabel} className="bottom-navigation__button" data-nav="settings" type="button" onClick={onSettings}>
          <img alt="" aria-hidden="true" src={assetUrl('icon-settings.svg')} />
        </button>
      </div>
    </nav>
  );
}

import React, { type ReactNode } from 'react';

export type BottomNavigationItem = 'home' | 'vehicle' | 'settings';

interface BottomNavigationProps {
  readonly activeItem?: BottomNavigationItem | null;
  readonly backLabel: string;
  readonly homeLabel: string;
  readonly settingsLabel: string;
  readonly vehicleLabel: string;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onSettings: () => void;
  readonly onVehicle: () => void;
}

function NavIcon({ children }: { readonly children: ReactNode }) {
  return (
    <span className="bottom-navigation__icon" aria-hidden="true">
      {children}
    </span>
  );
}

function BackIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14.5 5-7 7 7 7" />
        <path d="M8 12h11" />
      </svg>
    </NavIcon>
  );
}

function VehicleIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h10v8H3z" />
        <path d="M13 9h4l3 3v3h-7" />
        <path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </svg>
    </NavIcon>
  );
}

function HomeIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3.5 10.5 8.5-7 8.5 7" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    </NavIcon>
  );
}

function SettingsIcon() {
  return (
    <NavIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.2 13.3a7.7 7.7 0 0 0 0-2.6l2-1.5-2-3.4-2.5 1a8 8 0 0 0-2.2-1.3L14.2 2H9.8l-.4 3.5a8 8 0 0 0-2.2 1.3l-2.5-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2.6l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 2.2 1.3l.4 3.5h4.4l.4-3.5a8 8 0 0 0 2.2-1.3l2.5 1 2-3.4-2.1-1.5Z" />
      </svg>
    </NavIcon>
  );
}

function NavButton({
  active = false,
  icon,
  label,
  nav,
  onClick,
}: {
  readonly active?: boolean;
  readonly icon: ReactNode;
  readonly label: string;
  readonly nav: 'back' | BottomNavigationItem;
  readonly onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={'bottom-navigation__button' + (active ? ' is-active' : '')}
      data-nav={nav}
      type="button"
      onClick={onClick}
    >
      {icon}
      <span className="bottom-navigation__label">{label}</span>
    </button>
  );
}

export function BottomNavigation({
  activeItem = 'home',
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
      <div className="bottom-navigation__glass">
        <div className="bottom-navigation__inner">
          <NavButton icon={<BackIcon />} label={backLabel} nav="back" onClick={onBack} />
          <NavButton active={activeItem === 'vehicle'} icon={<VehicleIcon />} label={vehicleLabel} nav="vehicle" onClick={onVehicle} />
          <NavButton active={activeItem === 'home'} icon={<HomeIcon />} label={homeLabel} nav="home" onClick={onHome} />
          <NavButton active={activeItem === 'settings'} icon={<SettingsIcon />} label={settingsLabel} nav="settings" onClick={onSettings} />
        </div>
      </div>
    </nav>
  );
}

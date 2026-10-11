import React, { type ReactNode } from 'react';
import { useI18n, type TranslationKey } from '../../i18n';

type ModuleId =
  | 'iso7638'
  | 'iso12098'
  | 'cable'
  | 'can'
  | 'lamp'
  | 'reports'
  | 'settings'
  | 'battery';

type CanChoice = {
  readonly iso: '7638' | '12098';
  readonly side: 'tractor' | 'trailer';
  readonly subSlide: 0 | 1 | 2 | 3;
};

function IconFrame({ children }: { readonly children: ReactNode }) {
  return <span className="p5-dashboard-card__icon" aria-hidden="true">{children}</span>;
}

function VoltageIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.6 2.5 6.8 13h4.8l-1.2 8.5L17.2 11h-4.8l1.2-8.5Z" />
      </svg>
    </IconFrame>
  );
}

function CableIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5v5a3 3 0 0 0 3 3h2" />
        <path d="M20 19v-5a3 3 0 0 0-3-3h-2" />
        <path d="M2.5 3h3v4h-3zM18.5 17h3v4h-3z" />
        <path d="M9 13h6M11 10l-2 3 2 3M13 8l2 3-2 3" />
      </svg>
    </IconFrame>
  );
}

function CanIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2.5" width="6" height="5" rx="1.2" />
        <rect x="2.5" y="16.5" width="6" height="5" rx="1.2" />
        <rect x="15.5" y="16.5" width="6" height="5" rx="1.2" />
        <path d="M12 7.5v4M5.5 16.5v-5h13v5" />
      </svg>
    </IconFrame>
  );
}

function LampIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M9.5 21h5M8.6 15.5C7 14.4 6 12.6 6 10.5a6 6 0 1 1 12 0c0 2.1-1 3.9-2.6 5-.7.5-1.1 1.1-1.2 2H9.8c-.1-.9-.5-1.5-1.2-2Z" />
        <path d="M12 1V0M4.9 3.4 3.8 2.3M19.1 3.4l1.1-1.1M3 10H1.5M22.5 10H21" />
      </svg>
    </IconFrame>
  );
}

function ReportIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2.5h8l4 4V21.5H6zM14 2.5v4h4M9 11h6M9 15h6M9 18h4" />
      </svg>
    </IconFrame>
  );
}

function SettingsIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.2 13.3a7.8 7.8 0 0 0 0-2.6l2-1.5-2-3.5-2.5 1a8 8 0 0 0-2.2-1.3L14.2 2h-4.4l-.4 3.4a8 8 0 0 0-2.2 1.3l-2.5-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 2.6l-2 1.5 2 3.5 2.5-1a8 8 0 0 0 2.2 1.3l.4 3.4h4.4l.4-3.4a8 8 0 0 0 2.2-1.3l2.5 1 2-3.5-2.1-1.5Z" />
      </svg>
    </IconFrame>
  );
}

function BatteryIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="6.5" width="18" height="11" rx="2" />
        <path d="M20.5 10h1.8v4h-1.8M6 10v4M10 10v4M14 10v4" />
      </svg>
    </IconFrame>
  );
}

function ChoiceIcon() {
  return (
    <IconFrame>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="11" cy="18" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    </IconFrame>
  );
}

function ModuleCard({
  action,
  icon,
  subtitle,
  title,
  onClick,
}: {
  readonly action: string;
  readonly icon: ReactNode;
  readonly subtitle?: string;
  readonly title: string;
  readonly onClick: () => void;
}) {
  return (
    <button className="p5-dashboard-card" data-action={action} type="button" onClick={onClick}>
      {icon}
      <span className="p5-dashboard-card__copy">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
      <span className="p5-dashboard-card__chevron" aria-hidden="true">›</span>
    </button>
  );
}

export function MainDashboardScreen({
  onBattery,
  onCable,
  onCan,
  onIso12098,
  onIso7638,
  onLamp,
  onReports,
  onSettings,
}: {
  readonly onBattery: () => void;
  readonly onCable: () => void;
  readonly onCan: () => void;
  readonly onIso12098: () => void;
  readonly onIso7638: () => void;
  readonly onLamp: () => void;
  readonly onReports: () => void;
  readonly onSettings: () => void;
}) {
  const { t } = useI18n();

  const modules: readonly {
    id: ModuleId;
    action: string;
    titleKey: TranslationKey;
    subtitleKey?: TranslationKey;
    icon: ReactNode;
    onClick: () => void;
  }[] = [
    { id: 'iso7638', action: 'dashboard-iso7638', titleKey: 'phase5.module.iso7638Voltage', subtitleKey: 'phase5.module.sideVoltage', icon: <VoltageIcon />, onClick: onIso7638 },
    { id: 'iso12098', action: 'dashboard-iso12098', titleKey: 'phase5.module.iso12098Voltage', subtitleKey: 'phase5.module.sideVoltage', icon: <VoltageIcon />, onClick: onIso12098 },
    { id: 'cable', action: 'dashboard-cable', titleKey: 'phase5.module.cable', subtitleKey: 'phase5.module.sideCable', icon: <CableIcon />, onClick: onCable },
    { id: 'can', action: 'dashboard-can', titleKey: 'phase5.module.canTermination', subtitleKey: 'phase5.module.sideTermination', icon: <CanIcon />, onClick: onCan },
    { id: 'lamp', action: 'dashboard-lamp', titleKey: 'phase5.module.lamp', subtitleKey: 'phase5.module.sideLamp', icon: <LampIcon />, onClick: onLamp },
    { id: 'reports', action: 'dashboard-reports', titleKey: 'phase5.module.reports', subtitleKey: 'phase5.module.sideReport', icon: <ReportIcon />, onClick: onReports },
    { id: 'settings', action: 'dashboard-settings', titleKey: 'phase5.module.settings', subtitleKey: 'phase5.module.sideSettings', icon: <SettingsIcon />, onClick: onSettings },
    { id: 'battery', action: 'dashboard-battery', titleKey: 'phase5.module.battery', subtitleKey: 'phase5.module.sideBattery', icon: <BatteryIcon />, onClick: onBattery },
  ];

  return (
    <section className="p5-dashboard" data-screen="main-dashboard">
      <div className="p5-dashboard__grid">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            action={module.action}
            icon={module.icon}
            title={t(module.titleKey)}
            subtitle={module.subtitleKey ? t(module.subtitleKey) : undefined}
            onClick={module.onClick}
          />
        ))}
      </div>
    </section>
  );
}

export function CableMenuScreen({
  onSelect,
}: {
  readonly onSelect: (iso: '7638' | '12098') => void;
}) {
  const { t } = useI18n();

  return (
    <section className="p5-submenu" data-screen="cable-menu">
      <header className="p5-submenu__heading">
        <CableIcon />
        <div>
          <h1>{t('phase5.module.cable')}</h1>
          <p>{t('phase5.cable.chooseStandard')}</p>
        </div>
      </header>
      <div className="p5-submenu__grid p5-submenu__grid--two">
        <ModuleCard action="cable-iso7638" icon={<ChoiceIcon />} title="ISO 7638" subtitle={t('phase5.module.sideCable')} onClick={() => onSelect('7638')} />
        <ModuleCard action="cable-iso12098" icon={<ChoiceIcon />} title="ISO 12098" subtitle={t('phase5.module.sideCable')} onClick={() => onSelect('12098')} />
      </div>
    </section>
  );
}

export function CanMenuScreen({
  onSelect,
}: {
  readonly onSelect: (choice: CanChoice) => void;
}) {
  const { t } = useI18n();

  const choices: readonly CanChoice[] = [
    { iso: '7638', side: 'tractor', subSlide: 0 },
    { iso: '12098', side: 'tractor', subSlide: 1 },
    { iso: '7638', side: 'trailer', subSlide: 2 },
    { iso: '12098', side: 'trailer', subSlide: 3 },
  ];

  return (
    <section className="p5-submenu" data-screen="can-menu">
      <header className="p5-submenu__heading">
        <CanIcon />
        <div>
          <h1>{t('phase5.module.canTermination')}</h1>
          <p>{t('phase5.termination.ignitionOff')}</p>
        </div>
      </header>
      <div className="p5-submenu__grid">
        {choices.map((choice) => (
          <ModuleCard
            key={choice.iso + '-' + choice.side}
            action={'can-' + choice.iso + '-' + choice.side}
            icon={<CanIcon />}
            title={'ISO ' + choice.iso}
            subtitle={choice.side === 'tractor' ? t('phase5.form.tractor') : t('phase5.form.trailer')}
            onClick={() => onSelect(choice)}
          />
        ))}
      </div>
    </section>
  );
}

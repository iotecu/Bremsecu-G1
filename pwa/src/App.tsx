import React, { useState } from 'react';
import { AppShell } from './components';
import {
  activateServiceRecord, closeOverlay, completeAxleLiftSafety, completeIso12098PinValidation, confirmCanSafety,
  continueFromLogin, goBack, goHome, goSettings, initialNavigationState, moveCanSubSlide, moveMainCard,
  openAxleLiftSafety, openCableBranch, openCanSafety, openCommonSaveOverlay, openEntryOldRecordSearch,
  openIso12098PinValidation, openIso12098VoltageMeasurement, openIso7638VoltageMeasurement, openLampMeasurement,
  openNewVehicleForm, openReportFromOldRecordSearch, openReportSave, openReports, openSettingsDetail, retestFromReport, startCableMeasurement,
} from './navigation';
import {
  ConditionalValidationModal, LoginScreen, MainCarouselScreen, NewVehicleRecordScreen,
  RecordSearchModal, VehicleEntryScreen, VoltageMeasurementScreen,
} from './screens/phase5/group-a';
import {
  CableMeasurementScreen, CableRootCard, CableSelectionScreen, CanTerminationRootCard,
  TerminationResultScreen, TerminationSafetyScreen,
} from './screens/phase5/group-b';
import {
  AxleLiftSafetyScreen, CommonSaveModal, LampMeasurementScreen, LampRootCard,
  ReportResultScreen, ReportSaveModal, ReportsRootCard,
} from './screens/phase5/group-c';
import {
  BatteryStatusCard, SettingsDetailScreen, SettingsRootCard,
} from './screens/phase5/group-d';
import type { NavigationState } from './navigation/model';
import { useFirmwareRuntime, useFirmwareSnapshot } from './services/runtime-react';
import type { ApprovedTestMode } from './services/contracts';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
}

function canRouteInfo(route: string): {
  iso: '7638' | '12098';
  side: 'tractor' | 'trailer';
  socket: 1 | 2 | 3 | 4;
} | null {
  switch (route) {
    case 'iso7638-can-tractor-safety':
    case 'iso7638-can-tractor-resistance':
      return { iso: '7638', side: 'tractor', socket: 1 };
    case 'iso12098-can-tractor-safety':
    case 'iso12098-can-tractor-resistance':
      return { iso: '12098', side: 'tractor', socket: 2 };
    case 'iso7638-can-trailer-safety':
    case 'iso7638-can-trailer-resistance':
      return { iso: '7638', side: 'trailer', socket: 3 };
    case 'iso12098-can-trailer-safety':
    case 'iso12098-can-trailer-resistance':
      return { iso: '12098', side: 'trailer', socket: 4 };
    default:
      return null;
  }
}

function visualNavigationState(): NavigationState {
  if (typeof window === 'undefined') return initialNavigationState;
  const params = new URLSearchParams(window.location.search);
  const visualHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  if (!visualHost || params.get('visual') !== '1') return initialNavigationState;

  const screen = Number(params.get('screen') ?? '1');
  const base: NavigationState = {
    ...initialNavigationState,
    hasActiveServiceRecord: true,
  };

  if (screen === 1) return initialNavigationState;
  if (screen === 2) return { ...base, route: 'vehicle-entry', hasActiveServiceRecord: false };
  if (screen === 3) return { ...base, route: 'new-vehicle-form', hasActiveServiceRecord: false };
  if (screen === 4) return {
    ...base,
    route: 'vehicle-entry',
    hasActiveServiceRecord: false,
    overlay: { kind: 'old-record-search', origin: 'vehicle-entry' },
  };
  if (screen === 5) return { ...base, route: 'test-carousel', activeCardIndex: 0 };
  if (screen === 6) return { ...base, route: 'iso7638-voltage-measurement', activeCardIndex: 0 };
  if (screen === 7) return { ...base, route: 'test-carousel', activeCardIndex: 1 };
  if (screen === 8) return { ...base, route: 'iso12098-voltage-measurement', activeCardIndex: 1 };
  if (screen === 9) return { ...base, route: 'iso12098-pin10-validation', activeCardIndex: 1 };
  if (screen === 10) return { ...base, route: 'iso12098-pin11-validation', activeCardIndex: 1 };
  if (screen === 11) return { ...base, route: 'iso12098-pin12-validation', activeCardIndex: 1 };
  if (screen === 12) return { ...base, route: 'test-carousel', activeCardIndex: 2 };
  if (screen === 13) return { ...base, route: 'iso7638-cable-select', activeCardIndex: 2 };
  if (screen === 14) return { ...base, route: 'iso7638-cable-measurement', activeCardIndex: 2 };
  if (screen === 15) return { ...base, route: 'iso12098-cable-select', activeCardIndex: 2 };
  if (screen === 16) return { ...base, route: 'iso12098-cable-measurement', activeCardIndex: 2 };
  if (screen >= 17 && screen <= 21) {
    const sub = screen === 19 ? 2 : screen === 20 ? 1 : screen === 21 ? 3 : 0;
    return { ...base, route: 'test-carousel', activeCardIndex: 3, canSubSlide: sub };
  }
  const canRoutes: Partial<Record<number, NavigationState['route']>> = {
    22:'iso7638-can-tractor-safety',23:'iso7638-can-tractor-resistance',
    24:'iso7638-can-trailer-safety',25:'iso7638-can-trailer-resistance',
    26:'iso12098-can-tractor-safety',27:'iso12098-can-tractor-resistance',
    28:'iso12098-can-trailer-safety',29:'iso12098-can-trailer-resistance',
  };
  if (canRoutes[screen]) return { ...base, route: canRoutes[screen]!, activeCardIndex: 3 };
  if (screen === 30) return { ...base, route: 'test-carousel', activeCardIndex: 4 };
  if (screen === 31) return { ...base, route: 'lamp-test-measurement', activeCardIndex: 4 };
  if (screen === 32) return { ...base, route: 'axle-lift-safety', activeCardIndex: 4 };
  if (screen === 33) return { ...base, route: 'test-carousel', activeCardIndex: 5 };
  if (screen === 34) return { ...base, route: 'report-result', activeCardIndex: 5 };
  if (screen === 35) return {
    ...base,
    route: 'report-result',
    activeCardIndex: 5,
    overlay: { kind: 'report-save', returnTo: 'report-result' },
  };
  if (screen === 36) return {
    ...base,
    route: 'lamp-test-measurement',
    activeCardIndex: 4,
    overlay: { kind: 'report-save-common', returnTo: 'lamp-test-measurement' },
  };
  if (screen === 37) return { ...base, route: 'test-carousel', activeCardIndex: 6 };
  if (screen === 38) return { ...base, route: 'settings-detail', activeCardIndex: 6 };
  if (screen === 39) return { ...base, route: 'test-carousel', activeCardIndex: 7 };
  if (screen === 40) return {
    ...base,
    route: 'test-carousel',
    activeCardIndex: 5,
    hasActiveServiceRecord: false,
    overlay: { kind: 'old-record-search', origin: 'reports' },
  };
  return initialNavigationState;
}

export default function App() {
  const [navigation, setNavigation] = useState<NavigationState>(visualNavigationState);
  const firmwareRuntime = useFirmwareRuntime();
  const firmware = useFirmwareSnapshot();
  const visualPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('visual') === '1';
  const wifiConnected =
    firmware.connection === 'open' ||
    ((isVisualDevelopment() || visualPreview) && navigation.route !== 'login');

  async function startApprovedTest(
    mode: ApprovedTestMode,
    request: Record<string, string | number | boolean> = {},
  ): Promise<boolean> {
    if (!firmwareRuntime) return true;
    try {
      await firmwareRuntime.startTest({ mode, ...request });
      return true;
    } catch {
      return false;
    }
  }

  async function stopActiveTestIfNeeded(): Promise<void> {
    if (!firmwareRuntime) return;
    const activeTest = firmware.status?.activeTest;
    if (
      activeTest &&
      typeof activeTest === 'object' &&
      !Array.isArray(activeTest) &&
      activeTest.active === true
    ) {
      await firmwareRuntime.stopTest();
    }
  }

  async function activateLampPin(pin: number): Promise<boolean> {
    try {
      await stopActiveTestIfNeeded();
      return await startApprovedTest('lamp_iso12098', { lampPin: pin });
    } catch {
      return false;
    }
  }

  async function confirmAndStartTermination(
    mode: ApprovedTestMode,
  ): Promise<boolean> {
    if (!firmwareRuntime) return true;
    try {
      await firmwareRuntime.confirmTest({ type: 'de_energized', value: true });
      await firmwareRuntime.startTest({ mode, deEnergizedConfirmed: true });
      return true;
    } catch {
      return false;
    }
  }

  const body = (() => {
    switch (navigation.route) {
      case 'login':
        return <LoginScreen onContinue={() => setNavigation(continueFromLogin)} />;
      case 'vehicle-entry':
        return <VehicleEntryScreen onNewVehicle={() => setNavigation(openNewVehicleForm)} onOldRecord={() => setNavigation(openEntryOldRecordSearch)} />;
      case 'new-vehicle-form':
        return <NewVehicleRecordScreen onSave={async (request) => {
          if (firmwareRuntime) {
            try {
              await firmwareRuntime.createRecord(request);
            } catch {
              return;
            }
          }
          setNavigation(activateServiceRecord);
        }} />;
      case 'test-carousel':
        if (navigation.activeCardIndex === 2) {
          return <CableRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onOpenBranch={(branch) => setNavigation((state) => openCableBranch(state, branch))} />;
        }
        if (navigation.activeCardIndex === 3) {
          return <CanTerminationRootCard canSubSlide={navigation.canSubSlide} onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onMoveSub={(direction) => setNavigation((state) => moveCanSubSlide(state, direction))} onStart={() => setNavigation(openCanSafety)} />;
        }
        if (navigation.activeCardIndex === 4) {
          return <LampRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onStart={() => setNavigation(openLampMeasurement)} />;
        }
        if (navigation.activeCardIndex === 5) {
          return <ReportsRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onOpen={() => setNavigation(openReports)} />;
        }
        if (navigation.activeCardIndex === 6) {
          return <SettingsRootCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onOpen={() => setNavigation(openSettingsDetail)} />;
        }
        if (navigation.activeCardIndex === 7) {
          return <BatteryStatusCard onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} />;
        }
        return (
          <MainCarouselScreen
            activeCardIndex={navigation.activeCardIndex}
            onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))}
            onStart={() => {
              if (navigation.activeCardIndex === 0) {
                void startApprovedTest('iso7638_voltage').then((accepted) => {
                  if (accepted) setNavigation(openIso7638VoltageMeasurement);
                });
              }
              if (navigation.activeCardIndex === 1) {
                void startApprovedTest('iso12098_voltage').then((accepted) => {
                  if (accepted) setNavigation(openIso12098VoltageMeasurement);
                });
              }
            }}
          />
        );
      case 'iso7638-voltage-measurement':
        return <VoltageMeasurementScreen iso="7638" onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso12098-voltage-measurement':
        return <VoltageMeasurementScreen iso="12098" onConditionalPin={(pin) => setNavigation((state) => openIso12098PinValidation(state, pin))} onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso12098-pin10-validation':
      case 'iso12098-pin11-validation':
      case 'iso12098-pin12-validation': {
        const pin = navigation.route === 'iso12098-pin10-validation' ? 10 : navigation.route === 'iso12098-pin11-validation' ? 11 : 12;
        return (
          <>
            <VoltageMeasurementScreen iso="12098" onConditionalPin={() => undefined} onSave={() => undefined} />
            <ConditionalValidationModal pin={pin} onUnavailable={() => setNavigation(completeIso12098PinValidation)} onConfirm={() => setNavigation(completeIso12098PinValidation)} />
          </>
        );
      }
      case 'iso7638-cable-select':
        return <CableSelectionScreen iso="7638" onStart={(enabledPinMask) => {
          void startApprovedTest('cable_iso7638', { enabledPinMask }).then((accepted) => {
            if (accepted) setNavigation(startCableMeasurement);
          });
        }} />;
      case 'iso12098-cable-select':
        return <CableSelectionScreen iso="12098" onStart={(enabledPinMask) => {
          void startApprovedTest('cable_iso12098', { enabledPinMask }).then((accepted) => {
            if (accepted) setNavigation(startCableMeasurement);
          });
        }} />;
      case 'iso7638-cable-measurement':
        return <CableMeasurementScreen iso="7638" onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso12098-cable-measurement':
        return <CableMeasurementScreen iso="12098" onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'iso7638-can-tractor-safety':
      case 'iso12098-can-tractor-safety':
      case 'iso7638-can-trailer-safety':
      case 'iso12098-can-trailer-safety': {
        const info = canRouteInfo(navigation.route)!;
        const mode = ('can_termination_iso' + info.iso + '_' + info.side) as ApprovedTestMode;
        return <TerminationSafetyScreen {...info} onContinue={() => {
          void confirmAndStartTermination(mode).then((accepted) => {
            if (accepted) setNavigation(confirmCanSafety);
          });
        }} />;
      }
      case 'iso7638-can-tractor-resistance':
      case 'iso12098-can-tractor-resistance':
      case 'iso7638-can-trailer-resistance':
      case 'iso12098-can-trailer-resistance': {
        const info = canRouteInfo(navigation.route)!;
        return <TerminationResultScreen iso={info.iso} side={info.side} onSave={() => setNavigation(openCommonSaveOverlay)} />;
      }
      case 'lamp-test-measurement':
        return <LampMeasurementScreen onActivate={activateLampPin} onAxleLift={() => setNavigation(openAxleLiftSafety)} onSave={() => setNavigation(openCommonSaveOverlay)} />;
      case 'axle-lift-safety':
        return (
          <>
            <LampMeasurementScreen onActivate={activateLampPin} onAxleLift={() => undefined} onSave={() => undefined} />
            <AxleLiftSafetyScreen onCancel={() => setNavigation(completeAxleLiftSafety)} onConfirm={() => {
              if (!firmwareRuntime) {
                setNavigation(completeAxleLiftSafety);
                return;
              }
              void (async () => {
                try {
                  await stopActiveTestIfNeeded();
                  await firmwareRuntime.confirmTest({ type: 'axle_safety', value: true });
                  await firmwareRuntime.startTest({ mode: 'axle_lift', axleSafetyConfirmed: true });
                  setNavigation(completeAxleLiftSafety);
                } catch {
                  // Firmware remains authoritative; stay on the safety screen if rejected.
                }
              })();
            }} />
          </>
        );
      case 'report-result':
        return <ReportResultScreen onRetest={() => setNavigation(retestFromReport)} onSaveReport={() => setNavigation(openReportSave)} />;
      case 'settings-detail':
        return <SettingsDetailScreen onSave={async (request) => {
          if (firmwareRuntime) {
            try {
              await firmwareRuntime.updateSettings(request);
            } catch {
              return;
            }
          }
          setNavigation(goHome);
        }} />;
      default:
        return <MainCarouselScreen activeCardIndex={navigation.activeCardIndex} onMove={(direction) => setNavigation((state) => moveMainCard(state, direction))} onStart={() => undefined} />;
    }
  })();

  return (
    <AppShell
      onBack={() => setNavigation(goBack)}
      onHome={() => setNavigation(goHome)}
      onSettings={() => setNavigation(goSettings)}
      showBottomNavigation
      showTopBrandBar={navigation.route !== 'login'}
      wifiConnected={wifiConnected}
    >
      {body}
      {navigation.overlay?.kind === 'old-record-search' ? (
        <RecordSearchModal
          context={navigation.overlay.origin === 'reports' ? 'reports' : 'entry'}
          onClose={() => setNavigation(closeOverlay)}
          searchRecords={firmwareRuntime ? (query) => firmwareRuntime.searchRecords(query) : undefined}
          onInspect={navigation.overlay.origin === 'reports'
            ? async (recordId) => {
                if (firmwareRuntime) {
                  const report = await firmwareRuntime.refreshReport(recordId);
                  if (!report) return;
                }
                setNavigation(openReportFromOldRecordSearch);
              }
            : undefined}
          onRetest={!firmwareRuntime ? () => setNavigation(activateServiceRecord) : undefined}
        />
      ) : null}
      {navigation.overlay?.kind === 'report-save' ? (
        <ReportSaveModal
          onCancel={() => setNavigation(closeOverlay)}
          onSave={async (request) => {
            if (firmwareRuntime) {
              try {
                await firmwareRuntime.updateReport(request);
              } catch {
                return;
              }
            }
            setNavigation(closeOverlay);
          }}
        />
      ) : null}
      {navigation.overlay?.kind === 'report-save-common' ? (
        <CommonSaveModal
          onReturn={() => setNavigation(closeOverlay)}
          onExitWithoutSave={() => setNavigation(goHome)}
          onSaveAndExit={async (technicianNote) => {
            if (firmwareRuntime) {
              try {
                await firmwareRuntime.saveCurrentResult({ technicianNote });
              } catch {
                return;
              }
            }
            setNavigation(goHome);
          }}
        />
      ) : null}
    </AppShell>
  );
}

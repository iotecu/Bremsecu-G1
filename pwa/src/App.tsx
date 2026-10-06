import React, { useRef, useState } from 'react';
import { AppShell } from './components';
import {
  activateServiceRecord, beginIso12098Voltage, beginIso7638Voltage, closeOverlay, completeAxleLiftSafety,
  completeCableExit, completeCanExit, completeIso12098Exit, completeIso12098PinValidation, completeIso7638Exit,
  completeLampExit, confirmCanSafety, goBack, goHome,
  initialNavigationState,
  openAxleLiftSafety, openBatteryStatus, openCableBranch, openCableMenu, openCanMenu, openCanSafetyChoice,
  openDashboardLamp, openDashboardReports, openDashboardSettings,
  openEntryOldRecordSearch, openIso12098PinValidation, openIso12098Preflight, openIso7638Preflight,
  openNewVehicleForm, openReportFromOldRecordSearch, openVehicleEntry, openReportSave, requestCableExit, requestCanExit,
  requestIso12098Exit, requestIso7638Exit, requestLampExit, retestFromReport,
  startCableMeasurement,
} from './navigation';
import {
  ConditionalValidationModal, Iso12098VoltageScreen, Iso7638VoltageScreen, NewVehicleRecordScreen,
  RecordSearchModal, VehicleEntryScreen, VoltageExitModal, VoltagePreflightModal,
} from './screens/phase5/group-a';
import {
  CableExitModal, CableMeasurementScreen, CableSelectionScreen, CanExitModal,
  TerminationResultScreen, TerminationSafetyScreen,
} from './screens/phase5/group-b';
import {
  AxleLiftSafetyScreen, CommonSaveModal, LampExitModal, LampMeasurementScreen,
  ReportResultScreen, ReportSaveModal,
} from './screens/phase5/group-c';
import {
  BatteryStatusScreen, SettingsDetailScreen,
} from './screens/phase5/group-d';
import { CableMenuScreen, CanMenuScreen, MainDashboardScreen } from './screens/phase5/dashboard-grid';
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
  if (screen === 5) return { ...base, route: 'dashboard' };
  if (screen === 6) return { ...base, route: 'iso7638-voltage-measurement' };
  if (screen === 7) return { ...base, route: 'dashboard' };
  if (screen === 8) return { ...base, route: 'iso12098-voltage-measurement' };
  if (screen === 9) return { ...base, route: 'iso12098-pin10-validation' };
  if (screen === 10) return { ...base, route: 'iso12098-pin11-validation' };
  if (screen === 11) return { ...base, route: 'iso12098-pin12-validation' };
  if (screen === 12) return { ...base, route: 'cable-menu' };
  if (screen === 13) return { ...base, route: 'iso7638-cable-select' };
  if (screen === 14) return { ...base, route: 'iso7638-cable-measurement' };
  if (screen === 15) return { ...base, route: 'iso12098-cable-select' };
  if (screen === 16) return { ...base, route: 'iso12098-cable-measurement' };
  if (screen >= 17 && screen <= 21) {
    return { ...base, route: 'can-menu' };
  }
  const canRoutes: Partial<Record<number, NavigationState['route']>> = {
    22:'iso7638-can-tractor-safety',23:'iso7638-can-tractor-resistance',
    24:'iso7638-can-trailer-safety',25:'iso7638-can-trailer-resistance',
    26:'iso12098-can-tractor-safety',27:'iso12098-can-tractor-resistance',
    28:'iso12098-can-trailer-safety',29:'iso12098-can-trailer-resistance',
  };
  if (canRoutes[screen]) return { ...base, route: canRoutes[screen]! };
  if (screen === 30) return { ...base, route: 'dashboard' };
  if (screen === 31) return { ...base, route: 'lamp-test-measurement' };
  if (screen === 32) return { ...base, route: 'axle-lift-safety' };
  if (screen === 33) return { ...base, route: 'dashboard' };
  if (screen === 34) return { ...base, route: 'report-result' };
  if (screen === 35) return {
    ...base,
    route: 'report-result',
    overlay: { kind: 'report-save', returnTo: 'report-result' },
  };
  if (screen === 36) return {
    ...base,
    route: 'lamp-test-measurement',
    overlay: { kind: 'report-save-common', returnTo: 'lamp-test-measurement' },
  };
  if (screen === 37) return { ...base, route: 'dashboard' };
  if (screen === 38) return { ...base, route: 'settings-detail' };
  if (screen === 39) return { ...base, route: 'battery-status' };
  if (screen === 40) return {
    ...base,
    route: 'dashboard',
    hasActiveServiceRecord: false,
    overlay: { kind: 'old-record-search', origin: 'reports' },
  };
  return initialNavigationState;
}

export default function App() {
  const [navigation, setNavigation] = useState<NavigationState>(visualNavigationState);
  const [iso12098FocusedPin, setIso12098FocusedPin] = useState<number | null>(null);
  const [iso12098OkPinMask, setIso12098OkPinMask] = useState(0);
  const [cable7638PinMask, setCable7638PinMask] = useState(0);
  const [cable12098PinMask, setCable12098PinMask] = useState(0);
  const [lampActiveChannel, setLampActiveChannel] = useState<number | 'axle' | null>(null);
  const [axleSafetyApproved, setAxleSafetyApproved] = useState(false);
  const cableToggleGeneration = useRef(0);
  const lampToggleGeneration = useRef(0);
  const firmwareRuntime = useFirmwareRuntime();
  const firmware = useFirmwareSnapshot();
  const wifiConnected =
    firmware.connection === 'open' ||
    isVisualDevelopment();

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

  async function toggleLampPin(pin: number): Promise<void> {
    const nextChannel = lampActiveChannel === pin ? null : pin;
    const generation = ++lampToggleGeneration.current;
    setLampActiveChannel(nextChannel);

    if (!firmwareRuntime) return;

    try {
      await firmwareRuntime.stopTest();
    } catch {
      // Stopping an already-idle test may be rejected; continue with the requested UI state.
    }

    if (generation !== lampToggleGeneration.current || nextChannel === null) return;

    try {
      await firmwareRuntime.startTest({ mode: 'lamp_iso12098', lampPin: pin });
    } catch {
      // UI remains operator-controlled; firmware telemetry is authoritative for the measured current.
    }
  }

  async function startApprovedAxleLift(): Promise<void> {
    const generation = ++lampToggleGeneration.current;
    setLampActiveChannel('axle');

    if (!firmwareRuntime) return;

    try {
      await firmwareRuntime.stopTest();
    } catch {
      // Best-effort stop before switching outputs.
    }

    if (generation !== lampToggleGeneration.current) return;

    try {
      await firmwareRuntime.confirmTest({ type: 'axle_safety', value: true });
      if (generation !== lampToggleGeneration.current) return;
      await firmwareRuntime.startTest({ mode: 'axle_lift', axleSafetyConfirmed: true });
    } catch {
      // The operator already approved this lamp-test session; keep the toggle state stable.
    }
  }

  async function toggleAxleLift(): Promise<void> {
    if (lampActiveChannel === 'axle') {
      const generation = ++lampToggleGeneration.current;
      setLampActiveChannel(null);
      if (!firmwareRuntime) return;

      try {
        await firmwareRuntime.stopTest();
      } catch {
        // Keep the requested OFF state even when the runtime is already idle.
      }
      return;
    }

    if (!axleSafetyApproved) {
      setNavigation(openAxleLiftSafety);
      return;
    }

    await startApprovedAxleLift();
  }


  function cableMaskFor(iso: '7638' | '12098'): number {
    return iso === '7638' ? cable7638PinMask : cable12098PinMask;
  }

  function setCableMask(iso: '7638' | '12098', mask: number): void {
    if (iso === '7638') setCable7638PinMask(mask);
    else setCable12098PinMask(mask);
  }

  async function toggleCablePin(iso: '7638' | '12098', pin: number): Promise<void> {
    const currentMask = cableMaskFor(iso);
    const nextMask = currentMask ^ (1 << (pin - 1));
    const generation = ++cableToggleGeneration.current;
    setCableMask(iso, nextMask);

    if (!firmwareRuntime) return;

    try {
      await firmwareRuntime.stopTest();
      if (generation !== cableToggleGeneration.current) return;
      if (nextMask !== 0) {
        await firmwareRuntime.startTest({
          mode: iso === '7638' ? 'cable_iso7638' : 'cable_iso12098',
          enabledPinMask: nextMask,
        });
      }
    } catch {
      // Keep the operator selection visible. Firmware telemetry remains authoritative for results.
    }
  }

  async function requestCableExitWithRuntime(
    iso: '7638' | '12098',
    destination: 'back' | 'home',
  ): Promise<void> {
    ++cableToggleGeneration.current;
    if (!navigation.hasActiveServiceRecord) {
      try {
        await stopActiveTestIfNeeded();
      } catch {
        return;
      }
      setCableMask(iso, 0);
    }
    setNavigation((state) => requestCableExit(state, destination));
  }

  async function discardCableAndExit(iso: '7638' | '12098'): Promise<void> {
    try {
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    ++cableToggleGeneration.current;
    setCableMask(iso, 0);
    setNavigation(completeCableExit);
  }

  async function saveCableAndExit(iso: '7638' | '12098'): Promise<void> {
    try {
      if (firmwareRuntime) {
        await firmwareRuntime.saveCurrentResult({ technicianNote: '' });
      }
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    ++cableToggleGeneration.current;
    setCableMask(iso, 0);
    setNavigation(completeCableExit);
  }


  async function requestCanExitWithRuntime(
    destination: 'back' | 'home',
  ): Promise<void> {
    if (!navigation.hasActiveServiceRecord) {
      try {
        await stopActiveTestIfNeeded();
      } catch {
        return;
      }
    }
    setNavigation((state) => requestCanExit(state, destination));
  }

  async function discardCanAndExit(): Promise<void> {
    try {
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    setNavigation(completeCanExit);
  }

  async function saveCanAndExit(): Promise<void> {
    try {
      if (firmwareRuntime) {
        await firmwareRuntime.saveCurrentResult({ technicianNote: '' });
      }
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    setNavigation(completeCanExit);
  }


  async function requestLampExitWithRuntime(): Promise<void> {
    if (!navigation.hasActiveServiceRecord) {
      ++lampToggleGeneration.current;
      setLampActiveChannel(null);
      setAxleSafetyApproved(false);
      if (firmwareRuntime) {
        try {
          await firmwareRuntime.stopTest();
        } catch {
          // Leaving the UI must not be blocked by an already-idle/unreachable runtime.
        }
      }
    }
    setNavigation(requestLampExit);
  }

  async function discardLampAndExit(): Promise<void> {
    ++lampToggleGeneration.current;
    setLampActiveChannel(null);
    setAxleSafetyApproved(false);
    if (firmwareRuntime) {
      try {
        await firmwareRuntime.stopTest();
      } catch {
        // Discard exit still completes even if the runtime is already idle.
      }
    }
    setNavigation(completeLampExit);
  }

  async function saveLampAndExit(): Promise<void> {
    ++lampToggleGeneration.current;
    try {
      if (firmwareRuntime) {
        await firmwareRuntime.saveCurrentResult({ technicianNote: '' });
        await firmwareRuntime.stopTest();
      }
    } catch {
      return;
    }
    setLampActiveChannel(null);
    setAxleSafetyApproved(false);
    setNavigation(completeLampExit);
  }


  async function requestIso7638ExitWithRuntime(): Promise<void> {
    if (!navigation.hasActiveServiceRecord) {
      try {
        await stopActiveTestIfNeeded();
      } catch {
        return;
      }
    }
    setNavigation(requestIso7638Exit);
  }

  async function discardIso7638AndExit(): Promise<void> {
    try {
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    setNavigation(completeIso7638Exit);
  }

  async function saveIso7638AndExit(): Promise<void> {
    try {
      if (firmwareRuntime) {
        await firmwareRuntime.saveCurrentResult({ technicianNote: '' });
      }
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    setNavigation(completeIso7638Exit);
  }


  async function requestIso12098ExitWithRuntime(): Promise<void> {
    if (!navigation.hasActiveServiceRecord) {
      try {
        await stopActiveTestIfNeeded();
      } catch {
        return;
      }
      setIso12098FocusedPin(null);
      setIso12098OkPinMask(0);
    }
    setNavigation(requestIso12098Exit);
  }

  async function discardIso12098AndExit(): Promise<void> {
    try {
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    setIso12098FocusedPin(null);
    setIso12098OkPinMask(0);
    setNavigation(completeIso12098Exit);
  }

  async function saveIso12098AndExit(): Promise<void> {
    try {
      if (firmwareRuntime) {
        await firmwareRuntime.saveCurrentResult({ technicianNote: '' });
      }
      await stopActiveTestIfNeeded();
    } catch {
      return;
    }
    setIso12098FocusedPin(null);
    setIso12098OkPinMask(0);
    setNavigation(completeIso12098Exit);
  }

  const body = (() => {
    switch (navigation.route) {
      case 'vehicle-entry':
        return <VehicleEntryScreen onNewVehicle={() => setNavigation(openNewVehicleForm)} onOldRecord={() => setNavigation(openEntryOldRecordSearch)} />;
      case 'new-vehicle-form':
        return <NewVehicleRecordScreen onSave={async (request) => {
          if (firmwareRuntime) {
            await firmwareRuntime.createRecord(request);
          }
          setNavigation(activateServiceRecord);
        }} />;
      case 'dashboard':
        return (
          <MainDashboardScreen
            onIso7638={() => setNavigation(openIso7638Preflight)}
            onIso12098={() => setNavigation(openIso12098Preflight)}
            onCable={() => setNavigation(openCableMenu)}
            onCan={() => setNavigation(openCanMenu)}
            onLamp={() => {
              ++lampToggleGeneration.current;
              setLampActiveChannel(null);
              setAxleSafetyApproved(false);
              setNavigation(openDashboardLamp);
            }}
            onReports={() => setNavigation(openDashboardReports)}
            onSettings={() => setNavigation(openDashboardSettings)}
            onBattery={() => setNavigation(openBatteryStatus)}
          />
        );
      case 'cable-menu':
        return <CableMenuScreen onSelect={(iso) => setNavigation((state) => openCableBranch(state, iso))} />;
      case 'can-menu':
        return <CanMenuScreen onSelect={(choice) => setNavigation((state) => openCanSafetyChoice(state, choice.subSlide))} />;
      case 'battery-status':
        return <BatteryStatusScreen />;
      case 'iso7638-voltage-measurement':
        return (
          <Iso7638VoltageScreen
            onBack={() => { void requestIso7638ExitWithRuntime(); }}
            onHome={() => { void requestIso7638ExitWithRuntime(); }}
          />
        );
      case 'iso12098-voltage-measurement':
        return (
          <Iso12098VoltageScreen
            focusedPin={iso12098FocusedPin}
            okPinMask={iso12098OkPinMask}
            onBack={() => { void requestIso12098ExitWithRuntime(); }}
            onHome={() => { void requestIso12098ExitWithRuntime(); }}
            onConditionalPin={(pin) => setNavigation((state) => openIso12098PinValidation(state, pin))}
            onToggleOk={(pin) => setIso12098OkPinMask((mask) => mask ^ (1 << (pin - 1)))}
            onTogglePin={(pin) => setIso12098FocusedPin((current) => current === pin ? null : pin)}
          />
        );
      case 'iso12098-pin10-validation':
      case 'iso12098-pin11-validation':
      case 'iso12098-pin12-validation': {
        const pin = navigation.route === 'iso12098-pin10-validation' ? 10 : navigation.route === 'iso12098-pin11-validation' ? 11 : 12;
        return (
          <>
            <Iso12098VoltageScreen
              focusedPin={iso12098FocusedPin}
              okPinMask={iso12098OkPinMask}
              onBack={() => undefined}
              onHome={() => undefined}
              onConditionalPin={() => undefined}
              onToggleOk={() => undefined}
              onTogglePin={() => undefined}
            />
            <ConditionalValidationModal
              pin={pin}
              onUnavailable={() => setNavigation(completeIso12098PinValidation)}
              onConfirm={() => {
                setIso12098FocusedPin(pin);
                setNavigation(completeIso12098PinValidation);
              }}
            />
          </>
        );
      }
      case 'iso7638-cable-select':
        return (
          <CableSelectionScreen
            iso="7638"
            onStart={() => {
              setCable7638PinMask(0);
              setNavigation(startCableMeasurement);
            }}
          />
        );
      case 'iso12098-cable-select':
        return (
          <CableSelectionScreen
            iso="12098"
            onStart={() => {
              setCable12098PinMask(0);
              setNavigation(startCableMeasurement);
            }}
          />
        );
      case 'iso7638-cable-measurement':
        return (
          <CableMeasurementScreen
            iso="7638"
            enabledPinMask={cable7638PinMask}
            onBack={() => { void requestCableExitWithRuntime('7638', 'back'); }}
            onHome={() => { void requestCableExitWithRuntime('7638', 'home'); }}
            onTogglePin={(pin) => { void toggleCablePin('7638', pin); }}
          />
        );
      case 'iso12098-cable-measurement':
        return (
          <CableMeasurementScreen
            iso="12098"
            enabledPinMask={cable12098PinMask}
            onBack={() => { void requestCableExitWithRuntime('12098', 'back'); }}
            onHome={() => { void requestCableExitWithRuntime('12098', 'home'); }}
            onTogglePin={(pin) => { void toggleCablePin('12098', pin); }}
          />
        );
      case 'iso7638-can-tractor-safety':
      case 'iso12098-can-tractor-safety':
      case 'iso7638-can-trailer-safety':
      case 'iso12098-can-trailer-safety': {
        const info = canRouteInfo(navigation.route)!;
        const mode = ('can_termination_iso' + info.iso + '_' + info.side) as ApprovedTestMode;
        return (
          <TerminationSafetyScreen
            {...info}
            onCancel={() => setNavigation(goBack)}
            onContinue={() => {
              setNavigation(confirmCanSafety);
              void (async () => {
                try {
                  await stopActiveTestIfNeeded();
                  if (!firmwareRuntime) return;
                  await firmwareRuntime.confirmTest({ type: 'de_energized', value: true });
                  await firmwareRuntime.startTest({ mode, deEnergizedConfirmed: true });
                } catch {
                  // Measurement screen stays available; firmware telemetry remains authoritative.
                }
              })();
            }}
          />
        );
      }
      case 'iso7638-can-tractor-resistance':
      case 'iso12098-can-tractor-resistance':
      case 'iso7638-can-trailer-resistance':
      case 'iso12098-can-trailer-resistance': {
        const info = canRouteInfo(navigation.route)!;
        return (
          <TerminationResultScreen
            {...info}
            onBack={() => { void requestCanExitWithRuntime('back'); }}
            onHome={() => { void requestCanExitWithRuntime('home'); }}
          />
        );
      }
      case 'lamp-test-measurement':
        return (
          <LampMeasurementScreen
            activeChannel={lampActiveChannel}
            onBack={() => { void requestLampExitWithRuntime(); }}
            onHome={() => { void requestLampExitWithRuntime(); }}
            onToggleLamp={(pin) => { void toggleLampPin(pin); }}
            onToggleAxle={() => { void toggleAxleLift(); }}
          />
        );
      case 'axle-lift-safety':
        return (
          <>
            <LampMeasurementScreen
              activeChannel={lampActiveChannel}
              onBack={() => undefined}
              onHome={() => undefined}
              onToggleLamp={() => undefined}
              onToggleAxle={() => undefined}
            />
            <AxleLiftSafetyScreen
              onCancel={() => setNavigation(completeAxleLiftSafety)}
              onConfirm={() => {
                setAxleSafetyApproved(true);
                setNavigation(completeAxleLiftSafety);
                void startApprovedAxleLift();
              }}
            />
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
        return null;
    }
  })();

  const activeNavigation =
    navigation.route === 'vehicle-entry' || navigation.route === 'new-vehicle-form'
      ? 'vehicle'
      : navigation.route === 'settings-detail'
        ? 'settings'
        : 'home';

  const cableExitIso =
    navigation.overlay?.kind === 'cable-exit'
      ? navigation.overlay.iso
      : null;

  const canExit =
    navigation.overlay?.kind === 'can-exit'
      ? navigation.overlay
      : null;

  return (
    <AppShell
      activeNavigation={activeNavigation}
      onBack={() => setNavigation(goBack)}
      onHome={() => setNavigation(goHome)}
      onSettings={() => setNavigation(openDashboardSettings)}
      onVehicle={() => setNavigation(openVehicleEntry)}
      showBottomNavigation={
        navigation.route !== 'iso7638-voltage-measurement' &&
        navigation.route !== 'iso12098-voltage-measurement' &&
        navigation.route !== 'iso12098-pin10-validation' &&
        navigation.route !== 'iso12098-pin11-validation' &&
        navigation.route !== 'iso12098-pin12-validation' &&
        navigation.route !== 'iso7638-cable-measurement' &&
        navigation.route !== 'iso12098-cable-measurement' &&
        !navigation.route.includes('-can-') &&
        navigation.route !== 'lamp-test-measurement' &&
        navigation.route !== 'axle-lift-safety' &&
        navigation.overlay?.kind !== 'voltage-preflight'
      }
      showTopBrandBar
      wifiConnected={wifiConnected}
    >
      {body}
      {navigation.overlay?.kind === 'voltage-preflight' ? (
        <VoltagePreflightModal
          iso={navigation.overlay.iso}
          onCancel={() => setNavigation(closeOverlay)}
          onConfirm={() => {
            const iso = navigation.overlay?.kind === 'voltage-preflight'
              ? navigation.overlay.iso
              : '7638';
            if (iso === '12098') {
              setIso12098FocusedPin(null);
              setIso12098OkPinMask(0);
            }
            setNavigation(iso === '7638' ? beginIso7638Voltage : beginIso12098Voltage);
            void (async () => {
              try {
                await stopActiveTestIfNeeded();
                await startApprovedTest(iso === '7638' ? 'iso7638_voltage' : 'iso12098_voltage');
              } catch {
                // The measurement screen remains available; firmware data stays authoritative.
              }
            })();
          }}
        />
      ) : null}
      {navigation.overlay?.kind === 'voltage-exit' ? (
        <VoltageExitModal
          iso={navigation.overlay.iso}
          onCancel={() => setNavigation(closeOverlay)}
          onDiscard={() => {
            void (navigation.overlay?.kind === 'voltage-exit' && navigation.overlay.iso === '12098'
              ? discardIso12098AndExit()
              : discardIso7638AndExit());
          }}
          onSave={() =>
            navigation.overlay?.kind === 'voltage-exit' && navigation.overlay.iso === '12098'
              ? saveIso12098AndExit()
              : saveIso7638AndExit()
          }
        />
      ) : null}
      {cableExitIso ? (
        <CableExitModal
          iso={cableExitIso}
          onCancel={() => setNavigation(closeOverlay)}
          onDiscard={() => { void discardCableAndExit(cableExitIso); }}
          onSave={() => saveCableAndExit(cableExitIso)}
        />
      ) : null}
      {canExit ? (
        <CanExitModal
          iso={canExit.iso}
          side={canExit.side}
          onCancel={() => setNavigation(closeOverlay)}
          onDiscard={() => { void discardCanAndExit(); }}
          onSave={() => saveCanAndExit()}
        />
      ) : null}
      {navigation.overlay?.kind === 'lamp-exit' ? (
        <LampExitModal
          onCancel={() => setNavigation(closeOverlay)}
          onDiscard={() => { void discardLampAndExit(); }}
          onSave={() => saveLampAndExit()}
        />
      ) : null}
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

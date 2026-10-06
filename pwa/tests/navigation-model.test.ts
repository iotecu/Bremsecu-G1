import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activateServiceRecord,
  beginIso12098Voltage,
  beginIso7638Voltage,
  closeOverlay,
  completeAxleLiftSafety,
  completeCableExit,
  completeCanExit,
  completeIso12098Exit,
  completeIso12098PinValidation,
  completeIso7638Exit,
  confirmCanSafety,
  goBack,
  goHome,
  initialNavigationState,
  openAxleLiftSafety,
  openBatteryStatus,
  openCableBranch,
  openCableMenu,
  openCanMenu,
  openCanSafetyChoice,
  openCommonSaveOverlay,
  openDashboardLamp,
  openDashboardReports,
  openDashboardSettings,
  openDashboardVoltage,
  openEntryOldRecordSearch,
  openIso12098PinValidation,
  openIso12098Preflight,
  openIso7638Preflight,
  openNewVehicleForm,
  openVehicleEntry,
  requestCableExit,
  requestCanExit,
  requestIso12098Exit,
  requestIso7638Exit,
  startCableMeasurement,
} from '../src/navigation/model';

test('dashboard is the app root and vehicle registration is optional', () => {
  assert.equal(initialNavigationState.route, 'dashboard');
  assert.equal(initialNavigationState.hasActiveServiceRecord, false);

  const vehicleEntry = openVehicleEntry(initialNavigationState);
  assert.equal(vehicleEntry.route, 'vehicle-entry');

  const newVehicle = openNewVehicleForm(vehicleEntry);
  assert.equal(newVehicle.route, 'new-vehicle-form');

  const active = activateServiceRecord(newVehicle);
  assert.equal(active.route, 'dashboard');
  assert.equal(active.hasActiveServiceRecord, true);
});

test('ISO 7638 requires preflight and only asks about report saving when a service record is active', () => {
  const preflight = openIso7638Preflight(initialNavigationState);
  assert.deepEqual(preflight.overlay, { kind: 'voltage-preflight', iso: '7638' });

  const measurement = beginIso7638Voltage(preflight);
  assert.equal(measurement.route, 'iso7638-voltage-measurement');
  assert.equal(measurement.overlay, null);

  const quickExit = requestIso7638Exit(measurement);
  assert.equal(quickExit.route, 'dashboard');
  assert.equal(quickExit.overlay, null);

  const recordedMeasurement = {
    ...measurement,
    hasActiveServiceRecord: true,
  };
  const guardedExit = requestIso7638Exit(recordedMeasurement);
  assert.deepEqual(guardedExit.overlay, { kind: 'voltage-exit', iso: '7638' });
  assert.equal(guardedExit.route, 'iso7638-voltage-measurement');
  assert.equal(goHome(recordedMeasurement).overlay?.kind, 'voltage-exit');
  assert.equal(goBack(recordedMeasurement).overlay?.kind, 'voltage-exit');
  assert.equal(completeIso7638Exit(guardedExit).route, 'dashboard');
});

test('ISO 12098 requires socket preflight and uses the same report-aware exit guard', () => {
  const preflight = openIso12098Preflight(initialNavigationState);
  assert.deepEqual(preflight.overlay, { kind: 'voltage-preflight', iso: '12098' });

  const measurement = beginIso12098Voltage(preflight);
  assert.equal(measurement.route, 'iso12098-voltage-measurement');
  assert.equal(measurement.overlay, null);

  const quickExit = requestIso12098Exit(measurement);
  assert.equal(quickExit.route, 'dashboard');

  const recordedMeasurement = { ...measurement, hasActiveServiceRecord: true };
  const guardedExit = requestIso12098Exit(recordedMeasurement);
  assert.deepEqual(guardedExit.overlay, { kind: 'voltage-exit', iso: '12098' });
  assert.equal(goHome(recordedMeasurement).overlay?.kind, 'voltage-exit');
  assert.equal(goBack(recordedMeasurement).overlay?.kind, 'voltage-exit');
  assert.equal(completeIso12098Exit(guardedExit).route, 'dashboard');
});

test('dashboard grid routes modules through explicit responsive submenus', () => {
  const dashboard = {
    ...initialNavigationState,
    hasActiveServiceRecord: true,
  };

  assert.equal(openDashboardVoltage(dashboard, '7638').overlay?.kind, 'voltage-preflight');
  assert.equal(openDashboardVoltage(dashboard, '12098').overlay?.kind, 'voltage-preflight');
  assert.equal(openDashboardLamp(dashboard).route, 'lamp-test-measurement');
  assert.equal(openDashboardReports(dashboard).route, 'report-result');
  assert.equal(openDashboardSettings(dashboard).route, 'settings-detail');
  assert.equal(openBatteryStatus(dashboard).route, 'battery-status');

  const cableMenu = openCableMenu(dashboard);
  assert.equal(cableMenu.route, 'cable-menu');
  assert.equal(openCableBranch(cableMenu, '7638').route, 'iso7638-cable-select');
  assert.equal(openCableBranch(cableMenu, '12098').route, 'iso12098-cable-select');

  const canMenu = openCanMenu(dashboard);
  assert.equal(canMenu.route, 'can-menu');
  assert.equal(openCanSafetyChoice(canMenu, 3).route, 'iso12098-can-trailer-safety');
});

test('cable Back returns to its ISO selection screen while Home returns to dashboard', () => {
  const cable7638 = startCableMeasurement(openCableBranch(openCableMenu(initialNavigationState), '7638'));
  assert.equal(cable7638.route, 'iso7638-cable-measurement');

  const quickBack = requestCableExit(cable7638, 'back');
  assert.equal(quickBack.route, 'iso7638-cable-select');
  assert.equal(quickBack.overlay, null);

  const quickHome = requestCableExit(cable7638, 'home');
  assert.equal(quickHome.route, 'dashboard');
  assert.equal(quickHome.overlay, null);

  const recordedCable = { ...cable7638, hasActiveServiceRecord: true };
  const guardedBack = requestCableExit(recordedCable, 'back');
  assert.deepEqual(guardedBack.overlay, {
    kind: 'cable-exit',
    iso: '7638',
    returnTo: 'iso7638-cable-select',
  });
  assert.deepEqual(goBack(recordedCable).overlay, guardedBack.overlay);
  assert.equal(completeCableExit(guardedBack).route, 'iso7638-cable-select');

  const guardedHome = goHome(recordedCable);
  assert.deepEqual(guardedHome.overlay, {
    kind: 'cable-exit',
    iso: '7638',
    returnTo: 'dashboard',
  });
  assert.equal(completeCableExit(guardedHome).route, 'dashboard');
});

test('CAN Back returns to CAN menu while Home returns to dashboard', () => {
  const canMenu = openCanMenu(initialNavigationState);
  const safety = openCanSafetyChoice(canMenu, 2);
  assert.equal(safety.route, 'iso7638-can-trailer-safety');
  assert.equal(goBack(safety).route, 'can-menu');

  const resistance = confirmCanSafety(safety);
  assert.equal(resistance.route, 'iso7638-can-trailer-resistance');

  const quickBack = requestCanExit(resistance, 'back');
  assert.equal(quickBack.route, 'can-menu');
  assert.equal(quickBack.overlay, null);

  const quickHome = requestCanExit(resistance, 'home');
  assert.equal(quickHome.route, 'dashboard');
  assert.equal(quickHome.overlay, null);

  const recorded = { ...resistance, hasActiveServiceRecord: true };
  const guardedBack = requestCanExit(recorded, 'back');
  assert.deepEqual(guardedBack.overlay, {
    kind: 'can-exit',
    iso: '7638',
    side: 'trailer',
    returnTo: 'can-menu',
  });
  assert.deepEqual(goBack(recorded).overlay, guardedBack.overlay);
  assert.equal(completeCanExit(guardedBack).route, 'can-menu');

  const guardedHome = goHome(recorded);
  assert.deepEqual(guardedHome.overlay, {
    kind: 'can-exit',
    iso: '7638',
    side: 'trailer',
    returnTo: 'dashboard',
  });
  assert.equal(completeCanExit(guardedHome).route, 'dashboard');
});

test('conditional pin and axle-lift flows return to their parent screens', () => {
  const preflight = openIso12098Preflight(initialNavigationState);
  const voltage = beginIso12098Voltage(preflight);
  const pin11 = openIso12098PinValidation(voltage, 11);
  assert.equal(pin11.route, 'iso12098-pin11-validation');
  assert.equal(completeIso12098PinValidation(pin11).route, 'iso12098-voltage-measurement');

  const lamp = openDashboardLamp(initialNavigationState);
  const safety = openAxleLiftSafety(lamp);
  assert.equal(safety.route, 'axle-lift-safety');
  assert.equal(completeAxleLiftSafety(safety).route, 'lamp-test-measurement');
});

test('old-record search remains an overlay with its origin context', () => {
  const vehicleEntry = openVehicleEntry(initialNavigationState);
  const entrySearch = openEntryOldRecordSearch(vehicleEntry);
  assert.deepEqual(entrySearch.overlay, {
    kind: 'old-record-search',
    origin: 'vehicle-entry',
  });
  assert.equal(closeOverlay(entrySearch).route, 'vehicle-entry');

  const reportSearch = openDashboardReports(initialNavigationState);
  assert.deepEqual(reportSearch.overlay, {
    kind: 'old-record-search',
    origin: 'reports',
  });
  assert.equal(reportSearch.route, 'dashboard');
});

test('shared save and bottom navigation semantics use dashboard as the root', () => {
  const measurement = beginIso12098Voltage(openIso12098Preflight(initialNavigationState));
  const withOverlay = openCommonSaveOverlay(measurement);
  assert.deepEqual(withOverlay.overlay, {
    kind: 'report-save-common',
    returnTo: 'iso12098-voltage-measurement',
  });
  assert.equal(closeOverlay(withOverlay).route, 'iso12098-voltage-measurement');

  const detail = openDashboardSettings(initialNavigationState);
  assert.equal(goBack(detail).route, 'dashboard');

  const home = goHome({ ...detail, route: 'iso12098-pin10-validation' });
  assert.equal(home.route, 'dashboard');
  assert.equal(home.overlay, null);

  const vehicle = openVehicleEntry(home);
  assert.equal(vehicle.route, 'vehicle-entry');
});

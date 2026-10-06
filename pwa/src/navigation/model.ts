export type RouteId =
  | 'dashboard'
  | 'vehicle-entry'
  | 'new-vehicle-form'
  | 'cable-menu'
  | 'can-menu'
  | 'battery-status'
  | 'iso7638-voltage-measurement'
  | 'iso12098-voltage-measurement'
  | 'iso12098-pin10-validation'
  | 'iso12098-pin11-validation'
  | 'iso12098-pin12-validation'
  | 'iso7638-cable-select'
  | 'iso7638-cable-measurement'
  | 'iso12098-cable-select'
  | 'iso12098-cable-measurement'
  | 'iso7638-can-tractor-safety'
  | 'iso7638-can-tractor-resistance'
  | 'iso12098-can-tractor-safety'
  | 'iso12098-can-tractor-resistance'
  | 'iso7638-can-trailer-safety'
  | 'iso7638-can-trailer-resistance'
  | 'iso12098-can-trailer-safety'
  | 'iso12098-can-trailer-resistance'
  | 'lamp-test-measurement'
  | 'axle-lift-safety'
  | 'report-result'
  | 'settings-detail';

export type OldRecordSearchOrigin = 'vehicle-entry' | 'reports';

export type SaveableRouteId =
  | 'iso7638-voltage-measurement'
  | 'iso12098-voltage-measurement'
  | 'iso7638-cable-measurement'
  | 'iso12098-cable-measurement'
  | 'iso7638-can-tractor-resistance'
  | 'iso12098-can-tractor-resistance'
  | 'iso7638-can-trailer-resistance'
  | 'iso12098-can-trailer-resistance'
  | 'lamp-test-measurement'
  | 'report-result';

export type NavigationOverlay =
  | { readonly kind: 'old-record-search'; readonly origin: OldRecordSearchOrigin }
  | { readonly kind: 'report-save'; readonly returnTo: 'report-result' }
  | { readonly kind: 'report-save-common'; readonly returnTo: SaveableRouteId }
  | { readonly kind: 'voltage-preflight'; readonly iso: '7638' | '12098' }
  | { readonly kind: 'voltage-exit'; readonly iso: '7638' | '12098' };

export interface NavigationState {
  readonly route: RouteId;
  readonly hasActiveServiceRecord: boolean;
  readonly overlay: NavigationOverlay | null;
}

export const initialNavigationState: NavigationState = {
  route: 'dashboard',
  hasActiveServiceRecord: false,
  overlay: null,
};

const SAVEABLE_ROUTES: readonly SaveableRouteId[] = [
  'iso7638-voltage-measurement',
  'iso12098-voltage-measurement',
  'iso7638-cable-measurement',
  'iso12098-cable-measurement',
  'iso7638-can-tractor-resistance',
  'iso12098-can-tractor-resistance',
  'iso7638-can-trailer-resistance',
  'iso12098-can-trailer-resistance',
  'lamp-test-measurement',
  'report-result',
];

const PIN_VALIDATION_ROUTES: readonly RouteId[] = [
  'iso12098-pin10-validation',
  'iso12098-pin11-validation',
  'iso12098-pin12-validation',
];

const CAN_SAFETY_BY_CHOICE: readonly RouteId[] = [
  'iso7638-can-tractor-safety',
  'iso12098-can-tractor-safety',
  'iso7638-can-trailer-safety',
  'iso12098-can-trailer-safety',
];

const CAN_RESISTANCE_BY_SAFETY: Readonly<Partial<Record<RouteId, RouteId>>> = {
  'iso7638-can-tractor-safety': 'iso7638-can-tractor-resistance',
  'iso12098-can-tractor-safety': 'iso12098-can-tractor-resistance',
  'iso7638-can-trailer-safety': 'iso7638-can-trailer-resistance',
  'iso12098-can-trailer-safety': 'iso12098-can-trailer-resistance',
};

const CAN_SAFETY_BY_RESISTANCE: Readonly<Partial<Record<RouteId, RouteId>>> = {
  'iso7638-can-tractor-resistance': 'iso7638-can-tractor-safety',
  'iso12098-can-tractor-resistance': 'iso12098-can-tractor-safety',
  'iso7638-can-trailer-resistance': 'iso7638-can-trailer-safety',
  'iso12098-can-trailer-resistance': 'iso12098-can-trailer-safety',
};

function isSaveableRoute(route: RouteId): route is SaveableRouteId {
  return SAVEABLE_ROUTES.includes(route as SaveableRouteId);
}

export function openVehicleEntry(state: NavigationState): NavigationState {
  return state.overlay === null
    ? { ...state, route: 'vehicle-entry' }
    : state;
}

export function openNewVehicleForm(state: NavigationState): NavigationState {
  return state.route === 'vehicle-entry' && state.overlay === null
    ? { ...state, route: 'new-vehicle-form' }
    : state;
}

export function openEntryOldRecordSearch(state: NavigationState): NavigationState {
  return state.route === 'vehicle-entry' && state.overlay === null
    ? { ...state, overlay: { kind: 'old-record-search', origin: 'vehicle-entry' } }
    : state;
}

export function activateServiceRecord(state: NavigationState): NavigationState {
  if (
    state.route !== 'vehicle-entry' &&
    state.route !== 'new-vehicle-form' &&
    state.overlay?.kind !== 'old-record-search'
  ) {
    return state;
  }

  return {
    ...state,
    route: 'dashboard',
    hasActiveServiceRecord: true,
    overlay: null,
  };
}

export function openDashboardVoltage(
  state: NavigationState,
  iso: '7638' | '12098',
): NavigationState {
  if (state.route !== 'dashboard' || state.overlay !== null) {
    return state;
  }

  return iso === '7638'
    ? openIso7638Preflight(state)
    : openIso12098Preflight(state);
}

export function openIso7638Preflight(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, overlay: { kind: 'voltage-preflight', iso: '7638' } }
    : state;
}

export function beginIso7638Voltage(state: NavigationState): NavigationState {
  return state.route === 'dashboard' &&
    state.overlay?.kind === 'voltage-preflight' &&
    state.overlay.iso === '7638'
    ? { ...state, route: 'iso7638-voltage-measurement', overlay: null }
    : state;
}

export function requestIso7638Exit(state: NavigationState): NavigationState {
  if (state.route !== 'iso7638-voltage-measurement' || state.overlay !== null) {
    return state;
  }

  return state.hasActiveServiceRecord
    ? { ...state, overlay: { kind: 'voltage-exit', iso: '7638' } }
    : { ...state, route: 'dashboard', overlay: null };
}

export function completeIso7638Exit(state: NavigationState): NavigationState {
  return state.overlay?.kind === 'voltage-exit' && state.overlay.iso === '7638'
    ? { ...state, route: 'dashboard', overlay: null }
    : state;
}

export function openIso12098Preflight(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, overlay: { kind: 'voltage-preflight', iso: '12098' } }
    : state;
}

export function beginIso12098Voltage(state: NavigationState): NavigationState {
  return state.route === 'dashboard' &&
    state.overlay?.kind === 'voltage-preflight' &&
    state.overlay.iso === '12098'
    ? { ...state, route: 'iso12098-voltage-measurement', overlay: null }
    : state;
}

export function requestIso12098Exit(state: NavigationState): NavigationState {
  if (state.route !== 'iso12098-voltage-measurement' || state.overlay !== null) {
    return state;
  }

  return state.hasActiveServiceRecord
    ? { ...state, overlay: { kind: 'voltage-exit', iso: '12098' } }
    : { ...state, route: 'dashboard', overlay: null };
}

export function completeIso12098Exit(state: NavigationState): NavigationState {
  return state.overlay?.kind === 'voltage-exit' && state.overlay.iso === '12098'
    ? { ...state, route: 'dashboard', overlay: null }
    : state;
}

export function openCableMenu(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'cable-menu' }
    : state;
}

export function openCanMenu(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'can-menu' }
    : state;
}

export function openDashboardLamp(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'lamp-test-measurement' }
    : state;
}

export function openDashboardReports(state: NavigationState): NavigationState {
  if (state.route !== 'dashboard' || state.overlay !== null) {
    return state;
  }

  return state.hasActiveServiceRecord
    ? { ...state, route: 'report-result' }
    : { ...state, overlay: { kind: 'old-record-search', origin: 'reports' } };
}

export function openDashboardSettings(state: NavigationState): NavigationState {
  return state.overlay === null
    ? { ...state, route: 'settings-detail' }
    : state;
}

export function openBatteryStatus(state: NavigationState): NavigationState {
  return state.route === 'dashboard' && state.overlay === null
    ? { ...state, route: 'battery-status' }
    : state;
}

export function openCanSafetyChoice(
  state: NavigationState,
  choice: 0 | 1 | 2 | 3,
): NavigationState {
  if (state.route !== 'can-menu' || state.overlay !== null) {
    return state;
  }

  const route = CAN_SAFETY_BY_CHOICE[choice];
  return route ? { ...state, route } : state;
}

export function openIso12098PinValidation(
  state: NavigationState,
  pin: 10 | 11 | 12,
): NavigationState {
  if (state.route !== 'iso12098-voltage-measurement' || state.overlay !== null) {
    return state;
  }

  const route: RouteId =
    pin === 10
      ? 'iso12098-pin10-validation'
      : pin === 11
        ? 'iso12098-pin11-validation'
        : 'iso12098-pin12-validation';

  return { ...state, route };
}

export function completeIso12098PinValidation(state: NavigationState): NavigationState {
  return PIN_VALIDATION_ROUTES.includes(state.route) && state.overlay === null
    ? { ...state, route: 'iso12098-voltage-measurement' }
    : state;
}

export function openCableBranch(
  state: NavigationState,
  branch: 'iso7638' | 'iso12098',
): NavigationState {
  if (state.route !== 'cable-menu' || state.overlay !== null) {
    return state;
  }

  return {
    ...state,
    route: branch === 'iso7638' ? 'iso7638-cable-select' : 'iso12098-cable-select',
  };
}

export function startCableMeasurement(state: NavigationState): NavigationState {
  if (state.overlay !== null) {
    return state;
  }

  if (state.route === 'iso7638-cable-select') {
    return { ...state, route: 'iso7638-cable-measurement' };
  }

  if (state.route === 'iso12098-cable-select') {
    return { ...state, route: 'iso12098-cable-measurement' };
  }

  return state;
}

export function confirmCanSafety(state: NavigationState): NavigationState {
  if (state.overlay !== null) {
    return state;
  }

  const route = CAN_RESISTANCE_BY_SAFETY[state.route];
  return route ? { ...state, route } : state;
}

export function openAxleLiftSafety(state: NavigationState): NavigationState {
  return state.route === 'lamp-test-measurement' && state.overlay === null
    ? { ...state, route: 'axle-lift-safety' }
    : state;
}

export function completeAxleLiftSafety(state: NavigationState): NavigationState {
  return state.route === 'axle-lift-safety' && state.overlay === null
    ? { ...state, route: 'lamp-test-measurement' }
    : state;
}

export function openReportFromOldRecordSearch(state: NavigationState): NavigationState {
  return state.overlay?.kind === 'old-record-search' && state.overlay.origin === 'reports'
    ? {
        ...state,
        route: 'report-result',
        overlay: null,
      }
    : state;
}

export function retestFromReport(state: NavigationState): NavigationState {
  return state.route === 'report-result' && state.overlay === null
    ? { ...state, route: 'dashboard' }
    : state;
}

export function openReportSave(state: NavigationState): NavigationState {
  return state.route === 'report-result' && state.overlay === null
    ? { ...state, overlay: { kind: 'report-save', returnTo: 'report-result' } }
    : state;
}

export function openCommonSaveOverlay(state: NavigationState): NavigationState {
  if (state.overlay !== null || !isSaveableRoute(state.route)) {
    return state;
  }

  return {
    ...state,
    overlay: { kind: 'report-save-common', returnTo: state.route },
  };
}

export function closeOverlay(state: NavigationState): NavigationState {
  return state.overlay === null ? state : { ...state, overlay: null };
}

export function goHome(state: NavigationState): NavigationState {
  if (state.route === 'iso7638-voltage-measurement') {
    return requestIso7638Exit(state);
  }
  if (state.route === 'iso12098-voltage-measurement') {
    return requestIso12098Exit(state);
  }
  return { ...state, route: 'dashboard', overlay: null };
}

export function goBack(state: NavigationState): NavigationState {
  if (state.overlay !== null) {
    return { ...state, overlay: null };
  }

  switch (state.route) {
    case 'dashboard':
      return state;
    case 'vehicle-entry':
      return { ...state, route: 'dashboard' };
    case 'new-vehicle-form':
      return { ...state, route: 'vehicle-entry' };
    case 'cable-menu':
    case 'can-menu':
    case 'battery-status':
    case 'iso7638-voltage-measurement':
      return requestIso7638Exit(state);
    case 'iso12098-voltage-measurement':
      return requestIso12098Exit(state);
    case 'lamp-test-measurement':
    case 'report-result':
    case 'settings-detail':
      return { ...state, route: 'dashboard', overlay: null };
    case 'iso12098-pin10-validation':
    case 'iso12098-pin11-validation':
    case 'iso12098-pin12-validation':
      return { ...state, route: 'iso12098-voltage-measurement' };
    case 'iso7638-cable-select':
    case 'iso12098-cable-select':
      return { ...state, route: 'cable-menu', overlay: null };
    case 'iso7638-cable-measurement':
      return { ...state, route: 'iso7638-cable-select' };
    case 'iso12098-cable-measurement':
      return { ...state, route: 'iso12098-cable-select' };
    case 'iso7638-can-tractor-safety':
    case 'iso12098-can-tractor-safety':
    case 'iso7638-can-trailer-safety':
    case 'iso12098-can-trailer-safety':
      return { ...state, route: 'can-menu', overlay: null };
    case 'iso7638-can-tractor-resistance':
    case 'iso12098-can-tractor-resistance':
    case 'iso7638-can-trailer-resistance':
    case 'iso12098-can-trailer-resistance': {
      const parentRoute = CAN_SAFETY_BY_RESISTANCE[state.route];
      return parentRoute ? { ...state, route: parentRoute } : state;
    }
  }
}

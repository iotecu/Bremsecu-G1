export interface LocalTechnician {
  readonly id: string;
  readonly name: string;
}

export interface LocalServiceSettings {
  readonly technicians: readonly LocalTechnician[];
  readonly serviceCompany: string;
  readonly serviceAddress: string;
  readonly servicePhone: string;
  readonly serviceEmail: string;
  readonly keepScreenAwake: boolean;
}

const STORAGE_KEY = 'bremsecu.service-settings.v1';

const DEFAULT_SETTINGS: LocalServiceSettings = {
  technicians: [],
  serviceCompany: '',
  serviceAddress: '',
  servicePhone: '',
  serviceEmail: '',
  keepScreenAwake: true,
};

const listeners = new Set<() => void>();

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTechnicians(value: unknown): LocalTechnician[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: LocalTechnician[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const name = safeString(record.name);
    if (!name) continue;
    const id = safeString(record.id) || technicianId(name);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({ id, name });
  }

  return result;
}

export function technicianId(name: string): string {
  const normalized = name
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return 'tech-' + (normalized || 'person');
}

export function readLocalServiceSettings(): LocalServiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      technicians: normalizeTechnicians(parsed.technicians),
      serviceCompany: safeString(parsed.serviceCompany),
      serviceAddress: safeString(parsed.serviceAddress),
      servicePhone: safeString(parsed.servicePhone),
      serviceEmail: safeString(parsed.serviceEmail),
      keepScreenAwake:
        typeof parsed.keepScreenAwake === 'boolean'
          ? parsed.keepScreenAwake
          : DEFAULT_SETTINGS.keepScreenAwake,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeLocalServiceSettings(
  patch: Partial<LocalServiceSettings>,
): LocalServiceSettings {
  const next: LocalServiceSettings = {
    ...readLocalServiceSettings(),
    ...patch,
    technicians:
      patch.technicians !== undefined
        ? normalizeTechnicians(patch.technicians)
        : readLocalServiceSettings().technicians,
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  listeners.forEach((listener) => listener());
  return next;
}

export function subscribeLocalServiceSettings(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

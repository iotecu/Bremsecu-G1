import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPROVED_LOCALE_CODES = Object.freeze([
  'tr',
  'en',
  'de',
  'fr',
  'it',
  'el',
  'ru',
  'ar',
  'fa',
  'bg',
  'pl',
  'sr',
  'ro',
  'es',
]);

const RTL_LOCALES = new Set(['ar', 'fa']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function flattenDictionary(value, prefix = '', output = new Map(), errors = []) {
  if (!isPlainObject(value)) {
    errors.push(`${prefix || '<root>'}: expected an object`);
    return { entries: output, errors };
  }

  for (const [key, child] of Object.entries(value)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(child)) {
      flattenDictionary(child, pathKey, output, errors);
      continue;
    }

    if (typeof child !== 'string') {
      errors.push(`${pathKey}: expected a string value`);
      continue;
    }

    if (child.trim().length === 0) {
      errors.push(`${pathKey}: translation is empty`);
      continue;
    }

    output.set(pathKey, child);
  }

  return { entries: output, errors };
}

function placeholders(value) {
  return [...value.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)]
    .map((match) => match[1])
    .sort();
}

function compareArrays(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function validateI18n({ registry, dictionaries, localeFilenames }) {
  const errors = [];
  const registryCodes = registry.map((entry) => entry.code);

  if (!compareArrays(registryCodes, APPROVED_LOCALE_CODES)) {
    errors.push(
      `registry: expected order ${APPROVED_LOCALE_CODES.join(', ')}, received ${registryCodes.join(', ')}`,
    );
  }

  if (new Set(registryCodes).size !== registryCodes.length) {
    errors.push('registry: duplicate locale code found');
  }

  for (const entry of registry) {
    const expectedDirection = RTL_LOCALES.has(entry.code) ? 'rtl' : 'ltr';

    if (entry.direction !== expectedDirection) {
      errors.push(
        `registry.${entry.code}.direction: expected ${expectedDirection}, received ${entry.direction}`,
      );
    }

    if (typeof entry.nativeLabel !== 'string' || entry.nativeLabel.trim().length === 0) {
      errors.push(`registry.${entry.code}.nativeLabel: value is required`);
    }

    if (typeof entry.intlLocale !== 'string' || entry.intlLocale.trim().length === 0) {
      errors.push(`registry.${entry.code}.intlLocale: value is required`);
    }
  }

  const expectedFilenames = APPROVED_LOCALE_CODES.map((code) => `${code}.json`).sort();
  const receivedFilenames = [...localeFilenames].sort();

  if (!compareArrays(receivedFilenames, expectedFilenames)) {
    errors.push(
      `locale files: expected ${expectedFilenames.join(', ')}, received ${receivedFilenames.join(', ')}`,
    );
  }

  const source = flattenDictionary(dictionaries.tr);
  errors.push(...source.errors.map((error) => `tr.${error}`));
  const sourceKeys = [...source.entries.keys()].sort();

  for (const code of APPROVED_LOCALE_CODES) {
    const dictionary = dictionaries[code];

    if (!dictionary) {
      errors.push(`${code}: locale dictionary is missing`);
      continue;
    }

    const target = flattenDictionary(dictionary);
    errors.push(...target.errors.map((error) => `${code}.${error}`));
    const targetKeys = [...target.entries.keys()].sort();

    for (const key of sourceKeys.filter((sourceKey) => !target.entries.has(sourceKey))) {
      errors.push(`${code}.${key}: key is missing`);
    }

    for (const key of targetKeys.filter((targetKey) => !source.entries.has(targetKey))) {
      errors.push(`${code}.${key}: unexpected extra key`);
    }

    for (const key of sourceKeys.filter((sourceKey) => target.entries.has(sourceKey))) {
      const sourceValue = source.entries.get(key);
      const targetValue = target.entries.get(key);
      const sourcePlaceholders = placeholders(sourceValue);
      const targetPlaceholders = placeholders(targetValue);

      if (!compareArrays(sourcePlaceholders, targetPlaceholders)) {
        errors.push(
          `${code}.${key}: expected placeholders ${sourcePlaceholders.join(', ') || '<none>'}, received ${targetPlaceholders.join(', ') || '<none>'}`,
        );
      }
    }
  }

  return errors;
}

export async function loadI18nProject(projectRoot) {
  const i18nRoot = path.join(projectRoot, 'src', 'i18n');
  const localesRoot = path.join(i18nRoot, 'locales');
  const registry = JSON.parse(
    await readFile(path.join(i18nRoot, 'locale-registry.json'), 'utf8'),
  );
  const localeFilenames = (await readdir(localesRoot)).filter((name) => name.endsWith('.json'));
  const dictionaries = {};

  for (const filename of localeFilenames) {
    const code = path.basename(filename, '.json');
    dictionaries[code] = JSON.parse(await readFile(path.join(localesRoot, filename), 'utf8'));
  }

  return { registry, dictionaries, localeFilenames };
}

export function currentProjectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

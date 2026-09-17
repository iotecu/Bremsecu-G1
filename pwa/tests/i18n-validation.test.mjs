import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPROVED_LOCALE_CODES,
  currentProjectRoot,
  loadI18nProject,
  validateI18n,
} from '../scripts/i18n-validation.mjs';

test('the checked-in locale set passes every invariant', async () => {
  const project = await loadI18nProject(currentProjectRoot());
  assert.deepEqual(validateI18n(project), []);
});

test('a missing target key fails validation', async () => {
  const project = structuredClone(await loadI18nProject(currentProjectRoot()));
  delete project.dictionaries.en.demo.date;
  assert.ok(validateI18n(project).includes('en.demo.date: key is missing'));
});

test('an unexpected target key fails validation', async () => {
  const project = structuredClone(await loadI18nProject(currentProjectRoot()));
  project.dictionaries.de.demo.unapproved = 'Nicht genehmigt';
  assert.ok(validateI18n(project).includes('de.demo.unapproved: unexpected extra key'));
});

test('an empty translation fails validation', async () => {
  const project = structuredClone(await loadI18nProject(currentProjectRoot()));
  project.dictionaries.fr.demo.increment = '   ';
  assert.ok(validateI18n(project).includes('fr.demo.increment: translation is empty'));
});

test('a placeholder mismatch fails validation', async () => {
  const project = structuredClone(await loadI18nProject(currentProjectRoot()));
  project.dictionaries.es.demo.count = 'Contador: {{valor}}';
  assert.ok(
    validateI18n(project).includes(
      'es.demo.count: expected placeholders count, received valor',
    ),
  );
});

test('a registry reorder fails validation', async () => {
  const project = structuredClone(await loadI18nProject(currentProjectRoot()));
  [project.registry[0], project.registry[1]] = [project.registry[1], project.registry[0]];
  const expected = APPROVED_LOCALE_CODES.join(', ');
  assert.ok(
    validateI18n(project).some((error) =>
      error.startsWith(`registry: expected order ${expected}`),
    ),
  );
});

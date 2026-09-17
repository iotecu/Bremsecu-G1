#!/usr/bin/env node
import { currentProjectRoot, loadI18nProject, validateI18n } from './i18n-validation.mjs';

try {
  const project = await loadI18nProject(currentProjectRoot());
  const errors = validateI18n(project);

  if (errors.length > 0) {
    console.error(`i18n validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log('i18n validation passed: 14 locales match the Turkish source dictionary.');
  }
} catch (error) {
  console.error('i18n validation could not run.');
  console.error(error);
  process.exitCode = 1;
}

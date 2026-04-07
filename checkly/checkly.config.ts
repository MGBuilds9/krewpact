/**
 * Checkly configuration
 * See: https://www.checklyhq.com/docs/cli/project-structure/
 */
import { defineConfig } from 'checkly';

export default defineConfig({
  projectName: 'KrewPact',
  logicalId: 'krewpact-monitoring',
  repoUrl: 'https://github.com/MGBuilds9/krewpact',
  checks: {
    activated: true,
    muted: false,
    runtimeId: '2024.02',
    frequency: 5,
    locations: ['us-east-1', 'ca-central-1'],
    tags: ['krewpact', 'production'],
    checkMatch: '**/*.check.ts',
    browserChecks: {
      frequency: 10,
      testMatch: '**/*.spec.ts',
    },
  },
});

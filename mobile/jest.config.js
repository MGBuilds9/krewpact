const EXPO_TRANSFORM_IGNORE =
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tanstack)';

module.exports = {
  projects: [
    // React Native / Expo screens — uses jest-expo preset
    {
      displayName: 'mobile',
      preset: 'jest-expo',
      setupFiles: [
        require.resolve('jest-expo/src/preset/setup.js'),
        '<rootDir>/__tests__/setup.ts',
      ],
      testMatch: ['**/__tests__/app/**/*.test.{ts,tsx}'],
      transformIgnorePatterns: [EXPO_TRANSFORM_IGNORE],
      moduleNameMapper: {
        '^@/constants/config$': '<rootDir>/__tests__/mocks/config.ts',
        '^@/lib/api-client$': '<rootDir>/__tests__/mocks/api-client.ts',
        '^@/lib/query-client$': '<rootDir>/__tests__/mocks/query-client.ts',
        '^@/components/DailyLogForm$': '<rootDir>/__tests__/mocks/DailyLogForm.tsx',
        '^@/components/KPICard$': '<rootDir>/__tests__/mocks/KPICard.tsx',
        '^@/components/SyncStatusBar$': '<rootDir>/__tests__/mocks/SyncStatusBar.tsx',
        '^@/components/SyncConflictSheet$': '<rootDir>/__tests__/mocks/SyncConflictSheet.tsx',
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
    // Pure TypeScript utilities — uses node environment
    {
      displayName: 'lib',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/lib/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['babel-jest', { configFile: './babel.config.js' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};

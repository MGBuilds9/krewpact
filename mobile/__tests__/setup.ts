// Prevent Expo winter runtime lazy getters from firing after test teardown.
const _globalAny = global as Record<string, unknown>;
if (typeof _globalAny.__ExpoImportMetaRegistry === 'undefined') {
  _globalAny.__ExpoImportMetaRegistry = { url: null };
}
if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as Record<string, unknown>).structuredClone = (val: unknown) =>
    JSON.parse(JSON.stringify(val));
} else {
  void globalThis.structuredClone;
}

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'test-project-id' }),
}));

// Mock @clerk/clerk-expo
jest.mock('@clerk/clerk-expo', () => ({
  useSignIn: () => ({
    signIn: {
      create: jest.fn().mockResolvedValue({ status: 'complete', createdSessionId: 'session-id' }),
    },
    setActive: jest.fn(),
    isLoaded: true,
  }),
  useAuth: () => ({
    userId: 'test-user-id',
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
    },
  }),
}));

// Mock @tanstack/react-query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isFetching: false,
  }),
  useMutation: jest.fn().mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  }),
  useQueryClient: jest.fn().mockReturnValue({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 43.589, longitude: -79.6441 },
  }),
}));

// Mock offline modules
jest.mock('@/lib/offline/store', () => ({
  countByStatus: jest.fn().mockResolvedValue({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    dead_letter: 0,
  }),
  getItemsByStatus: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/offline/online-detector', () => ({
  getOnlineState: jest.fn().mockReturnValue(true),
  subscribe: jest.fn().mockReturnValue(() => {}),
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
}));

jest.mock('@/lib/offline/sync-engine', () => ({
  getIsSyncing: jest.fn().mockReturnValue(false),
  getLastSyncAt: jest.fn().mockReturnValue(null),
  onSyncComplete: jest.fn().mockReturnValue(() => {}),
  processQueue: jest.fn().mockResolvedValue([]),
  startAutoSync: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('@/lib/offline/background-sync', () => ({
  registerBackgroundSync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/notifications', () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue(null),
  addNotificationListeners: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('@/lib/photo-utils', () => ({
  compressImage: jest.fn().mockResolvedValue({
    uri: 'file:///compressed.jpg',
    width: 1920,
    height: 1080,
    fileSize: 500000,
  }),
}));

// Silence noisy React Native warnings in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('Warning:') || msg.includes('act(')) {
    return;
  }
  originalConsoleError(...args);
};

// Prevent Expo winter runtime lazy getters from firing after test teardown.
// These are installed as lazy getters by expo/src/winter/installGlobal — if they
// remain unevaluated when the Jest environment tears down, they throw
// "You are trying to import a file outside of the scope of the test code."
// Eagerly touching them here forces evaluation while the runtime is active.
const _globalAny = global as Record<string, unknown>;
if (typeof _globalAny.__ExpoImportMetaRegistry === 'undefined') {
  _globalAny.__ExpoImportMetaRegistry = { url: null };
}
// Eagerly resolve structuredClone polyfill (from @ungap/structured-clone)
if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as Record<string, unknown>).structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
} else {
  // Touch the getter to force lazy evaluation before teardown
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
  }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
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

import '@testing-library/jest-dom'

// Mock Chrome extension APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    onInstalled: {
      addListener: vi.fn(),
    },
  },
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
  },
  declarativeNetRequest: {
    updateDynamicRules: vi.fn(),
    getDynamicRules: vi.fn(),
  },
  tabs: {
    create: vi.fn(),
    update: vi.fn(),
    query: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
} as Chrome

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}

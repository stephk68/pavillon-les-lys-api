// Global setup for tests
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock bcrypt globally
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // warn: jest.fn(),
};

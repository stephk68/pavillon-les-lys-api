import { Test, TestingModule } from '@nestjs/testing';
import { clearAllMocks, mockPrismaService } from '../mocks/prisma.mock';

describe('Test Architecture', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should validate test setup', () => {
    expect(true).toBe(true);
  });

  it('should have access to Jest matchers', () => {
    expect('hello').toMatch(/^h/);
    expect(42).toBeGreaterThan(0);
    expect([1, 2, 3]).toHaveLength(3);
  });

  it('should support async tests', async () => {
    const promise = Promise.resolve('test');
    await expect(promise).resolves.toBe('test');
  });

  it('should have environment variables loaded', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret-for-development-only');
  });

  it('should have working Prisma mocks', () => {
    expect(mockPrismaService.user.create).toBeDefined();
    expect(jest.isMockFunction(mockPrismaService.user.create)).toBe(true);

    // Test mock functionality
    mockPrismaService.user.create.mockResolvedValue({ id: 'test' });
    expect(mockPrismaService.user.create).toHaveBeenCalledTimes(0);

    // Clear and verify
    clearAllMocks();
    expect(mockPrismaService.user.create).toHaveBeenCalledTimes(0);
  });

  it('should support NestJS testing module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'TEST_SERVICE',
          useValue: { test: () => 'works' },
        },
      ],
    }).compile();

    const testService = module.get('TEST_SERVICE');
    expect(testService.test()).toBe('works');
  });
});

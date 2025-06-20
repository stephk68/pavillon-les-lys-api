export const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest
    .fn()
    .mockReturnValue({ sub: 'user-id', email: 'test@example.com' }),
  decode: jest.fn(),
};

export const mockUserService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  validatePassword: jest.fn(),
  updatePassword: jest.fn(),
};

export const mockReservationService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  checkAvailability: jest.fn(),
  confirm: jest.fn(),
  cancel: jest.fn(),
};

export const mockPaymentService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  markAsPaid: jest.fn(),
  refund: jest.fn(),
};

export const mockQuoteService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
};

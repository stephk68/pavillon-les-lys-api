export const mockJwtService = {
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
  verify: jest
    .fn()
    .mockReturnValue({ sub: "user-id", email: "test@example.com" }),
  decode: jest.fn(),
};

export const mockUserService = {
  register: jest.fn(),
  createStaff: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  validatePassword: jest.fn(),
  updatePassword: jest.fn(),
  searchUsers: jest.fn(),
  countUsers: jest.fn(),
  getUserStats: jest.fn(),
  getUsersByRole: jest.fn(),
};

export const mockEventFolderService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  transitionStatus: jest.fn(),
  getCalendar: jest.fn(),
  checkAvailability: jest.fn(),
  getStats: jest.fn(),
  addEquipment: jest.fn(),
  updateEquipment: jest.fn(),
  removeEquipment: jest.fn(),
};

export const mockPaymentService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  markAsPaid: jest.fn(),
  refund: jest.fn(),
  getStats: jest.fn(),
  getEventFolderPayments: jest.fn(),
  getPendingPayments: jest.fn(),
  getUserPayments: jest.fn(),
  generateInvoicePdf: jest.fn(),
};

/** MailService : toutes les méthodes résolvent sans envoyer d'email. */
export const mockMailService = {
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
  sendContactMessage: jest.fn().mockResolvedValue(undefined),
  sendContract: jest.fn().mockResolvedValue(undefined),
  sendEventReminder: jest.fn().mockResolvedValue(undefined),
  sendFeedbackRequest: jest.fn().mockResolvedValue(undefined),
  sendOtpCode: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangedConfirmation: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendQuoteDocument: jest.fn().mockResolvedValue(undefined),
  sendStaffWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
};

export const mockAuditLogService = {
  create: jest.fn().mockResolvedValue({}),
  findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
};

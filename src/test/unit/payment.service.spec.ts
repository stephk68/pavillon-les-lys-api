import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PdfService } from "../../common/services/pdf.service";
import { PrismaService } from "../../common/services/prisma.service";
import { PaymentService } from "../../resources/payment/payment.service";

describe("PaymentService", () => {
  let service: PaymentService;
  let prismaService: any;

  const mockPdfService = {
    generatePdf: jest.fn().mockResolvedValue(Buffer.from("fake-pdf")),
  };

  const mockPayment = {
    id: "payment-1",
    amount: new Decimal(50000),
    type: PaymentType.ACOMPTE,
    status: PaymentStatus.PENDING,
    eventFolderId: "folder-1",
    userId: "user-1",
    dueDate: new Date(),
    paidAt: null,
    proofDocument: null,
    isRefundable: false,
    refundedAmount: null,
    refundedAt: null,
    createdBy: "admin-1",
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    eventFolder: {
      id: "folder-1",
      folderNumber: "EVT-2026-0001",
      status: "QUOTED",
      eventType: "MARIAGE",
      start: new Date(),
      end: new Date(),
      totalTTC: new Decimal(500000),
      user: {
        id: "user-1",
        email: "client@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "+225070000000",
      },
    },
    user: {
      id: "user-1",
      email: "client@example.com",
      firstName: "John",
      lastName: "Doe",
    },
  };

  const mockFolder = {
    id: "folder-1",
    userId: "user-1",
    folderNumber: "EVT-2026-0001",
    status: "QUOTED",
  };

  beforeEach(async () => {
    const mockPrismaService = {
      eventFolder: {
        findUnique: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createPaymentDto = {
      amount: 50000,
      type: PaymentType.ACOMPTE,
      eventFolderId: "folder-1",
    };
    const user = { id: "admin-1" };

    it("should create a payment successfully", async () => {
      prismaService.eventFolder.findUnique.mockResolvedValue(mockFolder);
      prismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await service.create(createPaymentDto, user);

      expect(prismaService.eventFolder.findUnique).toHaveBeenCalledWith({
        where: { id: "folder-1" },
      });
      expect(prismaService.payment.create).toHaveBeenCalled();
      expect(result).toEqual(mockPayment);
    });

    it("should throw NotFoundException if event folder not found", async () => {
      prismaService.eventFolder.findUnique.mockResolvedValue(null);

      await expect(service.create(createPaymentDto, user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findOne", () => {
    it("should return a payment by id", async () => {
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.findOne("payment-1");

      expect(prismaService.payment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "payment-1" },
        }),
      );
      expect(result).toEqual(mockPayment);
    });

    it("should throw NotFoundException if payment not found", async () => {
      prismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated payments", async () => {
      prismaService.payment.findMany.mockResolvedValue([mockPayment]);
      prismaService.payment.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({ data: [mockPayment], total: 1 });
    });

    it("should filter by status", async () => {
      prismaService.payment.findMany.mockResolvedValue([]);
      prismaService.payment.count.mockResolvedValue(0);

      await service.findAll({ status: PaymentStatus.PENDING });

      expect(prismaService.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PaymentStatus.PENDING }),
        }),
      );
    });
  });

  describe("markAsPaid", () => {
    it("should mark payment as paid", async () => {
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);
      const paidPayment = {
        ...mockPayment,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      };
      prismaService.payment.update.mockResolvedValue(paidPayment);

      const result = await service.markAsPaid("payment-1");

      expect(prismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "payment-1" },
          data: expect.objectContaining({
            status: PaymentStatus.PAID,
          }),
        }),
      );
      expect(result.status).toBe(PaymentStatus.PAID);
    });

    it("should throw BadRequestException if already paid", async () => {
      const paidPayment = { ...mockPayment, status: PaymentStatus.PAID };
      prismaService.payment.findUnique.mockResolvedValue(paidPayment);

      await expect(service.markAsPaid("payment-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("refund", () => {
    it("should refund a paid payment", async () => {
      const paidPayment = { ...mockPayment, status: PaymentStatus.PAID };
      prismaService.payment.findUnique.mockResolvedValue(paidPayment);
      const refundedPayment = {
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      };
      prismaService.payment.update.mockResolvedValue(refundedPayment);

      const result = await service.refund("payment-1");

      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });

    it("should throw BadRequestException if payment is not paid", async () => {
      prismaService.payment.findUnique.mockResolvedValue(mockPayment); // PENDING

      await expect(service.refund("payment-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("remove", () => {
    it("should remove a pending payment", async () => {
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);
      prismaService.payment.delete.mockResolvedValue(mockPayment);

      await service.remove("payment-1");

      expect(prismaService.payment.delete).toHaveBeenCalledWith({
        where: { id: "payment-1" },
      });
    });

    it("should throw BadRequestException if trying to remove a paid payment", async () => {
      const paidPayment = { ...mockPayment, status: PaymentStatus.PAID };
      prismaService.payment.findUnique.mockResolvedValue(paidPayment);

      await expect(service.remove("payment-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getStats", () => {
    it("should return payment statistics", async () => {
      prismaService.payment.groupBy.mockResolvedValue([
        {
          status: PaymentStatus.PAID,
          _count: { _all: 5 },
          _sum: { amount: new Decimal(250000) },
        },
      ]);
      prismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(250000) },
        _count: { _all: 5 },
      });

      const result = await service.getStats();

      expect(result).toHaveProperty("byStatus");
      expect(result).toHaveProperty("totalRevenue");
      expect(result).toHaveProperty("currentMonthRevenue");
    });
  });

  describe("generateInvoicePdf", () => {
    it("should generate a PDF invoice", async () => {
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPdfService.generatePdf.mockResolvedValue(Buffer.from("pdf-content"));

      const result = await service.generateInvoicePdf("payment-1");

      expect(mockPdfService.generatePdf).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});

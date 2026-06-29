import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../common/services/prisma.service";
import { FeedbackService } from "../../resources/feedback/feedback.service";

describe("FeedbackService", () => {
  let service: FeedbackService;
  let prismaService: any;

  const mockFeedback = {
    id: "feedback-1",
    userId: "user-1",
    eventFolderId: "folder-1",
    rating: 5,
    comment: "Excellent service!",
    response: null,
    respondedAt: null,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: "user-1",
      email: "client@example.com",
      firstName: "John",
      lastName: "Doe",
    },
    eventFolder: {
      id: "folder-1",
      eventType: "MARIAGE",
      start: new Date(),
      end: new Date(),
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      feedback: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a feedback", async () => {
      const createFeedbackDto = {
        rating: 5,
        comment: "Excellent service!",
        eventFolderId: "folder-1",
      };
      prismaService.feedback.create.mockResolvedValue(mockFeedback);

      const result = await service.create(createFeedbackDto, "user-1");

      expect(prismaService.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            eventFolderId: "folder-1",
            rating: 5,
          }),
        }),
      );
      expect(result).toEqual(mockFeedback);
    });
  });

  describe("findAll", () => {
    it("should return paginated feedbacks", async () => {
      prismaService.feedback.findMany.mockResolvedValue([mockFeedback]);
      prismaService.feedback.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({
        data: [mockFeedback],
        total: 1,
        skip: 0,
        take: 50,
      });
    });

    it("should filter by eventFolderId", async () => {
      prismaService.feedback.findMany.mockResolvedValue([mockFeedback]);
      prismaService.feedback.count.mockResolvedValue(1);

      await service.findAll({ eventFolderId: "folder-1" });

      expect(prismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventFolderId: "folder-1" }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a feedback by id", async () => {
      prismaService.feedback.findUnique.mockResolvedValue(mockFeedback);

      const result = await service.findOne("feedback-1");

      expect(result).toEqual(mockFeedback);
    });

    it("should throw NotFoundException if not found", async () => {
      prismaService.feedback.findUnique.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a feedback", async () => {
      prismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      const updatedFeedback = { ...mockFeedback, rating: 4 };
      prismaService.feedback.update.mockResolvedValue(updatedFeedback);

      const result = await service.update(
        "feedback-1",
        { rating: 4 },
        "user-1",
      );

      expect(result.rating).toBe(4);
    });

    it("should throw ForbiddenException if not owner", async () => {
      prismaService.feedback.findUnique.mockResolvedValue(mockFeedback);

      await expect(
        service.update("feedback-1", { rating: 3 }, "other-user"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("remove", () => {
    it("should remove a feedback", async () => {
      prismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      prismaService.feedback.delete.mockResolvedValue(mockFeedback);

      await service.remove("feedback-1");

      expect(prismaService.feedback.delete).toHaveBeenCalledWith({
        where: { id: "feedback-1" },
      });
    });
  });

  describe("getStats", () => {
    it("should return feedback statistics", async () => {
      prismaService.feedback.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // responded
        .mockResolvedValueOnce(2); // unread
      prismaService.feedback.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
      });
      prismaService.feedback.groupBy.mockResolvedValue([
        { rating: 5, _count: 6 },
        { rating: 4, _count: 4 },
      ]);

      const result = await service.getStats();

      expect(result).toHaveProperty("totalFeedbacks");
      expect(result).toHaveProperty("averageRating");
      expect(result).toHaveProperty("ratingDistribution");
      expect(result).toHaveProperty("responseRate");
      expect(result).toHaveProperty("unreadCount");
    });
  });

  describe("respondToFeedback", () => {
    it("should respond to a feedback", async () => {
      prismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      const respondedFeedback = {
        ...mockFeedback,
        response: "Merci !",
        respondedAt: new Date(),
        isRead: true,
      };
      prismaService.feedback.update.mockResolvedValue(respondedFeedback);

      const result = await service.respondToFeedback("feedback-1", "Merci !");

      expect(result.response).toBe("Merci !");
      expect(result.isRead).toBe(true);
    });
  });

  describe("markAsRead", () => {
    it("should mark feedback as read", async () => {
      prismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      const readFeedback = { ...mockFeedback, isRead: true };
      prismaService.feedback.update.mockResolvedValue(readFeedback);

      const result = await service.markAsRead("feedback-1");

      expect(result.isRead).toBe(true);
    });
  });
});

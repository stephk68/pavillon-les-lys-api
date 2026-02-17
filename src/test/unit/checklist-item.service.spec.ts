import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../common/services/prisma.service";
import { ChekclistItemService } from "../../resources/chekclist-item/chekclist-item.service";

describe("ChekclistItemService", () => {
  let service: ChekclistItemService;
  let prismaService: any;

  const mockChecklistItem = {
    id: "checklist-1",
    title: "Préparer la décoration",
    description: null,
    eventFolderId: "folder-1",
    assignedTo: "user-1",
    completed: false,
    completedAt: null,
    dueAt: new Date("2026-03-01"),
    displayOrder: 1,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    eventFolder: {
      id: "folder-1",
      eventType: "MARIAGE",
      start: new Date(),
    },
  };

  const mockEventFolder = {
    id: "folder-1",
    eventType: "MARIAGE",
    status: "BOOKED",
  };

  beforeEach(async () => {
    const mockPrismaService = {
      eventFolder: {
        findUnique: jest.fn(),
      },
      checklistItem: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChekclistItemService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChekclistItemService>(ChekclistItemService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a checklist item", async () => {
      const createDto = {
        title: "Préparer la décoration",
        eventFolderId: "folder-1",
        assignedTo: "user-1",
        dueAt: "2026-03-01T00:00:00Z",
      };

      prismaService.eventFolder.findUnique.mockResolvedValue(mockEventFolder);
      prismaService.checklistItem.aggregate.mockResolvedValue({
        _max: { displayOrder: 0 },
      });
      prismaService.checklistItem.create.mockResolvedValue(mockChecklistItem);

      const result = await service.create(createDto);

      expect(prismaService.eventFolder.findUnique).toHaveBeenCalledWith({
        where: { id: "folder-1" },
      });
      expect(prismaService.checklistItem.create).toHaveBeenCalled();
      expect(result).toEqual(mockChecklistItem);
    });

    it("should throw NotFoundException if event folder not found", async () => {
      const createDto = {
        title: "Test",
        eventFolderId: "non-existent",
      };

      prismaService.eventFolder.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated checklist items", async () => {
      prismaService.checklistItem.findMany.mockResolvedValue([
        mockChecklistItem,
      ]);
      prismaService.checklistItem.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({
        data: [mockChecklistItem],
        total: 1,
        skip: 0,
        take: 100,
      });
    });

    it("should filter by eventFolderId", async () => {
      prismaService.checklistItem.findMany.mockResolvedValue([]);
      prismaService.checklistItem.count.mockResolvedValue(0);

      await service.findAll({ eventFolderId: "folder-1" });

      expect(prismaService.checklistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventFolderId: "folder-1" }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a checklist item by id", async () => {
      prismaService.checklistItem.findUnique.mockResolvedValue(
        mockChecklistItem,
      );

      const result = await service.findOne("checklist-1");

      expect(result).toEqual(mockChecklistItem);
    });

    it("should throw NotFoundException if not found", async () => {
      prismaService.checklistItem.findUnique.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByEventFolder", () => {
    it("should return checklist items for a folder", async () => {
      prismaService.eventFolder.findUnique.mockResolvedValue(mockEventFolder);
      prismaService.checklistItem.findMany.mockResolvedValue([
        mockChecklistItem,
      ]);

      const result = await service.findByEventFolder("folder-1");

      expect(result).toEqual([mockChecklistItem]);
    });

    it("should throw NotFoundException if folder not found", async () => {
      prismaService.eventFolder.findUnique.mockResolvedValue(null);

      await expect(service.findByEventFolder("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a checklist item", async () => {
      prismaService.checklistItem.findUnique.mockResolvedValue(
        mockChecklistItem,
      );
      const updatedItem = { ...mockChecklistItem, title: "Updated" };
      prismaService.checklistItem.update.mockResolvedValue(updatedItem);

      const result = await service.update("checklist-1", { title: "Updated" });

      expect(result.title).toBe("Updated");
    });
  });

  describe("markAsCompleted", () => {
    it("should mark a checklist item as completed", async () => {
      prismaService.checklistItem.findUnique.mockResolvedValue(
        mockChecklistItem,
      );
      const completedItem = {
        ...mockChecklistItem,
        completed: true,
        completedAt: new Date(),
      };
      prismaService.checklistItem.update.mockResolvedValue(completedItem);

      const result = await service.markAsCompleted("checklist-1");

      expect(result.completed).toBe(true);
      expect(result.completedAt).toBeDefined();
    });
  });

  describe("remove", () => {
    it("should remove a checklist item", async () => {
      prismaService.checklistItem.findUnique.mockResolvedValue(
        mockChecklistItem,
      );
      prismaService.checklistItem.delete.mockResolvedValue(mockChecklistItem);

      await service.remove("checklist-1");

      expect(prismaService.checklistItem.delete).toHaveBeenCalledWith({
        where: { id: "checklist-1" },
      });
    });
  });

  describe("getStats", () => {
    it("should return checklist stats", async () => {
      prismaService.checklistItem.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // completed
        .mockResolvedValueOnce(2); // overdue
      prismaService.checklistItem.findMany.mockResolvedValue([]); // upcoming

      const result = await service.getStats();

      expect(result).toHaveProperty("totalItems", 10);
      expect(result).toHaveProperty("completedItems", 6);
      expect(result).toHaveProperty("completionRate", 60);
      expect(result).toHaveProperty("overdueItems", 2);
      expect(result).toHaveProperty("upcomingDeadlines");
    });
  });
});

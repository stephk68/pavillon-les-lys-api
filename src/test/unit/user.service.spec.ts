import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Role } from "@prisma/client";
import { PrismaService } from "../../common/services/prisma.service";
import { UserService } from "../../resources/user/user.service";

// Mock bcrypt
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
  compare: jest.fn().mockResolvedValue(true),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockedBcrypt = require("bcrypt");

describe("UserService", () => {
  let service: UserService;
  let prismaService: any;

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+1234567890",
    role: Role.CLIENT,
    password: "hashedPassword",
    isFirstLogin: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
  };

  const mockUserWithoutPassword = {
    id: "user-1",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+1234567890",
    role: Role.CLIENT,
    isFirstLogin: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      eventFolder: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      payment: {
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    const createUserDto = {
      email: "test@example.com",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
      phone: "+1234567890",
    };

    it("should register a user successfully", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.register(createUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        10,
      );
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it("should throw ConflictException if user already exists", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return all users with pagination", async () => {
      const mockUsers = [mockUserWithoutPassword];
      prismaService.user.findMany.mockResolvedValue(mockUsers);
      prismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockUsers,
        total: 1,
        skip: 0,
        take: 50,
      });
    });

    it("should filter users by role", async () => {
      const mockUsers = [mockUserWithoutPassword];
      prismaService.user.findMany.mockResolvedValue(mockUsers);
      prismaService.user.count.mockResolvedValue(1);

      await service.findAll({ role: Role.ADMIN });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.ADMIN },
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a user by id with eventFolders", async () => {
      const mockUserWithFolders = {
        ...mockUserWithoutPassword,
        eventFolders: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithFolders);

      const result = await service.findOne("user-1");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          select: expect.objectContaining({
            eventFolders: expect.any(Object),
          }),
        }),
      );
      expect(result).toEqual(mockUserWithFolders);
    });

    it("should throw NotFoundException if user not found", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByEmail", () => {
    it("should return a user by email", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail("test@example.com");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null if user not found", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    const updateUserDto = { firstName: "Jane", lastName: "Smith" };

    it("should update a user successfully", async () => {
      const mockUserWithFolders = {
        ...mockUserWithoutPassword,
        eventFolders: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithFolders);
      const updatedUser = { ...mockUserWithoutPassword, ...updateUserDto };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update("user-1", updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: updateUserDto,
        }),
      );
      expect(result).toEqual(updatedUser);
    });

    it("should throw ConflictException if email already exists", async () => {
      const updateWithEmail = { email: "existing@example.com" };
      const mockUserWithFolders = {
        ...mockUserWithoutPassword,
        eventFolders: [],
      };
      const existingUser = { ...mockUser, id: "different-user-id" };

      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUserWithFolders) // findOne
        .mockResolvedValueOnce(existingUser); // email check

      await expect(service.update("user-1", updateWithEmail)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("updatePassword", () => {
    it("should update password successfully", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedBcrypt.hash.mockResolvedValue("newHashedPassword");
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: "newHashedPassword",
      });

      await service.updatePassword("user-1", "currentPassword", "newPassword");

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        "currentPassword",
        mockUser.password,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith("newPassword", 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { password: "newHashedPassword" },
      });
    });

    it("should throw BadRequestException if current password is wrong", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(
        service.updatePassword("user-1", "wrongPassword", "newPassword"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should remove user successfully when no active folders", async () => {
      const mockUserWithFolders = {
        ...mockUserWithoutPassword,
        eventFolders: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithFolders);
      prismaService.eventFolder.findMany.mockResolvedValue([]);
      prismaService.user.delete.mockResolvedValue(mockUser);

      await service.remove("user-1");

      expect(prismaService.eventFolder.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          status: { in: ["QUOTED", "BOOKED", "READY"] },
        },
      });
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("should throw BadRequestException if user has active event folders", async () => {
      const mockUserWithFolders = {
        ...mockUserWithoutPassword,
        eventFolders: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithFolders);
      prismaService.eventFolder.findMany.mockResolvedValue([
        { id: "folder-1", status: "BOOKED" },
      ]);

      await expect(service.remove("user-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });
  });

  describe("validatePassword", () => {
    it("should validate password correctly", async () => {
      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await service.validatePassword(
        "plainPassword",
        "hashedPassword",
      );

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        "plainPassword",
        "hashedPassword",
      );
      expect(result).toBe(true);
    });
  });

  describe("countUsers", () => {
    it("should return user count", async () => {
      prismaService.user.count.mockResolvedValue(10);

      const result = await service.countUsers();

      expect(result).toBe(10);
    });
  });

  describe("searchUsers", () => {
    it("should search users by query", async () => {
      const mockUsers = [mockUserWithoutPassword];
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.searchUsers("john");

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: "john", mode: "insensitive" } },
            { lastName: { contains: "john", mode: "insensitive" } },
            { email: { contains: "john", mode: "insensitive" } },
          ],
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
        take: 20,
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe("getUserStats", () => {
    it("should return user stats with event folder data", async () => {
      const mockUserWithFolders = {
        ...mockUserWithoutPassword,
        eventFolders: [],
      };
      prismaService.user.findUnique.mockResolvedValue(mockUserWithFolders);
      prismaService.eventFolder.groupBy.mockResolvedValue([
        { status: "COMPLETED", _count: 3 },
      ]);
      prismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 500000 },
      });

      const result = await service.getUserStats("user-1");

      expect(result).toEqual({
        user: mockUserWithFolders,
        eventFolderStats: [{ status: "COMPLETED", _count: 3 }],
        totalSpent: 500000,
      });
    });
  });
});

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PrismaService } from "../../common/services/prisma.service";
import { MailService } from "../../mail/mail.service";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async register(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, "password" | "otpCode" | "otpExpiry">> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException("Un utilisateur avec cet email existe déjà");
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // Créer l'utilisateur avec le rôle CLIENT par défaut
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: Role.CLIENT,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isFirstLogin: true,
        lastLoginAt: true,
        resetToken: true,
        resetTokenExpiry: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    return user;
  }

  async createStaff(
    createStaffDto: CreateStaffDto,
  ): Promise<Omit<User, "password" | "otpCode" | "otpExpiry">> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createStaffDto.email },
    });

    if (existingUser) {
      throw new ConflictException("Un utilisateur avec cet email existe déjà");
    }

    // Valider que le rôle est ADMIN ou EVENT_MANAGER
    if (
      !createStaffDto.role ||
      (createStaffDto.role !== Role.ADMIN &&
        createStaffDto.role !== Role.EVENT_MANAGER)
    ) {
      throw new BadRequestException("Le rôle doit être ADMIN ou EVENT_MANAGER");
    }

    // Générer un mot de passe temporaire aléatoire sécurisé (jamais divulgué)
    const tempPassword = crypto.randomBytes(32).toString("hex");
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    // Créer l'utilisateur staff avec isFirstLogin=true (valeur par défaut)
    const user = await this.prisma.user.create({
      data: {
        email: createStaffDto.email,
        firstName: createStaffDto.firstName,
        lastName: createStaffDto.lastName,
        phone: createStaffDto.phone ?? "",
        password: hashedPassword,
        role: createStaffDto.role,
        isFirstLogin: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isFirstLogin: true,
        lastLoginAt: true,
        resetToken: true,
        resetTokenExpiry: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    // Envoyer l'email de bienvenue (fire-and-forget)
    this.mailService.sendStaffWelcomeEmail(user).catch(() => {});

    return user;
  }

  async findAll(options?: { role?: Role; skip?: number; take?: number }) {
    const { role, skip = 0, take = 50 } = options || {};

    const where = role ? { role } : undefined;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          isFirstLogin: true,
          lastLoginAt: true,
          resetToken: true,
          resetTokenExpiry: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          updatedBy: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(
    id: string,
  ): Promise<Omit<User, "password" | "otpCode" | "otpExpiry">> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isFirstLogin: true,
        lastLoginAt: true,
        resetToken: true,
        resetTokenExpiry: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        eventFolders: {
          select: {
            id: true,
            folderNumber: true,
            eventType: true,
            schedules: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
              },
            },
            status: true,
            attendees: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, "password" | "otpCode" | "otpExpiry">> {
    // Vérifier si l'utilisateur existe
    await this.findOne(id);

    // Si l'email est modifié, vérifier qu'il n'existe pas déjà
    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException("Cet email est déjà utilisé");
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isFirstLogin: true,
        lastLoginAt: true,
        resetToken: true,
        resetTokenExpiry: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    return updatedUser;
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException("Le mot de passe actuel est incorrect");
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });
  }

  async remove(id: string): Promise<void> {
    // Vérifier si l'utilisateur existe
    await this.findOne(id);

    // Vérifier s'il a des dossiers événement actifs
    const activeFolders = await this.prisma.eventFolder.findMany({
      where: {
        userId: id,
        status: { in: ["QUOTED", "BOOKED", "READY"] },
      },
    });

    if (activeFolders.length > 0) {
      throw new BadRequestException(
        "Impossible de supprimer cet utilisateur car il a des dossiers événement actifs",
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async getUserStats(id: string) {
    const user = await this.findOne(id);

    const stats = await this.prisma.eventFolder.groupBy({
      by: ["status"],
      where: { userId: id },
      _count: true,
    });

    const totalSpent = await this.prisma.payment.aggregate({
      where: {
        eventFolder: { userId: id },
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    });

    return {
      user,
      eventFolderStats: stats,
      totalSpent: totalSpent._sum.amount || 0,
    };
  }

  async searchUsers(
    query: string,
  ): Promise<Omit<User, "password" | "otpCode" | "otpExpiry">[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isFirstLogin: true,
        lastLoginAt: true,
        resetToken: true,
        resetTokenExpiry: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
      take: 20,
    });
  }

  async getUsersByRole(role: Role) {
    return this.findAll({ role });
  }

  async countUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  async toggleStatus(
    id: string,
  ): Promise<Omit<User, "password" | "otpCode" | "otpExpiry">> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isFirstLogin: true,
        lastLoginAt: true,
        resetToken: true,
        resetTokenExpiry: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
    });
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

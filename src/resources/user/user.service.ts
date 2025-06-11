import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async createStaff(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    // Valider que le rôle est ADMIN ou EVENT_MANAGER
    if (
      !createUserDto.role ||
      (createUserDto.role !== Role.ADMIN &&
        createUserDto.role !== Role.EVENT_MANAGER)
    ) {
      throw new BadRequestException('Le rôle doit être ADMIN ou EVENT_MANAGER');
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // Créer l'utilisateur staff
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: createUserDto.role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findAll(options?: {
    role?: Role;
    skip?: number;
    take?: number;
  }): Promise<Omit<User, 'password'>[]> {
    const { role, skip = 0, take = 50 } = options || {};

    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      skip,
      take,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        reservations: {
          select: {
            id: true,
            eventType: true,
            start: true,
            end: true,
            status: true,
            attendees: true,
          },
          orderBy: { createdAt: 'desc' },
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
  ): Promise<Omit<User, 'password'>> {
    // Vérifier si l'utilisateur existe
    await this.findOne(id);

    // Si l'email est modifié, vérifier qu'il n'existe pas déjà
    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Cet email est déjà utilisé');
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
        createdAt: true,
        updatedAt: true,
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
      throw new BadRequestException('Le mot de passe actuel est incorrect');
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

    // Vérifier s'il a des réservations actives
    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        userId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (activeReservations.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer cet utilisateur car il a des réservations actives',
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async getUserStats(id: string) {
    const user = await this.findOne(id);

    const stats = await this.prisma.reservation.groupBy({
      by: ['status'],
      where: { userId: id },
      _count: true,
    });

    const totalSpent = await this.prisma.payment.aggregate({
      where: {
        userId: id,
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      user,
      reservationStats: stats,
      totalSpent: totalSpent._sum.amount || 0,
    };
  }

  async searchUsers(query: string): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 20,
    });
  }

  async getUsersByRole(role: Role): Promise<Omit<User, 'password'>[]> {
    return this.findAll({ role });
  }

  async countUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

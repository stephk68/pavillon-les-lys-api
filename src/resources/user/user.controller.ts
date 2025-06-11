import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/permission.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

// DTO pour la mise à jour du mot de passe
export class UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Controller('users')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Route publique pour créer un client
  @Public()
  @Post('client')
  async createClient(@Body() createUserDto: CreateUserDto) {
    return this.userService.register({ ...createUserDto, role: Role.CLIENT });
  }

  // Seuls les admins peuvent créer du staff
  @Roles(Role.ADMIN)
  @Post('staff')
  async createStaff(@Body() createUserDto: CreateUserDto) {
    return this.userService.createStaff({
      ...createUserDto,
      role: createUserDto.role || Role.EVENT_MANAGER,
    });
  }

  // Admins et staff peuvent voir tous les utilisateurs
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get()
  async findAll(
    @Query('role') role?: Role,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const options = {
      role,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    };
    return this.userService.findAll(options);
  }

  // Route publique pour la recherche (ou restreindre selon vos besoins)
  @Public()
  @Get('search')
  async searchUsers(@Query('q') query: string) {
    return this.userService.searchUsers(query);
  }

  // Seuls les admins peuvent voir le nombre total d'utilisateurs
  @Roles(Role.ADMIN)
  @Get('count')
  async countUsers() {
    const count = await this.userService.countUsers();
    return { count };
  }

  // Admins et staff peuvent filtrer par rôle
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('by-role/:role')
  async getUsersByRole(@Param('role') role: Role) {
    return this.userService.getUsersByRole(role);
  }

  // Utilisateur peut voir son propre profil, admins et staff peuvent voir tous les profils
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    // Vérifier si l'utilisateur demande son propre profil ou s'il est admin/staff
    if (
      currentUser.id === id ||
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.EVENT_MANAGER
    ) {
      return this.userService.findOne(id);
    }
    throw new ForbiddenException(
      'Vous ne pouvez accéder qu’à votre propre profil',
    );
  }

  // Seuls les admins peuvent voir les statistiques des utilisateurs
  @Roles(Role.ADMIN)
  @Get(':id/stats')
  async getUserStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserStats(id);
  }

  // Utilisateur peut modifier son propre profil, admins peuvent modifier tous les profils
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    // Vérifier les permissions
    if (currentUser.id === id || currentUser.role === Role.ADMIN) {
      // Si ce n'est pas un admin qui modifie, empêcher la modification du rôle
      if (currentUser.id === id && currentUser.role !== Role.ADMIN) {
        const { role, ...updateData } = updateUserDto;
        return this.userService.update(id, updateData);
      }
      return this.userService.update(id, updateUserDto);
    }
    throw new ForbiddenException(
      'Vous ne pouvez modifier que votre propre profil ou celui d’un utilisateur si vous êtes admin',
    );
  }

  // Utilisateur peut changer son propre mot de passe
  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
    @CurrentUser() currentUser: any,
  ) {
    // Seul l'utilisateur lui-même peut changer son mot de passe
    if (currentUser.id !== id) {
      throw new ForbiddenException(
        'Vous ne pouvez changer que votre propre mot de passe',
      );
    }

    await this.userService.updatePassword(
      id,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }

  // Seuls les admins peuvent supprimer des utilisateurs
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.remove(id);
  }
}

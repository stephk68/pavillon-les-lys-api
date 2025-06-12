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
import { EventType, ReservationStatus, Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationService } from './reservation.service';

@Controller('reservations')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  // Utilisateurs authentifiés peuvent créer une réservation
  @Post()
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationService.create(createReservationDto, user.id);
  }

  // Admins et staff peuvent voir toutes les réservations, clients voient seulement les leurs
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: ReservationStatus,
    @Query('eventType') eventType?: EventType,
    @Query('userId') userId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options = {
      status,
      eventType,
      userId: user.role === Role.CLIENT ? user.id : userId, // Clients ne voient que leurs réservations
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.reservationService.findAll(options);
  }

  // Route publique pour vérifier la disponibilité
  @Public()
  @Get('availability')
  async checkAvailability(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const isAvailable = await this.reservationService.checkAvailability(
      new Date(start),
      new Date(end),
      excludeId,
    );
    return { available: isAvailable };
  }

  // Route publique pour obtenir les créneaux disponibles
  @Public()
  @Get('available-slots')
  async getAvailableSlots(@Query('date') date: string) {
    return this.reservationService.getAvailableSlots(new Date(date));
  }

  // Admins et staff peuvent voir les statistiques
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('stats')
  async getStats() {
    return this.reservationService.getReservationStats();
  }

  // Admins et staff peuvent voir les réservations à venir
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('upcoming')
  async getUpcoming(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return this.reservationService.getUpcomingReservations(daysNumber);
  }

  // Utilisateurs peuvent voir leurs propres réservations
  @Get('my-reservations')
  async getMyReservations(@CurrentUser() user: any) {
    return this.reservationService.getUserReservations(user.id);
  }

  // Admins et staff peuvent voir les réservations d'un utilisateur spécifique
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('user/:userId')
  async getUserReservations(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reservationService.getUserReservations(userId);
  }

  // Utilisateurs peuvent voir leurs réservations, admins et staff peuvent voir toutes
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const reservation = await this.reservationService.findOne(id);
    // Vérifier les permissions
    if (user.role === Role.CLIENT && reservation.userId !== user.id) {
      throw new ForbiddenException();
    }

    return reservation;
  }

  // Utilisateurs peuvent modifier leurs réservations, admins et staff peuvent modifier toutes
  // Utilisateurs peuvent modifier leurs réservations, admins et staff peuvent modifier toutes
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentUser() user: any,
  ) {
    const reservation = await this.reservationService.findOne(id);
    // Vérifier les permissions
    if (user.role === Role.CLIENT) {
      if (reservation.userId !== user.id) {
        throw new ForbiddenException();
      }
      // Les clients ne peuvent pas modifier le statut
      const { status, ...updateData } = updateReservationDto;
      return this.reservationService.update(id, updateData);
    }

    return this.reservationService.update(id, updateReservationDto);
  }
  // Seuls les admins et staff peuvent confirmer une réservation
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.confirm(id);
  }

  // Utilisateurs peuvent annuler leurs réservations, admins et staff peuvent annuler toutes
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.role === Role.CLIENT ? user.id : undefined;
    return this.reservationService.cancel(id, userId);
  }

  // Seuls les admins et staff peuvent marquer comme terminé
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.complete(id);
  }

  // Seuls les admins et staff peuvent changer le statut directement
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ReservationStatus,
  ) {
    return this.reservationService.updateStatus(id, status);
  }

  // Seuls les admins peuvent supprimer une réservation
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.reservationService.remove(id);
  }
}

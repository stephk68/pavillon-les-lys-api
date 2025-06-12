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
import { PaymentStatus, PaymentType, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/permission.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Utilisateurs peuvent créer un paiement pour leurs réservations
  @Post()
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.create(createPaymentDto, user.id);
  }

  // Admins et staff peuvent voir tous les paiements, clients voient seulement les leurs
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: PaymentStatus,
    @Query('type') type?: PaymentType,
    @Query('userId') userId?: string,
    @Query('reservationId') reservationId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options = {
      status,
      type,
      userId: user.role === Role.CLIENT ? user.id : userId, // Clients ne voient que leurs paiements
      reservationId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.paymentService.findAll(options);
  }

  // Seuls les admins et staff peuvent voir les statistiques
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('stats')
  async getStats() {
    return this.paymentService.getPaymentStats();
  }

  // Seuls les admins et staff peuvent voir les revenus mensuels
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('revenue/:year/:month')
  async getMonthlyRevenue(
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.paymentService.getMonthlyRevenue(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  // Seuls les admins et staff peuvent voir les paiements en attente
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('pending')
  async getPendingPayments() {
    return this.paymentService.getPendingPayments();
  }

  // Seuls les admins et staff peuvent voir les paiements échoués
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('failed')
  async getFailedPayments() {
    return this.paymentService.getFailedPayments();
  }

  // Utilisateurs peuvent voir leurs propres paiements
  @Get('my-payments')
  async getMyPayments(@CurrentUser() user: any) {
    return this.paymentService.getUserPayments(user.id);
  }

  // Admins et staff peuvent voir les paiements d'un utilisateur spécifique
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('user/:userId')
  async getUserPayments(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.paymentService.getUserPayments(userId);
  }

  // Admins et staff peuvent voir les paiements d'une réservation
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('reservation/:reservationId')
  async getReservationPayments(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ) {
    return this.paymentService.getReservationPayments(reservationId);
  }

  // Utilisateurs peuvent voir leurs paiements, admins et staff peuvent voir tous
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const payment = await this.paymentService.findOne(id);
    // Vérifier les permissions
    if (user.role === Role.CLIENT && payment.userId !== user.id) {
      throw new ForbiddenException();
    }

    return payment;
  }

  // Générer une facture pour un paiement
  @Get(':id/invoice')
  async createInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const payment = await this.paymentService.findOne(id);

    // Vérifier les permissions
    if (user.role === Role.CLIENT && payment.userId !== user.id) {
      throw new ForbiddenException();
    }

    return this.paymentService.createInvoice(id);
  }

  // Seuls les admins peuvent modifier les paiements
  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentService.update(id, updatePaymentDto);
  }

  // Traiter un paiement (utilisateur peut traiter ses propres paiements)
  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  async processPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('paymentMethod') paymentMethod: any,
    @CurrentUser() user: any,
  ) {
    const payment = await this.paymentService.findOne(id);

    // Vérifier les permissions
    if (user.role === Role.CLIENT && payment.userId !== user.id) {
      throw new ForbiddenException();
    }

    return this.paymentService.processPayment(id, paymentMethod);
  }

  // Seuls les admins et staff peuvent marquer comme payé
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markAsPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.markAsPaid(id);
  }

  // Seuls les admins et staff peuvent marquer comme échoué
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/mark-failed')
  @HttpCode(HttpStatus.OK)
  async markAsFailed(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.markAsFailed(id);
  }

  // Seuls les admins peuvent rembourser
  @Roles(Role.ADMIN)
  @Patch(':id/refund')
  @HttpCode(HttpStatus.OK)
  async refund(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.refund(id);
  }

  // Seuls les admins et staff peuvent changer le statut directement
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: PaymentStatus,
  ) {
    return this.paymentService.updateStatus(id, status);
  }

  // Seuls les admins peuvent supprimer un paiement
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.paymentService.remove(id);
  }
}

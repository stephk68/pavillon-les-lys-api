import {
  BadRequestException,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticationGuard } from '../../common/guards/authentication.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteService } from './quote.service';

@Controller('quotes')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  // Seuls les admins et staff peuvent créer des devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post()
  async create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.create(createQuoteDto);
  }

  // Admins et staff peuvent voir tous les devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get()
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('hasReservation') hasReservation?: string,
  ) {
    const options = {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      hasReservation: hasReservation ? hasReservation === 'true' : undefined,
    };
    return this.quoteService.findAll(options);
  }

  // Seuls les admins et staff peuvent voir les statistiques
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('stats')
  async getStats() {
    return this.quoteService.getQuoteStats();
  }

  // Obtenir un devis par ID de réservation
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get('reservation/:reservationId')
  async findByReservationId(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ) {
    return this.quoteService.findByReservationId(reservationId);
  }

  // Détails d'un devis spécifique
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const quote = await this.quoteService.findOne(id);

    // Les clients ne peuvent voir que les devis de leurs réservations
    if (user.role === Role.CLIENT) {
      if (!quote.reservation || quote.reservation.userId !== user.id) {
        throw new ForbiddenException();
      }
    }

    return quote;
  }

  // Exporter un devis
  @Get(':id/export')
  async exportQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const quote = await this.quoteService.findOne(id);

    // Vérifier les permissions
    if (user.role === Role.CLIENT) {
      if (!quote.use || quote.reservation.userId !== user.id) {
        throw new ForbiddenException();
      }
    }

    return this.quoteService.exportQuote(id);
  }

  // Seuls les admins et staff peuvent modifier les devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
  ) {
    return this.quoteService.update(id, updateQuoteDto);
  }

  // Dupliquer un devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post(':id/duplicate')
  async duplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.quoteService.duplicate(id);
  }

  // Lier un devis à une réservation
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/link-reservation/:reservationId')
  @HttpCode(HttpStatus.OK)
  async linkToReservation(
    @Param('id', ParseUUIDPipe) quoteId: string,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ) {
    return this.quoteService.linkToReservation(quoteId, reservationId);
  }

  // Délier un devis d'une réservation
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/unlink-reservation')
  @HttpCode(HttpStatus.OK)
  async unlinkFromReservation(@Param('id', ParseUUIDPipe) id: string) {
    return this.quoteService.unlinkFromReservation(id);
  }

  // Ajouter un item au devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post(':id/items')
  async addItem(@Param('id', ParseUUIDPipe) id: string, @Body() item: any) {
    return this.quoteService.addItem(id, item);
  }

  // Modifier un item du devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(':id/items/:itemIndex')
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemIndex') itemIndex: string,
    @Body() updatedItem: any,
  ) {
    const index = parseInt(itemIndex, 10);
    if (isNaN(index)) {
      throw new BadRequestException();
    }
    return this.quoteService.updateItem(id, index, updatedItem);
  }

  // Supprimer un item du devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Delete(':id/items/:itemIndex')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemIndex') itemIndex: string,
  ) {
    const index = parseInt(itemIndex, 10);
    if (isNaN(index)) {
      throw new BadRequestException();
    }
    return this.quoteService.removeItem(id, index);
  }

  // Seuls les admins peuvent supprimer des devis
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.quoteService.remove(id);
  }
}

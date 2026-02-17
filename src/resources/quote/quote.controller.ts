import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Res,
    UseGuards,
} from "@nestjs/common";
import { QuoteStatus, Role } from "@prisma/client";
import { Response } from "express";
import { Roles } from "src/common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { ConvertToReservationDto } from "./dto/convert-to-reservation.dto";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteDto } from "./dto/update-quote.dto";
import { QuoteService } from "./quote.service";

@Controller("quotes")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  // ============================================================================
  // CRUD de base
  // ============================================================================

  // Seuls les admins et staff peuvent créer des devis (lié à une réservation)
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post()
  async create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.create(createQuoteDto);
  }

  // Admins et staff peuvent voir tous les devis
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get()
  async findAll(
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @Query("status") status?: QuoteStatus,
    @Query("userId") userId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    const options = {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      status,
      userId,
      startDate,
      endDate,
    };

    return this.quoteService.findAll(options);
  }

  @Get("stats")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async getStats() {
    return this.quoteService.getQuoteStats();
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.quoteService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateQuoteDto: UpdateQuoteDto
  ) {
    return this.quoteService.update(id, updateQuoteDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.quoteService.delete(id);
  }

  // ============================================================================
  // Actions sur les devis
  // ============================================================================

  @Post(":id/duplicate")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async duplicate(@Param("id", ParseUUIDPipe) id: string) {
    return this.quoteService.duplicate(id);
  }

  @Post(":id/send")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async sendQuote(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("recipientEmail") recipientEmail?: string
  ) {
    return this.quoteService.sendQuoteWithPdf(id, recipientEmail);
  }

  @Patch(":id/approve")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async approve(@Param("id", ParseUUIDPipe) id: string) {
    return this.quoteService.approveQuote(id);
  }

  @Patch(":id/reject")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("reason") reason: string
  ) {
    if (!reason) {
      throw new BadRequestException("La raison du rejet est requise");
    }
    return this.quoteService.rejectQuote(id, reason);
  }

  @Get(":id/export")
  async export(@Param("id", ParseUUIDPipe) id: string) {
    return this.quoteService.exportQuote(id);
  }

  @Get(":id/pdf")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async generatePdf(
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.quoteService.generatePdf(id);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Devis-${id.slice(0, 8)}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  // ============================================================================
  // SALES FUNNEL - Mode Devis Standalone
  // ============================================================================

  /**
   * Crée un devis standalone (sans réservation existante)
   * Les détails de l'événement sont stockés dans eventDetails
   * POST /quotes/standalone
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post("standalone")
  async createStandalone(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.createStandalone(createQuoteDto);
  }

  /**
   * Convertit un devis ACCEPTED en réservation
   * Vérifie la disponibilité et crée la réservation
   * POST /quotes/:id/convert-to-reservation
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Post(":id/convert-to-reservation")
  async convertToReservation(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto?: ConvertToReservationDto
  ) {
    return this.quoteService.convertToReservation(id, dto);
  }

  /**
   * Télécharge le PDF du devis (alias de /pdf pour clarté)
   * GET /quotes/:id/download
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get(":id/download")
  async downloadPdf(
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.quoteService.generatePdf(id);
    const quote = await this.quoteService.findOne(id);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Devis-${quote.number}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}


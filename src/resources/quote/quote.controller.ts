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
  UseGuards,
} from "@nestjs/common";
import { QuoteStatus, Role } from "@prisma/client";
import { Roles } from "src/common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteDto } from "./dto/update-quote.dto";
import { QuoteService } from "./quote.service";

@Controller("quotes")
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
    return this.quoteService.sendQuote(id, recipientEmail);
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
  async generatePdf(@Param("id", ParseUUIDPipe) id: string) {
    // TODO: Implémenter la génération de PDF
    throw new BadRequestException("Génération de PDF non encore implémentée");
  }
}

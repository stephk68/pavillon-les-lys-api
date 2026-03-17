import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { EventStatus, EventType, Role } from "@prisma/client";
import { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/permission.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { PdfService } from "../../common/services/pdf.service";
import { CreateEventFolderDto } from "./dto/create-event-folder.dto";
import { CreateReservationRequestDto } from "./dto/create-reservation-request.dto";
import { AddEquipmentDto, UpdateEquipmentDto } from "./dto/equipment.dto";
import { TransitionStatusDto } from "./dto/transition-status.dto";
import { UpdateEventFolderDto } from "./dto/update-event-folder.dto";
import { EventFolderService } from "./event-folder.service";

@Controller("event-folders")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class EventFolderController {
  constructor(
    private readonly eventFolderService: EventFolderService,
    private readonly pdfService: PdfService,
  ) {}

  // ==================== CRUD ====================

  @Post()
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  create(@Body() dto: CreateEventFolderDto, @CurrentUser() user: any) {
    return this.eventFolderService.create(dto, user.id);
  }

  @Post("request")
  @Public()
  createPublicRequest(@Body() dto: CreateReservationRequestDto) {
    return this.eventFolderService.createPublicRequest(dto);
  }

  @Get()
  findAll(
    @Query("status") status?: EventStatus,
    @Query("eventType") eventType?: EventType,
    @Query("userId") userId?: string,
    @Query("search") search?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @CurrentUser() user?: any,
  ) {
    // Scope: CLIENT sees only their own events
    const effectiveUserId = user?.role === Role.CLIENT ? user.id : userId;

    return this.eventFolderService.findAll({
      status,
      eventType,
      userId: effectiveUserId,
      search,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get("calendar")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getCalendar(@Query("month") month?: string, @Query("year") year?: string) {
    return this.eventFolderService.getCalendar(
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get("stats")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getStats() {
    return this.eventFolderService.getStats();
  }

  @Get("upcoming")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getUpcoming(@Query("days") days?: string) {
    return this.eventFolderService.getUpcoming(
      days ? parseInt(days, 10) : undefined,
    );
  }

  @Get("my-events")
  getMyEvents(@CurrentUser() user: any) {
    return this.eventFolderService.findAll({ userId: user.id });
  }

  @Get("availability")
  @Public()
  async checkAvailability(
    @Query("schedules") schedulesJson?: string,
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    let schedules: any[] = [];
    if (schedulesJson) {
      try {
        schedules = JSON.parse(schedulesJson);
      } catch (e) {
        // ignore
      }
    } else if (start && end) {
      schedules = [
        { date: new Date(start), startTime: "00:00", endTime: "23:59" },
      ];
    }
    const isAvailable =
      await this.eventFolderService.checkAvailability(schedules);
    return { available: isAvailable };
  }

  @Get("booked-dates")
  @Public()
  async getBookedDates(
    @Query("month") month?: string,
    @Query("year") year?: string,
  ) {
    return this.eventFolderService.getBookedDates(
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    const folder = await this.eventFolderService.findOne(id);
    // CLIENT can only see their own
    if (user.role === Role.CLIENT && folder.userId !== user.id) {
      throw new ForbiddenException("Accès refusé");
    }
    return folder;
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateEventFolderDto,
    @CurrentUser() user: any,
  ) {
    return this.eventFolderService.update(id, dto, user.id);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.eventFolderService.remove(id);
  }

  // ==================== STATUS TRANSITIONS ====================

  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  transitionStatus(
    @Param("id") id: string,
    @Body() dto: TransitionStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.eventFolderService.transitionStatus(id, dto.status, user.id);
  }

  // ==================== FINANCIAL ====================

  @Get(":id/financial-summary")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getFinancialSummary(@Param("id") id: string) {
    return this.eventFolderService.getFinancialSummary(id);
  }

  @Post(":id/generate-payments")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  generatePayments(@Param("id") id: string, @CurrentUser() user: any) {
    return this.eventFolderService.generateDefaultPayments(id, user.id);
  }

  // ==================== CLIENT ACTIONS ====================

  @Post(":id/accept-quote")
  async acceptQuote(@Param("id") id: string, @CurrentUser() user: any) {
    const folder = await this.eventFolderService.findOne(id);
    if (user.role === Role.CLIENT && folder.userId !== user.id) {
      throw new ForbiddenException("Accès refusé");
    }
    if (folder.status !== "QUOTED") {
      throw new BadRequestException(
        "Le devis ne peut être accepté que lorsque le statut est QUOTED",
      );
    }
    return this.eventFolderService.transitionStatus(
      id,
      EventStatus.BOOKED,
      user.id,
    );
  }

  @Get(":id/quote-pdf")
  async getQuotePdf(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const folder = await this.eventFolderService.findOne(id);
    if (user.role === Role.CLIENT && folder.userId !== user.id) {
      throw new ForbiddenException("Accès refusé");
    }
    if (!folder.items || folder.items.length === 0) {
      throw new BadRequestException("Aucun item dans le devis");
    }

    const buffer = await this.pdfService.generateQuotePdf({
      number: folder.folderNumber,
      date: new Date(folder.createdAt).toLocaleDateString("fr-FR"),
      validUntil: folder.validUntil
        ? new Date(folder.validUntil).toLocaleDateString("fr-FR")
        : "Non spécifié",
      client: {
        name: `${folder.user.firstName} ${folder.user.lastName}`,
        email: folder.user.email,
        phone: folder.user.phone || undefined,
      },
      items: folder.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      totalHT: Number(folder.totalHT),
      vatRate: Number(folder.vatRate),
      totalTTC: Number(folder.totalTTC),
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Devis_${folder.folderNumber}.pdf"`,
    });
    res.send(buffer);
  }

  @Get(":id/contract-pdf")
  async getContractPdf(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const folder = await this.eventFolderService.findOne(id);
    if (user.role === Role.CLIENT && folder.userId !== user.id) {
      throw new ForbiddenException("Accès refusé");
    }

    const schedeText =
      folder.schedules
        ?.map(
          (s) =>
            `${new Date(s.date).toLocaleDateString("fr-FR")} de ${s.startTime} à ${s.endTime}`,
        )
        .join(", ") || "À définir";

    const buffer = await this.pdfService.generateContractPdf({
      folderNumber: folder.folderNumber,
      clientName: `${folder.user.firstName} ${folder.user.lastName}`,
      clientEmail: folder.user.email,
      clientPhone: folder.user.phone || "",
      eventType: folder.eventType,
      attendees: folder.attendees,
      schedules: schedeText,
      totalTTC: Number(folder.totalTTC),
      depositAmount: Number(folder.depositAmount || 0),
      cautionAmount: Number(folder.cautionAmount || 0),
      date: new Date().toLocaleDateString("fr-FR"),
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Contrat_${folder.folderNumber}.pdf"`,
    });
    res.send(buffer);
  }

  // ==================== EQUIPMENT ====================

  @Post(":id/equipments")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  addEquipment(@Param("id") id: string, @Body() dto: AddEquipmentDto) {
    return this.eventFolderService.addEquipment(id, dto);
  }

  @Patch(":id/equipments/:equipmentId")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  updateEquipment(
    @Param("id") id: string,
    @Param("equipmentId") equipmentId: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.eventFolderService.updateEquipment(id, equipmentId, dto);
  }

  @Delete(":id/equipments/:equipmentId")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  removeEquipment(
    @Param("id") id: string,
    @Param("equipmentId") equipmentId: string,
  ) {
    return this.eventFolderService.removeEquipment(id, equipmentId);
  }

  @Post(":id/equipments/:equipmentId/return")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  returnEquipment(
    @Param("id") id: string,
    @Param("equipmentId") equipmentId: string,
    @Body() body: { returnedQuantity: number; notes?: string },
  ) {
    return this.eventFolderService.returnEquipment(
      id,
      equipmentId,
      body.returnedQuantity,
      body.notes,
    );
  }
}

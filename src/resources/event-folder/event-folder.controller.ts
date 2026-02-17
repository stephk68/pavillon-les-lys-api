import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { EventStatus, EventType, Role } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/permission.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { CreateEventFolderDto } from "./dto/create-event-folder.dto";
import { AddEquipmentDto, UpdateEquipmentDto } from "./dto/equipment.dto";
import { TransitionStatusDto } from "./dto/transition-status.dto";
import { UpdateEventFolderDto } from "./dto/update-event-folder.dto";
import { EventFolderService } from "./event-folder.service";

@Controller("event-folders")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class EventFolderController {
  constructor(private readonly eventFolderService: EventFolderService) {}

  // ==================== CRUD ====================

  @Post()
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  create(@Body() dto: CreateEventFolderDto, @CurrentUser() user: any) {
    return this.eventFolderService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query("status") status?: EventStatus,
    @Query("eventType") eventType?: EventType,
    @Query("userId") userId?: string,
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
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get("calendar")
  @Public()
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
    @Query("start") start: string,
    @Query("end") end: string,
  ) {
    const isAvailable = await this.eventFolderService.checkAvailability(
      new Date(start),
      new Date(end),
    );
    return { available: isAvailable };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    const folder = await this.eventFolderService.findOne(id);
    // CLIENT can only see their own
    if (user.role === Role.CLIENT && folder.userId !== user.id) {
      throw new Error("Accès refusé");
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

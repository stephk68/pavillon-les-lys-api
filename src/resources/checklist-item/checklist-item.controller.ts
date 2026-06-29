import {
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
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { ChecklistItemService } from "./checklist-item.service";
import { CreateChecklistItemDto } from "./dto/create-checklist-item.dto";
import { UpdateChecklistItemDto } from "./dto/update-checklist-item.dto";

@Controller("checklist-items")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Roles(Role.ADMIN, Role.EVENT_MANAGER) // Toutes les routes sont admin/staff uniquement
export class ChecklistItemController {
  constructor(private readonly checklistItemService: ChecklistItemService) {}

  /**
   * POST /checklist-item
   * Créer un nouvel élément de checklist
   */
  @Post()
  async create(@Body() createChecklistItemDto: CreateChecklistItemDto) {
    return this.checklistItemService.create(createChecklistItemDto);
  }

  /**
   * GET /checklist-item
   * Récupérer tous les éléments avec filtres
   */
  @Get()
  async findAll(
    @Query("eventFolderId") eventFolderId?: string,
    @Query("completed") completed?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    const options = {
      eventFolderId,
      completed: completed !== undefined ? completed === "true" : undefined,
      assignedTo,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    };

    return this.checklistItemService.findAll(options);
  }

  /**
   * GET /checklist-item/stats
   * Statistiques de complétion
   */
  @Get("stats")
  async getStats(@Query("eventFolderId") eventFolderId?: string) {
    return this.checklistItemService.getStats(eventFolderId);
  }

  /**
   * GET /checklist-item/event-folder/:eventFolderId
   * Éléments d'un dossier événement spécifique
   */
  @Get("event-folder/:eventFolderId")
  async findByEventFolder(
    @Param("eventFolderId", ParseUUIDPipe) eventFolderId: string,
  ) {
    return this.checklistItemService.findByEventFolder(eventFolderId);
  }

  /**
   * GET /checklist-item/:id
   * Récupérer un élément par ID
   */
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.checklistItemService.findOne(id);
  }

  /**
   * PATCH /checklist-item/:id
   * Mettre à jour un élément
   */
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateChecklistItemDto: UpdateChecklistItemDto,
  ) {
    return this.checklistItemService.update(id, updateChecklistItemDto);
  }

  /**
   * PATCH /checklist-item/:id/complete
   * Marquer comme terminé
   */
  @Patch(":id/complete")
  @HttpCode(HttpStatus.OK)
  async markAsCompleted(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("notes") notes?: string,
  ) {
    return this.checklistItemService.markAsCompleted(id, notes);
  }

  /**
   * PATCH /checklist-item/:id/incomplete
   * Marquer comme non terminé
   */
  @Patch(":id/incomplete")
  @HttpCode(HttpStatus.OK)
  async markAsIncomplete(@Param("id", ParseUUIDPipe) id: string) {
    return this.checklistItemService.markAsIncomplete(id);
  }

  /**
   * PATCH /checklist-item/event-folder/:eventFolderId/reorder
   * Réorganiser les éléments d'un dossier
   */
  @Patch("event-folder/:eventFolderId/reorder")
  async reorderItems(
    @Param("eventFolderId", ParseUUIDPipe) eventFolderId: string,
    @Body("itemIds") itemIds: string[],
  ) {
    return this.checklistItemService.reorderItems(eventFolderId, itemIds);
  }

  /**
   * DELETE /checklist-item/:id
   * Supprimer un élément
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.checklistItemService.remove(id);
  }
}

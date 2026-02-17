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
import { ChekclistItemService } from "./chekclist-item.service";
import { CreateChekclistItemDto } from "./dto/create-chekclist-item.dto";
import { UpdateChekclistItemDto } from "./dto/update-chekclist-item.dto";

@Controller("checklist-item")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Roles(Role.ADMIN, Role.EVENT_MANAGER) // Toutes les routes sont admin/staff uniquement
export class ChekclistItemController {
  constructor(private readonly chekclistItemService: ChekclistItemService) {}

  /**
   * POST /checklist-item
   * Créer un nouvel élément de checklist
   */
  @Post()
  async create(@Body() createChekclistItemDto: CreateChekclistItemDto) {
    return this.chekclistItemService.create(createChekclistItemDto);
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

    return this.chekclistItemService.findAll(options);
  }

  /**
   * GET /checklist-item/stats
   * Statistiques de complétion
   */
  @Get("stats")
  async getStats(@Query("eventFolderId") eventFolderId?: string) {
    return this.chekclistItemService.getStats(eventFolderId);
  }

  /**
   * GET /checklist-item/event-folder/:eventFolderId
   * Éléments d'un dossier événement spécifique
   */
  @Get("event-folder/:eventFolderId")
  async findByEventFolder(
    @Param("eventFolderId", ParseUUIDPipe) eventFolderId: string,
  ) {
    return this.chekclistItemService.findByEventFolder(eventFolderId);
  }

  /**
   * GET /checklist-item/:id
   * Récupérer un élément par ID
   */
  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.chekclistItemService.findOne(id);
  }

  /**
   * PATCH /checklist-item/:id
   * Mettre à jour un élément
   */
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateChekclistItemDto: UpdateChekclistItemDto,
  ) {
    return this.chekclistItemService.update(id, updateChekclistItemDto);
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
    return this.chekclistItemService.markAsCompleted(id, notes);
  }

  /**
   * PATCH /checklist-item/:id/incomplete
   * Marquer comme non terminé
   */
  @Patch(":id/incomplete")
  @HttpCode(HttpStatus.OK)
  async markAsIncomplete(@Param("id", ParseUUIDPipe) id: string) {
    return this.chekclistItemService.markAsIncomplete(id);
  }

  /**
   * PATCH /checklist-item/event-folder/:eventFolderId/reorder
   * Réorganiser les éléments d'un dossier événement
   */
  @Patch("event-folder/:eventFolderId/reorder")
  @HttpCode(HttpStatus.OK)
  async reorderItems(
    @Param("eventFolderId", ParseUUIDPipe) eventFolderId: string,
    @Body("itemIds") itemIds: string[],
  ) {
    if (!itemIds || !Array.isArray(itemIds)) {
      throw new Error("itemIds doit être un tableau d'identifiants");
    }
    return this.chekclistItemService.reorderItems(eventFolderId, itemIds);
  }

  /**
   * DELETE /checklist-item/:id
   * Supprimer un élément (admin uniquement)
   */
  @Roles(Role.ADMIN)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.chekclistItemService.remove(id);
  }
}

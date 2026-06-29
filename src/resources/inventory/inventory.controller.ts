import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { InventoryItemStatus, InventoryItemType, Role } from "@prisma/client";
import { Roles } from "../../common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { CreateInventoryItemDto } from "./dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "./dto/update-inventory-item.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * GET /inventory
   * Liste tous les équipements avec filtres
   */
  @Get()
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async findAll(
    @Query("type") type?: InventoryItemType,
    @Query("status") status?: InventoryItemStatus,
    @Query("category") category?: string,
    @Query("search") search?: string
  ) {
    return this.inventoryService.findAll({
      type,
      status,
      category,
      search,
    });
  }

  /**
   * GET /inventory/stats
   * Statistiques d'inventaire
   */
  @Get("stats")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async getStats() {
    return this.inventoryService.getStats();
  }

  /**
   * GET /inventory/:id
   * Récupère un équipement par ID
   */
  @Get(":id")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async findOne(@Param("id") id: string) {
    return this.inventoryService.findOne(id);
  }

  /**
   * POST /inventory
   * Crée un nouvel équipement
   */
  @Post()
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreateInventoryItemDto) {
    return this.inventoryService.create(data);
  }

  /**
   * PUT /inventory/:id
   * Met à jour un équipement
   */
  @Put(":id")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async update(@Param("id") id: string, @Body() data: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, data);
  }

  /**
   * DELETE /inventory/:id
   * Supprime un équipement
   */
  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    await this.inventoryService.delete(id);
  }

  /**
   * GET /inventory/:id/availability
   * Vérifie la disponibilité d'un équipement pour une période
   */
  @Get(":id/availability")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  async checkAvailability(
    @Param("id") id: string,
    @Query("start") start: string,
    @Query("end") end: string
  ) {
    return this.inventoryService.checkAvailability(
      id,
      new Date(start),
      new Date(end)
    );
  }
}

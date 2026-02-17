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
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { UpdateFeedbackDto } from "./dto/update-feedback.dto";
import { FeedbackService } from "./feedback.service";

@Controller("feedback")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * POST /feedback
   * Créer un nouveau feedback (utilisateur authentifié)
   */
  @Post()
  async create(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @CurrentUser() user: any,
  ) {
    return this.feedbackService.create(createFeedbackDto, user.id);
  }

  /**
   * GET /feedback
   * Récupérer tous les feedbacks avec filtres (admin/staff)
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get()
  async findAll(
    @Query("userId") userId?: string,
    @Query("eventFolderId") eventFolderId?: string,
    @Query("rating") rating?: string,
    @Query("isRead") isRead?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const options = {
      userId,
      eventFolderId,
      rating: rating ? parseInt(rating, 10) : undefined,
      isRead: isRead !== undefined ? isRead === "true" : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.feedbackService.findAll(options);
  }

  /**
   * GET /feedback/stats
   * Obtenir les statistiques des feedbacks (admin/staff)
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get("stats")
  async getStats() {
    return this.feedbackService.getStats();
  }

  /**
   * GET /feedback/unread
   * Obtenir les feedbacks non lus (admin/staff)
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Get("unread")
  async getUnreadFeedbacks() {
    return this.feedbackService.getUnreadFeedbacks();
  }

  /**
   * GET /feedback/:id
   * Récupérer un feedback par ID
   * Owner ou Admin/Staff peuvent voir
   */
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const feedback = await this.feedbackService.findOne(id);

    // Vérifier les permissions
    if (user.role === Role.CLIENT && feedback.userId !== user.id) {
      throw new ForbiddenException();
    }

    return feedback;
  }

  /**
   * PATCH /feedback/:id
   * Mettre à jour un feedback
   * Owner peut modifier ses propres feedbacks
   */
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
    @CurrentUser() user: any,
  ) {
    // Admin peut tout modifier, sinon vérification du propriétaire
    if (user.role === Role.CLIENT) {
      return this.feedbackService.update(id, updateFeedbackDto, user.id);
    }
    return this.feedbackService.update(id, updateFeedbackDto);
  }

  /**
   * PATCH /feedback/:id/respond
   * Répondre à un feedback (admin/staff)
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(":id/respond")
  @HttpCode(HttpStatus.OK)
  async respondToFeedback(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("response") response: string,
  ) {
    if (!response?.trim()) {
      throw new ForbiddenException("La réponse ne peut pas être vide");
    }
    return this.feedbackService.respondToFeedback(id, response);
  }

  /**
   * PATCH /feedback/:id/read
   * Marquer un feedback comme lu (admin/staff)
   */
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param("id", ParseUUIDPipe) id: string) {
    return this.feedbackService.markAsRead(id);
  }

  /**
   * DELETE /feedback/:id
   * Supprimer un feedback (admin uniquement)
   */
  @Roles(Role.ADMIN)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.feedbackService.remove(id);
  }
}

import {
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PaymentStatus, PaymentType, Role } from "@prisma/client";
import { Response } from "express";
import { diskStorage } from "multer";
import { extname } from "path";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/permission.decorator";
import { AuthenticationGuard } from "../../common/guards/authentication.guard";
import { AuthorizationGuard } from "../../common/guards/authorization.guard";
import { CreatePaymentDto, UpdatePaymentDto } from "./dto/payment.dto";
import { PaymentService } from "./payment.service";

@Controller("payments")
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentService.create(dto, user);
  }

  @Get()
  findAll(
    @Query("status") status?: PaymentStatus,
    @Query("type") type?: PaymentType,
    @Query("eventFolderId") eventFolderId?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @CurrentUser() user?: any,
  ) {
    const userId = user?.role === Role.CLIENT ? user.id : undefined;

    return this.paymentService.findAll({
      status,
      type,
      eventFolderId,
      userId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get("stats")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getStats() {
    return this.paymentService.getStats();
  }

  @Get("revenue/:year/:month")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getMonthlyRevenue(
    @Param("year") year: string,
    @Param("month") month: string,
  ) {
    return this.paymentService.getMonthlyRevenue(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get("revenue/:year")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getYearlyRevenue(@Param("year") year: string) {
    return this.paymentService.getYearlyRevenue(parseInt(year, 10));
  }

  @Get("pending")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getPending() {
    return this.paymentService.getPendingPayments();
  }

  @Get("my-payments")
  getMyPayments(@CurrentUser() user: any) {
    return this.paymentService.getUserPayments(user.id);
  }

  @Get("event-folder/:eventFolderId")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  getByEventFolder(@Param("eventFolderId") eventFolderId: string) {
    return this.paymentService.getEventFolderPayments(eventFolderId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.paymentService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentService.update(id, dto);
  }

  @Patch(":id/mark-paid")
  @Roles(Role.ADMIN, Role.EVENT_MANAGER)
  markAsPaid(@Param("id") id: string) {
    return this.paymentService.markAsPaid(id);
  }

  @Patch(":id/refund")
  @Roles(Role.ADMIN)
  refund(@Param("id") id: string) {
    return this.paymentService.refund(id);
  }

  @Get(":id/invoice-pdf")
  async getInvoicePdf(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.paymentService.generateInvoicePdf(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${id}.pdf"`,
    });
    res.send(buffer);
  }

  @Post(":id/upload-proof")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/proofs",
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|pdf)$/i;
        if (!allowed.test(extname(file.originalname))) {
          return cb(
            new Error("Seuls les fichiers JPG, PNG et PDF sont acceptés"),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadProof(
    @Param("id") id: string,
    @UploadedFile()
    file: { filename: string; originalname: string; size: number },
    @CurrentUser() user: any,
  ) {
    const payment = await this.paymentService.findOne(id);

    // CLIENT can only upload for their own payments
    if (user.role === Role.CLIENT && payment.userId !== user.id) {
      throw new ForbiddenException("Accès refusé");
    }

    return this.paymentService.updateProofDocument(id, file.filename);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.paymentService.remove(id);
  }
}

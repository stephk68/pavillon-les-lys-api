import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import { PdfService } from "../../common/services/pdf.service";
import { PrismaService } from "../../common/services/prisma.service";
import { CreatePaymentDto, UpdatePaymentDto } from "./dto/payment.dto";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  // ==================== CRUD ====================

  async create(dto: CreatePaymentDto, user: any) {
    // Verify event folder exists
    const folder = await this.prisma.eventFolder.findUnique({
      where: { id: dto.eventFolderId },
    });
    if (!folder) {
      throw new NotFoundException("Dossier événement introuvable");
    }

    return this.prisma.payment.create({
      data: {
        eventFolderId: dto.eventFolderId,
        userId: folder.userId,
        amount: new Prisma.Decimal(dto.amount),
        type: dto.type,
        status: PaymentStatus.PENDING,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        proofDocument: dto.proofDocument,
        isRefundable:
          dto.type === PaymentType.CAUTION ? true : dto.isRefundable || false,
        createdBy: user?.id,
      },
      include: {
        eventFolder: {
          select: { id: true, folderNumber: true, status: true },
        },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findAll(options?: {
    status?: PaymentStatus;
    type?: PaymentType;
    eventFolderId?: string;
    userId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.PaymentWhereInput = {};
    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;
    if (options?.eventFolderId) where.eventFolderId = options.eventFolderId;
    if (options?.userId) where.userId = options.userId;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          eventFolder: {
            select: {
              id: true,
              folderNumber: true,
              status: true,
              eventType: true,
              start: true,
            },
          },
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        eventFolder: {
          select: {
            id: true,
            folderNumber: true,
            status: true,
            eventType: true,
            start: true,
            end: true,
            totalTTC: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Paiement ${id} introuvable`);
    }
    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        "Impossible de modifier un paiement validé",
      );
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && {
          amount: new Prisma.Decimal(dto.amount),
        }),
        ...(dto.proofDocument !== undefined && {
          proofDocument: dto.proofDocument,
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: new Date(dto.dueDate),
        }),
      },
      include: {
        eventFolder: {
          select: { id: true, folderNumber: true, status: true },
        },
      },
    });
  }

  async remove(id: string) {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(
        "Impossible de supprimer un paiement validé",
      );
    }

    await this.prisma.payment.delete({ where: { id } });
  }

  // ==================== STATUS ====================

  async markAsPaid(id: string) {
    const payment = await this.findOne(id);

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException("Ce paiement est déjà validé");
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
      include: {
        eventFolder: {
          select: { id: true, folderNumber: true, status: true },
        },
      },
    });
  }

  async refund(id: string) {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException(
        "Seuls les paiements validés peuvent être remboursés",
      );
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAmount: payment.amount,
        refundedAt: new Date(),
      },
      include: {
        eventFolder: {
          select: { id: true, folderNumber: true, status: true },
        },
      },
    });
  }

  // ==================== QUERIES ====================

  async getEventFolderPayments(eventFolderId: string) {
    return this.findAll({ eventFolderId });
  }

  async getPendingPayments() {
    return this.findAll({ status: PaymentStatus.PENDING });
  }

  async getUserPayments(userId: string) {
    return this.findAll({ userId });
  }

  // ==================== STATS ====================

  async getStats() {
    const [byStatus, totalRevenue, monthlyRevenue] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      this.getMonthlyRevenue(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
      ),
    ]);

    return {
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
        total: Number(s._sum.amount || 0),
      })),
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      currentMonthRevenue: monthlyRevenue,
    };
  }

  async getMonthlyRevenue(year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const result = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      year,
      month,
      revenue: Number(result._sum.amount || 0),
      count: result._count._all,
    };
  }

  // ==================== INVOICE PDF ====================

  async generateInvoicePdf(id: string): Promise<Buffer> {
    const payment = await this.findOne(id);
    const folder = payment.eventFolder;
    const client = folder.user;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1a1a2e; font-size: 28px; }
          .info { display: flex; justify-content: space-between; margin: 20px 0; }
          .info div { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #1a1a2e; color: white; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #ddd; }
          .total { text-align: right; font-size: 20px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAVILLON LES LYS</h1>
          <p>Facture / Reçu de paiement</p>
        </div>
        <div class="info">
          <div>
            <strong>Client:</strong><br>
            ${client.firstName} ${client.lastName}<br>
            ${client.email}<br>
            ${client.phone || ""}
          </div>
          <div style="text-align: right;">
            <strong>Dossier:</strong> ${folder.folderNumber}<br>
            <strong>Date:</strong> ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString("fr-FR")}<br>
            <strong>Statut:</strong> ${payment.status}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${payment.type}</td>
              <td>${Number(payment.amount).toLocaleString("fr-FR")} XOF</td>
              <td>${payment.status}</td>
              <td>${new Date(payment.paidAt || payment.createdAt).toLocaleDateString("fr-FR")}</td>
            </tr>
          </tbody>
        </table>
        <div class="total">
          Total : ${Number(payment.amount).toLocaleString("fr-FR")} XOF
        </div>
        <div class="footer">
          <p>Pavillon Les Lys — Salle de réception 450m²</p>
        </div>
      </body>
      </html>
    `;

    return this.pdfService.generatePdf(html);
  }
}

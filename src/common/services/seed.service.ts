import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  EventType,
  PaymentStatus,
  PaymentType,
  Prisma,
  ReservationStatus,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "./prisma.service";

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    this.logger.log("🔰 Starting seed check...");

    try {
      // Idempotency: if users already exist, skip full seed
      const userCount = await this.prisma.user.count();
      if (userCount > 0) {
        this.logger.log(`ℹ️  Seed skipped (users already exist: ${userCount})`);
        return;
      }

      const passwordPlain = "Password123!";
      const passwordHash = await bcrypt.hash(passwordPlain, 10);

      // 1) Users
      const [admin, manager, client1, client2] = await Promise.all([
        this.prisma.user.create({
          data: {
            email: "admin@pavillon-les-lys.fr",
            password: passwordHash,
            firstName: "Admin",
            lastName: "Root",
            role: Role.ADMIN,
            phone: "+22960000001",
            isFirstLogin: false,
          },
        }),
        this.prisma.user.create({
          data: {
            email: "manager@pavillon-les-lys.fr",
            password: passwordHash,
            firstName: "Event",
            lastName: "Manager",
            role: Role.EVENT_MANAGER,
            phone: "+22960000002",
            isFirstLogin: false,
          },
        }),
        this.prisma.user.create({
          data: {
            email: "client1@pavillon-les-lys.fr",
            password: passwordHash,
            firstName: "Alice",
            lastName: "Kossi",
            role: Role.CLIENT,
            phone: "+22960000003",
            isFirstLogin: true,
          },
        }),
        this.prisma.user.create({
          data: {
            email: "client2@pavillon-les-lys.fr",
            password: passwordHash,
            firstName: "Benoit",
            lastName: "Akpo",
            role: Role.CLIENT,
            phone: "+22960000004",
            isFirstLogin: true,
          },
        }),
      ]);

      // 2) Reservations
      const now = new Date();
      const daysFromNow = (n: number) =>
        new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

      const reservations = await this.prisma.$transaction([
        this.prisma.reservation.create({
          data: {
            userId: client1.id,
            eventType: EventType.MARIAGE,
            start: daysFromNow(30),
            end: daysFromNow(31),
            attendees: 120,
            status: ReservationStatus.CONFIRMED,
            createdBy: admin.id,
          },
        }),
        this.prisma.reservation.create({
          data: {
            userId: client2.id,
            eventType: EventType.ANNIVERSAIRE,
            start: daysFromNow(10),
            end: daysFromNow(10),
            attendees: 30,
            status: ReservationStatus.PENDING,
            createdBy: manager.id,
          },
        }),
        this.prisma.reservation.create({
          data: {
            userId: client1.id,
            eventType: EventType.PROFESSIONNEL,
            start: daysFromNow(60),
            end: daysFromNow(60),
            attendees: 80,
            status: ReservationStatus.PENDING,
            createdBy: admin.id,
          },
        }),
      ]);

      // 3) Quotes
      for (const res of reservations.slice(0, 3)) {
        const itemsData = [
          { description: "Location salle", quantity: 1, unitPrice: 300000 },
          { description: "Décoration", quantity: 1, unitPrice: 150000 },
          { description: "Traiteur", quantity: res.attendees, unitPrice: 8000 },
        ];
        const totalHT = itemsData.reduce(
          (sum, it) => sum + it.quantity * it.unitPrice,
          0
        );
        const vatRate = 18.0;
        const totalTTC = totalHT + totalHT * (vatRate / 100);

        const quote = await this.prisma.quote.create({
          data: {
            number: `DEV-202512-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            userId: res.userId,
            reservationId: res.id,
            totalHT: new Prisma.Decimal(totalHT),
            vatRate: new Prisma.Decimal(vatRate),
            totalTTC: new Prisma.Decimal(totalTTC),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
            status: "DRAFT",
            items: {
              create: itemsData.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(item.unitPrice),
                totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
              })),
            },
          },
        });
      }

      // 4) Payments
      for (const res of reservations) {
        await this.prisma.payment.create({
          data: {
            reservationId: res.id,
            amount: new Prisma.Decimal(200000),
            currency: "XOF",
            type: PaymentType.ACOMPTE,
            status: PaymentStatus.PAID,
            paidAt: daysFromNow(-1),
            userId: client1.id,
          },
        });
        await this.prisma.payment.create({
          data: {
            reservationId: res.id,
            amount: new Prisma.Decimal(300000),
            currency: "XOF",
            type: PaymentType.SOLDE,
            status: PaymentStatus.PENDING,
            dueDate: daysFromNow(7),
            userId: admin.id,
          },
        });
      }

      // 5) Checklist items
      for (const res of reservations) {
        await this.prisma.checklistItem.createMany({
          data: [
            {
              reservationId: res.id,
              title: "Signature du contrat",
              completed: true,
            },
            { reservationId: res.id, title: "Acompte reçu", completed: false },
            { reservationId: res.id, title: "Plan de table", completed: false },
          ],
        });
      }

      // 6) Feedback
      const confirmed = reservations.find(
        (r) => r.status === ReservationStatus.CONFIRMED
      );
      if (confirmed) {
        await this.prisma.feedback.create({
          data: {
            userId: client1.id,
            reservationId: confirmed.id,
            rating: 5,
            comment:
              "Service excellent et équipe très professionnelle. Merci !",
          },
        });
      }

      this.logger.log("✅ Seed completed");
    } catch (e) {
      this.logger.error("❌ Seed failed:", e);
    }
  }
}

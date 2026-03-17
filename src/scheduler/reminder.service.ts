import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventStatus } from "@prisma/client";
import { PrismaService } from "../common/services/prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Cron exécuté chaque jour à 8h00 — envoie les rappels J-21 et J-14
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleReminders() {
    this.logger.log("⏰ Exécution des rappels automatiques...");

    await Promise.allSettled([
      this.sendRemindersJ21(),
      this.sendRemindersJ14(),
    ]);

    this.logger.log("✅ Rappels automatiques terminés");
  }

  /**
   * Rappel J-21 : Envoi du contrat 21 jours avant l'événement
   * Cible : dossiers en QUOTED (devis envoyé mais pas encore confirmé)
   */
  private async sendRemindersJ21() {
    const now = new Date();
    const in21Days = new Date(now);
    in21Days.setDate(in21Days.getDate() + 21);

    // Début et fin de la journée J-21
    const dayStart = new Date(in21Days);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(in21Days);
    dayEnd.setHours(23, 59, 59, 999);

    const folders = await this.prisma.eventFolder.findMany({
      where: {
        status: EventStatus.QUOTED,
        schedules: {
          some: {
            date: { gte: dayStart, lte: dayEnd }
          }
        },
        reminderJ21SentAt: null, // Pas encore envoyé
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`📋 J-21 : ${folders.length} dossier(s) à rappeler`);

    for (const folder of folders) {
      try {
        await this.mailService.sendEventReminder(folder.user, folder, 21);

        // Marquer le rappel comme envoyé
        await this.prisma.eventFolder.update({
          where: { id: folder.id },
          data: { reminderJ21SentAt: new Date() },
        });

        this.logger.log(
          `✉️ Rappel J-21 envoyé pour le dossier ${folder.folderNumber} à ${folder.user.email}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Erreur rappel J-21 pour ${folder.folderNumber}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Rappel J-14 : Relance 14 jours avant l'événement
   * Cible : dossiers en QUOTED ou BOOKED qui nécessitent une action
   */
  private async sendRemindersJ14() {
    const now = new Date();
    const in14Days = new Date(now);
    in14Days.setDate(in14Days.getDate() + 14);

    const dayStart = new Date(in14Days);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(in14Days);
    dayEnd.setHours(23, 59, 59, 999);

    const folders = await this.prisma.eventFolder.findMany({
      where: {
        status: { in: [EventStatus.QUOTED, EventStatus.BOOKED] },
        schedules: {
          some: {
            date: { gte: dayStart, lte: dayEnd }
          }
        },
        reminderJ14SentAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`📋 J-14 : ${folders.length} dossier(s) à rappeler`);

    for (const folder of folders) {
      try {
        await this.mailService.sendEventReminder(folder.user, folder, 14);

        await this.prisma.eventFolder.update({
          where: { id: folder.id },
          data: { reminderJ14SentAt: new Date() },
        });

        this.logger.log(
          `✉️ Rappel J-14 envoyé pour le dossier ${folder.folderNumber} à ${folder.user.email}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Erreur rappel J-14 pour ${folder.folderNumber}: ${error.message}`,
        );
      }
    }
  }
}

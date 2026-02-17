import { MailerService } from "@nestjs-modules/mailer";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Envoie un email de contrat au client (remplace l'ancien sendQuote)
   */
  async sendContract(
    user: { email: string; firstName: string; lastName: string },
    eventFolder: any,
    pdfBuffer?: Buffer,
  ): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      const attachments = pdfBuffer
        ? [
            {
              filename: `Contrat-${eventFolder.folderNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : [];

      await this.mailerService.sendMail({
        to: email,
        subject: `Votre contrat Pavillon Les Lys - ${eventFolder.folderNumber}`,
        template: "./contract",
        context: {
          firstName,
          lastName,
          folder: {
            folderNumber: eventFolder.folderNumber,
            eventType: eventFolder.eventType,
            start: new Date(eventFolder.start).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            end: new Date(eventFolder.end).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            attendees: eventFolder.attendees,
            totalHT: eventFolder.totalHT?.toFixed(2) || "0.00",
            totalTTC: eventFolder.totalTTC?.toFixed(2) || "0.00",
            notes: eventFolder.notes || "",
          },
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/event-folders/${eventFolder.id}`,
        },
        attachments,
      });

      this.logger.log(`✉️ Contrat envoyé à ${email}`);
    } catch (error) {
      this.logger.error(`❌ Erreur envoi contrat à ${email}: ${error.message}`);
      throw new Error(`Impossible d'envoyer le contrat: ${error.message}`);
    }
  }

  /**
   * Envoie un email de confirmation de réservation (passage en BOOKED)
   */
  async sendBookingConfirmation(
    user: { email: string; firstName: string; lastName: string },
    eventFolder: any,
  ): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Confirmation de votre réservation au Pavillon Les Lys`,
        template: "./booking-confirmation",
        context: {
          firstName,
          lastName,
          folder: {
            folderNumber: eventFolder.folderNumber,
            eventType: eventFolder.eventType,
            start: new Date(eventFolder.start).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            attendees: eventFolder.attendees,
          },
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/event-folders/${eventFolder.id}`,
        },
      });

      this.logger.log(`✉️ Confirmation de réservation envoyée à ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi confirmation à ${email}: ${error.message}`,
      );
      throw new Error(`Impossible d'envoyer la confirmation: ${error.message}`);
    }
  }

  /**
   * Envoie un email de confirmation de paiement
   */
  async sendPaymentConfirmation(user: any, payment: any): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Confirmation de votre paiement - Pavillon Les Lys`,
        template: "./payment-confirmation",
        context: {
          firstName,
          lastName,
          payment: {
            amount: payment.amount.toFixed(2),
            type: payment.type,
            date: new Date(payment.paidAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            method: payment.paymentMethod,
          },
          dashboardUrl: `${process.env.FRONTEND_URL}/mon-espace/paiements`,
        },
      });

      this.logger.log(`✉️ Confirmation de paiement envoyée à ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi confirmation paiement à ${email}: ${error.message}`,
      );
      throw new Error(
        `Impossible d'envoyer la confirmation de paiement: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un email de rappel d'événement (J-21 ou J-14)
   */
  async sendEventReminder(
    user: { email: string; firstName: string; lastName: string },
    eventFolder: any,
    daysBeforeEvent: number,
  ): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Rappel : Votre événement au Pavillon Les Lys dans ${daysBeforeEvent} jours`,
        template: "./event-reminder",
        context: {
          firstName,
          lastName,
          daysBeforeEvent,
          folder: {
            folderNumber: eventFolder.folderNumber,
            eventType: eventFolder.eventType,
            start: new Date(eventFolder.start).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            attendees: eventFolder.attendees,
          },
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/event-folders/${eventFolder.id}`,
        },
      });

      this.logger.log(`✉️ Rappel J-${daysBeforeEvent} envoyé à ${email}`);
    } catch (error) {
      this.logger.error(`❌ Erreur envoi rappel à ${email}: ${error.message}`);
      throw new Error(`Impossible d'envoyer le rappel: ${error.message}`);
    }
  }

  /**
   * Envoie un email de demande d'avis (après événement COMPLETED)
   */
  async sendFeedbackRequest(
    user: { email: string; firstName: string; lastName: string },
    eventFolder: any,
  ): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Votre avis compte pour nous - Pavillon Les Lys`,
        template: "./feedback-request",
        context: {
          firstName,
          lastName,
          folder: {
            eventType: eventFolder.eventType,
            start: new Date(eventFolder.start).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          },
          feedbackUrl: `${process.env.FRONTEND_URL}/mon-espace/feedback/new?eventFolderId=${eventFolder.id}`,
        },
      });

      this.logger.log(`✉️ Demande d'avis envoyée à ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi demande d'avis à ${email}: ${error.message}`,
      );
      throw new Error(
        `Impossible d'envoyer la demande d'avis: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un email de bienvenue (nouveau compte client)
   */
  async sendWelcomeEmail(user: any): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Bienvenue au Pavillon Les Lys, ${firstName} !`,
        template: "./welcome",
        context: {
          firstName,
          lastName,
          dashboardUrl: `${process.env.FRONTEND_URL}/mon-espace`,
        },
      });

      this.logger.log(`✉️ Email de bienvenue envoyé à ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi bienvenue à ${email}: ${error.message}`,
      );
      throw new Error(
        `Impossible d'envoyer l'email de bienvenue: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(user: any, resetToken: string): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Réinitialisation de votre mot de passe - Pavillon Les Lys`,
        template: "./reset-password",
        context: {
          firstName,
          lastName,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
          expirationTime: "1 heure",
        },
      });

      this.logger.log(`✉️ Email de réinitialisation envoyé à ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi réinitialisation à ${email}: ${error.message}`,
      );
      throw new Error(
        `Impossible d'envoyer l'email de réinitialisation: ${error.message}`,
      );
    }
  }
}

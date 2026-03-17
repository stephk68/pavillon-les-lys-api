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
            start: eventFolder.schedules?.[0]
              ? new Date(eventFolder.schedules[0].date).toLocaleDateString(
                  "fr-FR",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )
              : "Date non définie",
            end:
              eventFolder.schedules?.length > 1
                ? new Date(
                    eventFolder.schedules[
                      eventFolder.schedules.length - 1
                    ].date,
                  ).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : undefined,
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
            start: eventFolder.schedules?.[0]
              ? new Date(eventFolder.schedules[0].date).toLocaleDateString(
                  "fr-FR",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )
              : "Date non définie",
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
            start: eventFolder.schedules?.[0]
              ? new Date(eventFolder.schedules[0].date).toLocaleDateString(
                  "fr-FR",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )
              : "Date non définie",
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
            start: eventFolder.schedules?.[0]
              ? new Date(eventFolder.schedules[0].date).toLocaleDateString(
                  "fr-FR",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )
              : "Date non définie",
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

  /**
   * Envoie un email de devis détaillé au client
   */
  async sendQuoteDocument(
    client: { name: string; phone: string; email: string },
    event: {
      folderNumber: string;
      eventType: string;
      eventDate: string;
      guestCount: number;
    },
    items: {
      description: string;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }[],
    totals: {
      totalTTC: string;
      depositAmount: string;
      balanceAmount: string;
      cautionAmount: string;
    },
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: client.email,
        subject: `Votre devis Pavillon Les Lys - ${event.folderNumber}`,
        template: "./quote-document",
        context: {
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email,
          folderNumber: event.folderNumber,
          eventType: event.eventType,
          eventDate: event.eventDate,
          guestCount: event.guestCount,
          items,
          totalTTC: totals.totalTTC,
          depositAmount: totals.depositAmount,
          balanceAmount: totals.balanceAmount,
          cautionAmount: totals.cautionAmount,
        },
      });

      this.logger.log(`✉️ Devis envoyé à ${client.email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi devis à ${client.email}: ${error.message}`,
      );
      throw new Error(`Impossible d'envoyer le devis: ${error.message}`);
    }
  }

  /**
   * Envoie un email de confirmation de changement de mot de passe
   */
  async sendPasswordChangedConfirmation(user: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Votre mot de passe a été modifié - Pavillon Les Lys`,
        template: "./password-changed-confirmation",
        context: {
          firstName,
          lastName,
          changedAt: new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          loginUrl: `${process.env.FRONTEND_URL}/auth/login`,
        },
      });

      this.logger.log(`✉️ Confirmation changement MDP envoyée à ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi confirmation MDP à ${email}: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un message de contact à l'équipe Pavillon Les Lys
   */
  async sendContactMessage(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    eventType?: string;
    message: string;
  }): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: process.env.MAIL_FROM || "contact@pavillonleslys.com",
        subject: `Nouveau message de contact - ${data.firstName} ${data.lastName}`,
        template: "./contact-message",
        context: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          eventType: data.eventType,
          message: data.message,
        },
      });

      this.logger.log(`✉️ Message de contact reçu de ${data.email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi message contact de ${data.email}: ${error.message}`,
      );
      throw new Error(
        `Impossible d'envoyer le message de contact: ${error.message}`,
      );
    }
  }

  /**
   * Envoie un code OTP pour la première connexion
   */
  async sendOtpCode(
    user: { email: string; firstName: string; lastName: string },
    otpCode: string,
  ): Promise<void> {
    const { email, firstName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Votre code de connexion — Pavillon Les Lys`,
        template: "./otp-code",
        context: {
          firstName,
          otpCode,
          expiresIn: "10 minutes",
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`✉️ Code OTP envoyé à ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi OTP à ${email}: ${(error as Error).message}`,
      );
    }
  }
}

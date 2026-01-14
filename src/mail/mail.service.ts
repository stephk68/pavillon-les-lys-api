import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Envoie un email de devis au client
   * @param user Utilisateur destinataire
   * @param quote Données du devis
   */
  async sendQuote(user: any, quote: any): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Votre devis Pavillon Les Lys - Réf. ${quote.reference}`,
        template: "./quote",
        context: {
          firstName,
          lastName,
          quote: {
            reference: quote.reference,
            date: new Date(quote.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            items: quote.items,
            totalHT: quote.totalHT.toFixed(2),
            totalTTC: quote.totalTTC.toFixed(2),
            tva: (
              ((quote.totalTTC - quote.totalHT) / quote.totalHT) *
              100
            ).toFixed(0),
            notes: quote.notes || "",
          },
          downloadUrl: `${process.env.FRONTEND_URL}/dashboard/quotes/${quote.id}/download`,
        },
      });

      console.log(`✉️ Email de devis envoyé à ${email}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi du devis à ${email}:`, error);
      throw new Error(
        `Impossible d'envoyer l'email de devis: ${error.message}`
      );
    }
  }

  /**
   * Envoie un email de confirmation de réservation
   * @param user Utilisateur destinataire
   * @param reservation Données de la réservation
   */
  async sendReservationConfirmation(
    user: any,
    reservation: any
  ): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Confirmation de votre réservation au Pavillon Les Lys`,
        template: "./reservation-confirmation",
        context: {
          firstName,
          lastName,
          reservation: {
            id: reservation.id,
            eventDate: new Date(reservation.eventDate).toLocaleDateString(
              "fr-FR",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            ),
            eventType: reservation.eventType,
            guestCount: reservation.guestCount,
            status: reservation.status,
          },
          dashboardUrl: `${process.env.FRONTEND_URL}/mon-espace/reservations/${reservation.id}`,
        },
      });

      console.log(`✉️ Email de confirmation envoyé à ${email}`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'envoi de la confirmation à ${email}:`,
        error
      );
      throw new Error(
        `Impossible d'envoyer l'email de confirmation: ${error.message}`
      );
    }
  }

  /**
   * Envoie un email de confirmation de paiement
   * @param user Utilisateur destinataire
   * @param payment Données du paiement
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

      console.log(`✉️ Email de confirmation de paiement envoyé à ${email}`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'envoi de la confirmation de paiement à ${email}:`,
        error
      );
      throw new Error(
        `Impossible d'envoyer l'email de confirmation de paiement: ${error.message}`
      );
    }
  }

  /**
   * Envoie un email de rappel d'événement (7 jours avant)
   * @param user Utilisateur destinataire
   * @param reservation Données de la réservation
   */
  async sendEventReminder(user: any, reservation: any): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Rappel : Votre événement au Pavillon Les Lys approche !`,
        template: "./event-reminder",
        context: {
          firstName,
          lastName,
          reservation: {
            eventDate: new Date(reservation.eventDate).toLocaleDateString(
              "fr-FR",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            ),
            eventType: reservation.eventType,
            guestCount: reservation.guestCount,
          },
          dashboardUrl: `${process.env.FRONTEND_URL}/mon-espace/reservations/${reservation.id}`,
        },
      });

      console.log(`✉️ Email de rappel envoyé à ${email}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi du rappel à ${email}:`, error);
      throw new Error(
        `Impossible d'envoyer l'email de rappel: ${error.message}`
      );
    }
  }

  /**
   * Envoie un email de demande d'avis (2 jours après l'événement)
   * @param user Utilisateur destinataire
   * @param reservation Données de la réservation
   */
  async sendFeedbackRequest(user: any, reservation: any): Promise<void> {
    const { email, firstName, lastName } = user;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Votre avis compte pour nous - Pavillon Les Lys`,
        template: "./feedback-request",
        context: {
          firstName,
          lastName,
          reservation: {
            eventDate: new Date(reservation.eventDate).toLocaleDateString(
              "fr-FR",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            ),
            eventType: reservation.eventType,
          },
          feedbackUrl: `${process.env.FRONTEND_URL}/mon-espace/feedback/new?reservationId=${reservation.id}`,
        },
      });

      console.log(`✉️ Email de demande d'avis envoyé à ${email}`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'envoi de la demande d'avis à ${email}:`,
        error
      );
      throw new Error(
        `Impossible d'envoyer l'email de demande d'avis: ${error.message}`
      );
    }
  }

  /**
   * Envoie un email de bienvenue (nouveau compte client)
   * @param user Utilisateur destinataire
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

      console.log(`✉️ Email de bienvenue envoyé à ${email}`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'envoi de l'email de bienvenue à ${email}:`,
        error
      );
      throw new Error(
        `Impossible d'envoyer l'email de bienvenue: ${error.message}`
      );
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   * @param user Utilisateur destinataire
   * @param resetToken Token de réinitialisation
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

      console.log(`✉️ Email de réinitialisation envoyé à ${email}`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'envoi de l'email de réinitialisation à ${email}:`,
        error
      );
      throw new Error(
        `Impossible d'envoyer l'email de réinitialisation: ${error.message}`
      );
    }
  }
}

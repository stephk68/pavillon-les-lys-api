import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { MailService } from "./mail.service";

/**
 * Controller de test pour l'envoi d'emails
 *
 * ⚠️ NOTE : Ces endpoints sont publics (sans authentification) pour faciliter les tests.
 * En production, retirez le décorateur @Public() ou supprimez ce controller.
 */
@Controller("mail")
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /**
   * Test 1 : Email de bienvenue
   * POST /mail/test/welcome
   * Body: { "firstName": "John", "lastName": "Doe", "email": "test@example.com" }
   */
  @Public()
  @Post("test/welcome")
  @HttpCode(HttpStatus.OK)
  async testWelcomeEmail(
    @Body() body: { firstName: string; lastName: string; email: string }
  ) {
    try {
      await this.mailService.sendWelcomeEmail(body);
      return {
        success: true,
        message: `Email de bienvenue envoyé à ${body.email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        hint: "Vérifiez votre configuration SMTP (MAIL_USER, MAIL_PASSWORD) dans .env",
      };
    }
  }

  /**
   * Test 2 : Email de réinitialisation de mot de passe
   * POST /mail/test/reset-password
   * Body: { "firstName": "John", "lastName": "Doe", "email": "test@example.com", "resetToken": "abc123" }
   */
  @Public()
  @Post("test/reset-password")
  @HttpCode(HttpStatus.OK)
  async testResetPasswordEmail(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      resetToken: string;
    }
  ) {
    try {
      await this.mailService.sendPasswordResetEmail(body, body.resetToken);
      return {
        success: true,
        message: `Email de réinitialisation envoyé à ${body.email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test 3 : Email de devis
   * POST /mail/test/quote
   * Body: Voir exemple ci-dessous
   */
  @Public()
  @Post("test/quote")
  @HttpCode(HttpStatus.OK)
  async testQuoteEmail(
    @Body()
    body: {
      user: { firstName: string; lastName: string; email: string };
      quote: {
        reference: string;
        createdAt: string;
        totalHT: number;
        totalTTC: number;
        tvaRate: number;
        notes?: string;
        items: Array<{
          description: string;
          quantity: number;
          unitPrice: number;
          total: number;
        }>;
      };
    }
  ) {
    try {
      // Calcul TVA
      const tvaAmount = body.quote.totalHT * (body.quote.tvaRate / 100);

      await this.mailService.sendQuote(body.user, {
        ...body.quote,
        tvaAmount,
      });

      return {
        success: true,
        message: `Email de devis envoyé à ${body.user.email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test 4 : Email de confirmation de réservation
   * POST /mail/test/reservation-confirmation
   */
  @Public()
  @Post("test/reservation-confirmation")
  @HttpCode(HttpStatus.OK)
  async testReservationConfirmation(
    @Body()
    body: {
      user: { firstName: string; lastName: string; email: string };
      reservation: {
        reference: string;
        eventDate: string;
        eventType: string;
        roomName: string;
        totalAmount: number;
      };
    }
  ) {
    try {
      await this.mailService.sendReservationConfirmation(
        body.user,
        body.reservation
      );
      return {
        success: true,
        message: `Email de confirmation envoyé à ${body.user.email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * EXEMPLE DE REQUÊTE POSTMAN POUR TEST QUOTE :
 *
 * POST http://localhost:3000/mail/test/quote
 * Content-Type: application/json
 *
 * {
 *   "user": {
 *     "firstName": "Aymeric",
 *     "lastName": "KYS",
 *     "email": "kysaymeric@gmail.com"
 *   },
 *   "quote": {
 *     "reference": "DEVIS-2026-001",
 *     "createdAt": "2026-01-12T10:00:00Z",
 *     "totalHT": 5000,
 *     "totalTTC": 5900,
 *     "tvaRate": 18,
 *     "notes": "Acompte de 30% requis à la signature. Solde à régler 7 jours avant l'événement.",
 *     "items": [
 *       {
 *         "description": "Location Salle Premium (10h)",
 *         "quantity": 1,
 *         "unitPrice": 3000,
 *         "total": 3000
 *       },
 *       {
 *         "description": "Forfait Décoration Luxe",
 *         "quantity": 1,
 *         "unitPrice": 1500,
 *         "total": 1500
 *       },
 *       {
 *         "description": "Service Traiteur (50 personnes)",
 *         "quantity": 50,
 *         "unitPrice": 10,
 *         "total": 500
 *       }
 *     ]
 *   }
 * }
 */

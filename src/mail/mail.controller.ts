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
    @Body() body: { firstName: string; lastName: string; email: string },
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
    },
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
   * Test 3 : Email de contrat
   * POST /mail/test/contract
   */
  @Public()
  @Post("test/contract")
  @HttpCode(HttpStatus.OK)
  async testContractEmail(
    @Body()
    body: {
      user: { firstName: string; lastName: string; email: string };
      folder: {
        id: string;
        folderNumber: string;
        eventType: string;
        start: string;
        end: string;
        attendees: number;
        totalHT: number;
        totalTTC: number;
        notes?: string;
      };
    },
  ) {
    try {
      await this.mailService.sendContract(body.user, body.folder);
      return {
        success: true,
        message: `Email de contrat envoyé à ${body.user.email}`,
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
   * POST /mail/test/booking-confirmation
   */
  @Public()
  @Post("test/booking-confirmation")
  @HttpCode(HttpStatus.OK)
  async testBookingConfirmation(
    @Body()
    body: {
      user: { firstName: string; lastName: string; email: string };
      folder: {
        id: string;
        folderNumber: string;
        eventType: string;
        start: string;
        attendees: number;
      };
    },
  ) {
    try {
      await this.mailService.sendBookingConfirmation(body.user, body.folder);
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

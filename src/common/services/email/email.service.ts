import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER || "stephanek1996@gmail.com",
        pass: process.env.SMTP_PASSWORD, // App password, not regular password
      },
    });

    // Vérifier la configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error("❌ Erreur de configuration SMTP:", error);
      } else {
        this.logger.log("✅ Serveur SMTP prêt pour l'envoi d'emails");
      }
    });
  }

  /**
   * Envoie un email de bienvenue à un nouveau client
   */
  async sendWelcomeEmail(
    clientEmail: string,
    clientFirstName: string,
    temporaryPassword: string
  ): Promise<boolean> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

      const mailOptions = {
        from: {
          name: "Pavillon Les Lys",
          address: process.env.SMTP_USER || "stephanek1996@gmail.com",
        },
        to: clientEmail,
        subject:
          "🌟 Bienvenue au Pavillon Les Lys - Vos identifiants de connexion",
        html: this.generateWelcomeEmailTemplate(
          clientFirstName,
          clientEmail,
          temporaryPassword,
          frontendUrl
        ),
        text: this.generateWelcomeEmailText(
          clientFirstName,
          clientEmail,
          temporaryPassword,
          frontendUrl
        ),
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `✅ Email de bienvenue envoyé à ${clientEmail}: ${info.messageId}`
      );
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi email à ${clientEmail}:`, error);
      return false;
    }
  }

  /**
   * Envoie un email de confirmation de réservation
   */
  async sendReservationConfirmationEmail(
    clientEmail: string,
    clientFirstName: string,
    reservationDetails: {
      id: string;
      eventType: string;
      start: Date;
      end: Date;
      attendees: number;
      description?: string;
    }
  ): Promise<boolean> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

      const mailOptions = {
        from: {
          name: "Pavillon Les Lys",
          address: process.env.SMTP_USER || "stephanek1996@gmail.com",
        },
        to: clientEmail,
        subject: "📅 Confirmation de votre réservation - Pavillon Les Lys",
        html: this.generateReservationEmailTemplate(
          clientFirstName,
          reservationDetails,
          frontendUrl
        ),
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `✅ Email de confirmation réservation envoyé à ${clientEmail}: ${info.messageId}`
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Erreur envoi email de réservation à ${clientEmail}:`,
        error
      );
      return false;
    }
  }

  /**
   * Template HTML pour l'email de bienvenue
   */
  private generateWelcomeEmailTemplate(
    firstName: string,
    email: string,
    password: string,
    frontendUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue au Pavillon Les Lys</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌟 Bienvenue au Pavillon Les Lys</h1>
            <p>Votre espace événementiel de prestige</p>
        </div>
        
        <div class="content">
            <h2>Bonjour ${firstName},</h2>
            
            <p>Nous sommes ravis de vous accueillir ! Votre compte a été créé suite à votre réservation au Pavillon Les Lys.</p>
            
            <div class="credentials">
                <h3>🔐 Vos identifiants de connexion :</h3>
                <p><strong>Email :</strong> ${email}</p>
                <p><strong>Mot de passe temporaire :</strong> <code>${password}</code></p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important :</strong> Pour des raisons de sécurité, vous devrez changer votre mot de passe lors de votre première connexion.
            </div>
            
            <p>Connectez-vous dès maintenant pour :</p>
            <ul>
                <li>✅ Consulter vos réservations</li>
                <li>✅ Suivre l'avancement de vos projets</li>
                <li>✅ Échanger avec notre équipe</li>
                <li>✅ Accéder à vos devis et factures</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${frontendUrl}/login" class="button">Se connecter maintenant</a>
            </div>
            
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            
            <p>Cordialement,<br>
            <strong>L'équipe Pavillon Les Lys</strong></p>
        </div>
        
        <div class="footer">
            <p>© 2025 Pavillon Les Lys - Tous droits réservés</p>
            <p>Email : stephanek1996@gmail.com</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Version texte de l'email de bienvenue
   */
  private generateWelcomeEmailText(
    firstName: string,
    email: string,
    password: string,
    frontendUrl: string
  ): string {
    return `
Bienvenue au Pavillon Les Lys

Bonjour ${firstName},

Nous sommes ravis de vous accueillir ! Votre compte a été créé suite à votre réservation au Pavillon Les Lys.

VOS IDENTIFIANTS DE CONNEXION :
- Email : ${email}
- Mot de passe temporaire : ${password}

IMPORTANT : Pour des raisons de sécurité, vous devrez changer votre mot de passe lors de votre première connexion.

Connectez-vous sur : ${frontendUrl}/login

Si vous avez des questions, n'hésitez pas à nous contacter.

Cordialement,
L'équipe Pavillon Les Lys

© 2025 Pavillon Les Lys - Tous droits réservés
Email : stephanek1996@gmail.com
    `;
  }

  /**
   * Template HTML pour la confirmation de réservation
   */
  private generateReservationEmailTemplate(
    firstName: string,
    reservation: {
      id: string;
      eventType: string;
      start: Date;
      end: Date;
      attendees: number;
      description?: string;
    },
    frontendUrl: string
  ): string {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    };

    const eventTypeLabels: Record<string, string> = {
      WEDDING: "💒 Mariage",
      BAPTISM: "👶 Baptême",
      BIRTHDAY: "🎂 Anniversaire",
      CORPORATE: "🏢 Événement corporatif",
      OTHER: "🎉 Autre événement",
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de réservation</title>
    <style>
        .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .reservation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Réservation Confirmée</h1>
            <p>Pavillon Les Lys</p>
        </div>
        
        <div class="content">
            <h2>Bonjour ${firstName},</h2>
            
            <p>Votre réservation a été enregistrée avec succès ! Voici les détails :</p>
            
            <div class="reservation-details">
                <h3>📋 Détails de votre réservation</h3>
                <div class="detail-row">
                    <span><strong>Type d'événement :</strong></span>
                    <span>${eventTypeLabels[reservation.eventType] || reservation.eventType}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Date de début :</strong></span>
                    <span>${formatDate(reservation.start)}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Date de fin :</strong></span>
                    <span>${formatDate(reservation.end)}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Nombre d'invités :</strong></span>
                    <span>${reservation.attendees} personnes</span>
                </div>
                ${
                  reservation.description
                    ? `
                <div class="detail-row">
                    <span><strong>Description :</strong></span>
                    <span>${reservation.description}</span>
                </div>
                `
                    : ""
                }
                <div class="detail-row">
                    <span><strong>N° de réservation :</strong></span>
                    <span>#${reservation.id.slice(-8).toUpperCase()}</span>
                </div>
            </div>
            
            <p><strong>Prochaines étapes :</strong></p>
            <ul>
                <li>✅ Notre équipe va étudier votre demande</li>
                <li>📞 Nous vous contacterons dans les 24h</li>
                <li>💰 Un devis personnalisé vous sera proposé</li>
                <li>📋 Nous finaliserons ensemble tous les détails</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${frontendUrl}/reservations" class="button">Voir ma réservation</a>
            </div>
            
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            
            <p>À bientôt,<br>
            <strong>L'équipe Pavillon Les Lys</strong></p>
        </div>
        
        <div class="footer">
            <p>© 2025 Pavillon Les Lys - Tous droits réservés</p>
            <p>Email : stephanek1996@gmail.com</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Test de la configuration email
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log("✅ Configuration email valide");
      return true;
    } catch (error) {
      this.logger.error("❌ Configuration email invalide:", error);
      return false;
    }
  }
}

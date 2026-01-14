import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { MailService } from "./mail.service";

/**
 * Script de test pour valider la configuration email Gmail
 *
 * Usage:
 * npx ts-node -r tsconfig-paths/register src/mail/test-email.script.ts
 *
 * ⚠️ IMPORTANT : Avant d'exécuter ce script, assurez-vous que :
 * 1. Vous avez activé la validation en 2 étapes sur votre compte Google
 * 2. Vous avez généré un "Mot de passe d'application" depuis :
 *    https://myaccount.google.com/apppasswords
 * 3. Vous avez remplacé MAIL_PASSWORD dans .env par ce mot de passe d'application
 *    (Format: xxxx xxxx xxxx xxxx - 16 caractères)
 */
async function testEmailConnection() {
  console.log("🚀 Démarrage du test de connexion email...\n");

  try {
    // Bootstrap l'application NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    const mailService = app.get(MailService);

    // Données de test pour l'email de bienvenue
    const testUser = {
      firstName: "Aymeric",
      lastName: "KYS",
      email: "kysaymeric@gmail.com",
    };

    console.log("📧 Envoi d'un email de bienvenue à:", testUser.email);
    console.log("⏳ Veuillez patienter...\n");

    // Envoi de l'email de test
    await mailService.sendWelcomeEmail(testUser);

    console.log("✅ SUCCESS : Email envoyé avec succès !");
    console.log("📬 Vérifiez votre boîte mail :", testUser.email);
    console.log("💡 Si vous ne voyez pas l'email, vérifiez le dossier Spam\n");

    // Fermeture de l'application
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ ERREUR lors de l'envoi de l'email:\n");

    if (error.message.includes("Invalid login")) {
      console.error("🔐 ERREUR D'AUTHENTIFICATION :");
      console.error("   - Vérifiez que MAIL_USER est correct dans .env");
      console.error(
        "   - Assurez-vous d'utiliser un MOT DE PASSE D'APPLICATION Google"
      );
      console.error(
        "   - Générez-en un ici : https://myaccount.google.com/apppasswords"
      );
      console.error(
        "   - Format attendu : xxxx xxxx xxxx xxxx (16 caractères)\n"
      );
    } else if (
      error.message.includes("ECONNECTION") ||
      error.message.includes("ETIMEDOUT")
    ) {
      console.error("🌐 ERREUR DE CONNEXION :");
      console.error("   - Vérifiez votre connexion internet");
      console.error(
        "   - Vérifiez que MAIL_HOST=smtp.gmail.com et MAIL_PORT=587\n"
      );
    } else {
      console.error("📛 Détails de l'erreur :");
      console.error(error.message);
      console.error("\n");
    }

    process.exit(1);
  }
}

// Exécution du script
testEmailConnection();

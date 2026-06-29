/**
 * Script de DIAGNOSTIC SMTP (délivrabilité MSN / Hotmail / Outlook).
 *
 * Contrairement à mail.service.ts qui "avale" les erreurs dans un try/catch,
 * ce script affiche TOUT le dialogue SMTP brut + la réponse complète du serveur
 * destinataire. C'est ce qui permet de savoir si Microsoft REJETTE le mail
 * (et pourquoi : 550 5.7.x, etc.) ou s'il l'accepte.
 *
 * Usage :
 *   npx ts-node src/mail/diagnose-smtp.script.ts destinataire@hotmail.com
 *   npx ts-node src/mail/diagnose-smtp.script.ts destinataire@outlook.fr
 *
 * Le script lit la config depuis le .env (MAIL_HOST, MAIL_PORT, ...).
 */
import * as dotenv from "dotenv";
import * as nodemailer from "nodemailer";

dotenv.config();

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error(
      "❌ Donne une adresse destinataire : npx ts-node src/mail/diagnose-smtp.script.ts test@hotmail.com",
    );
    process.exit(1);
  }

  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;
  const from = process.env.MAIL_FROM || user;

  console.log("=== Config utilisée ===");
  console.log({ host, port, secure: port === 465, user, from, to });
  console.log("========================\n");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    logger: true, // affiche le dialogue SMTP
    debug: true, // affiche les trames brutes
  });

  // 1) Vérifie la connexion + l'authentification
  try {
    await transporter.verify();
    console.log("\n✅ Connexion + authentification SMTP OK\n");
  } catch (err: any) {
    console.error("\n❌ Échec connexion/auth SMTP :");
    console.error(err);
    process.exit(1);
  }

  // 2) Envoie un mail réel et affiche la réponse complète du serveur
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: "Test délivrabilité Pavillon Les Lys",
      text: "Ceci est un test de délivrabilité SMTP vers Microsoft.",
    });

    console.log("\n✅ Mail ACCEPTÉ par le serveur sortant.");
    console.log("Réponse serveur :", info.response);
    console.log("Acceptés :", info.accepted);
    console.log("Rejetés  :", info.rejected);
    console.log(
      "\n⚠️ 'Accepté' ne veut PAS dire 'arrivé en boîte de réception'.",
    );
    console.log(
      "Si rien n'arrive chez Microsoft sans erreur ci-dessus, c'est SPF/DKIM/DMARC.",
    );
  } catch (err: any) {
    console.error("\n❌ Mail REJETÉ par le serveur :");
    console.error("Code     :", err.code);
    console.error("Response :", err.response);
    console.error("Command  :", err.command);
    console.error(err);
  }

  process.exit(0);
}

main();

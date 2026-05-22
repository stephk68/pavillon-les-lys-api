// Seed de production minimal — crée uniquement l'administrateur par défaut
// Run: node prisma/seed.prod.js  (ou yarn seed:prod)
//
// Comportement :
//  - Si l'admin existe déjà → rien à faire (idempotent).
//  - Sinon → création + envoi d'un mail de bienvenue (welcome.hbs).
//    Si l'envoi du mail échoue, on log un warning mais on ne bloque pas le deploy.

const fs = require("fs");
const path = require("path");
const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");

const prisma = new PrismaClient();

async function sendWelcomeMail({ email, firstName, lastName }) {
  const {
    MAIL_HOST,
    MAIL_PORT,
    MAIL_USER,
    MAIL_PASSWORD,
    MAIL_FROM,
    FRONTEND_URL,
  } = process.env;

  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASSWORD) {
    throw new Error("Configuration SMTP manquante (MAIL_HOST/MAIL_USER/MAIL_PASSWORD)");
  }

  // Le template est compilé dans dist/mail/templates/welcome.hbs au build (cf. nest-cli.json)
  const templatePath = path.join(
    __dirname,
    "..",
    "dist",
    "mail",
    "templates",
    "welcome.hbs",
  );
  const source = fs.readFileSync(templatePath, "utf8");
  const html = handlebars.compile(source)({
    firstName,
    lastName,
    dashboardUrl: `${FRONTEND_URL || "https://www.pavillonleslys.com"}/mon-espace`,
  });

  const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: parseInt(MAIL_PORT || "587", 10),
    secure: false,
    auth: { user: MAIL_USER, pass: MAIL_PASSWORD },
  });

  await transporter.sendMail({
    from: MAIL_FROM || MAIL_USER,
    to: email,
    subject: `Bienvenue au Pavillon Les Lys, ${firstName} !`,
    html,
  });
}

async function main() {
  const email = "kysaymeric@gmail.com";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ Admin déjà existant : ${existing.email} (id: ${existing.id})`);
    return;
  }

  const defaultPassword =
    process.env.ADMIN_DEFAULT_PASSWORD || "Admin@Pavillon2024!";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      firstName: "Aymeric",
      lastName: "Kouadio",
      role: Role.ADMIN,
      isActive: true,
      isFirstLogin: true,
    },
  });

  console.log(`✅ Admin créé : ${admin.email} (id: ${admin.id})`);
  console.log(`⚠️  Mot de passe par défaut à changer à la première connexion.`);

  try {
    await sendWelcomeMail(admin);
    console.log(`✉️  Mail de bienvenue envoyé à ${admin.email}`);
  } catch (err) {
    console.warn(`⚠️  Mail non envoyé (deploy continue) : ${err.message}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed prod :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

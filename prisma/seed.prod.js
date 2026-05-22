// Seed de production minimal — crée uniquement l'administrateur par défaut
// Run: node prisma/seed.prod.js  (ou yarn seed:prod)

const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const email = "kysaymeric@gmail.com";
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@Pavillon2024!";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: passwordHash,
      firstName: "Aymeric",
      lastName: "Kouadio",
      role: Role.ADMIN,
      isActive: true,
      isFirstLogin: true,
    },
  });

  console.log(`✅ Admin créé / déjà existant : ${admin.email} (id: ${admin.id})`);
  console.log(`⚠️  Mot de passe par défaut à changer à la première connexion.`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed prod :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

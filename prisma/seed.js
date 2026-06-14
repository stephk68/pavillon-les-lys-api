// Prisma seed script — EventFolder model
// Run: npx prisma db seed

const {
  PrismaClient,
  Role,
  EventType,
  EventStatus,
  PaymentType,
  PaymentStatus,
  InventoryItemType,
  InventoryItemStatus,
} = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// ============================================================================
// HELPERS
// ============================================================================

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

let folderCounter = 0;
function generateFolderNumber() {
  folderCounter++;
  const year = new Date().getFullYear();
  return `EVT-${year}-${String(folderCounter).padStart(4, "0")}`;
}

// ============================================================================
// MAIN SEED
// ============================================================================

async function main() {
  console.log("🌱 Seeding database...\n");

  // ──────────────────────────────────────────
  // 1. USERS
  // ──────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@pavillon-les-lys.com" },
    update: {},
    create: {
      email: "admin@pavillon-les-lys.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "Pavillon",
      phone: "+225 07 00 00 00",
      role: Role.ADMIN,
      isFirstLogin: false,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  const manager = await prisma.user.upsert({
    where: { email: "manager@pavillon-les-lys.com" },
    update: {},
    create: {
      email: "manager@pavillon-les-lys.com",
      password: hashedPassword,
      firstName: "Fatou",
      lastName: "Diallo",
      phone: "+225 07 11 11 11",
      role: Role.EVENT_MANAGER,
      isFirstLogin: false,
    },
  });
  console.log(`✅ Manager: ${manager.email}`);

  const clients = [];
  const clientData = [
    {
      email: "client1@example.com",
      firstName: "Aminata",
      lastName: "Koné",
      phone: "+225 05 10 20 30",
    },
    {
      email: "client2@example.com",
      firstName: "Moussa",
      lastName: "Traoré",
      phone: "+225 07 40 50 60",
    },
    {
      email: "client3@example.com",
      firstName: "Awa",
      lastName: "Coulibaly",
      phone: "+225 01 70 80 90",
    },
  ];

  for (const cd of clientData) {
    const client = await prisma.user.upsert({
      where: { email: cd.email },
      update: {},
      create: {
        ...cd,
        password: hashedPassword,
        role: Role.CLIENT,
        isFirstLogin: true,
      },
    });
    clients.push(client);
    console.log(`✅ Client: ${client.email}`);
  }

  // ──────────────────────────────────────────
  // 2. INVENTORY ITEMS
  // ──────────────────────────────────────────
  const inventoryItems = [];
  const equipmentData = [
    {
      name: "Chaise dorée",
      category: "Mobilier",
      type: InventoryItemType.INTERNAL,
      totalStock: 200,
      unitPrice: 1500,
    },
    {
      name: "Table ronde 10 places",
      category: "Mobilier",
      type: InventoryItemType.INTERNAL,
      totalStock: 30,
      unitPrice: 5000,
    },
    {
      name: "Nappe blanche",
      category: "Décoration",
      type: InventoryItemType.INTERNAL,
      totalStock: 50,
      unitPrice: 2000,
    },
    {
      name: "Sono complète",
      category: "Son & Lumière",
      type: InventoryItemType.EXTERNAL_PROVIDER,
      totalStock: 5,
      unitPrice: 150000,
      providerName: "DJ Pro Abidjan",
      providerContact: "+225 07 99 88 77",
    },
    {
      name: "Éclairage LED",
      category: "Son & Lumière",
      type: InventoryItemType.INTERNAL,
      totalStock: 20,
      unitPrice: 10000,
    },
    {
      name: "Groupe électrogène",
      category: "Technique",
      type: InventoryItemType.EXTERNAL_PROVIDER,
      totalStock: 3,
      unitPrice: 75000,
      providerName: "Élec Services CI",
      providerContact: "+225 05 66 55 44",
    },
  ];

  for (const eq of equipmentData) {
    const item = await prisma.inventoryItem.create({
      data: {
        ...eq,
        availableStock: eq.totalStock,
        status: InventoryItemStatus.AVAILABLE,
      },
    });
    inventoryItems.push(item);
    console.log(`✅ Équipement: ${item.name} (x${item.totalStock})`);
  }

  // ──────────────────────────────────────────
  // 3. EVENT FOLDERS
  // ──────────────────────────────────────────

  // Folder 1: COMPLETED event (past)
  const folder1 = await prisma.eventFolder.create({
    data: {
      folderNumber: generateFolderNumber(),
      userId: clients[0].id,
      eventType: EventType.MARIAGE,
      start: daysAgo(30),
      end: daysAgo(29),
      attendees: 150,
      specialRequests: "Mariage Aminata & Ibrahim — thème or et blanc",
      status: EventStatus.COMPLETED,
      version: 2,
      items: {
        create: [
          {
            description: "Location salle principale",
            quantity: 1,
            unitPrice: 500000,
            totalPrice: 500000,
          },
          {
            description: "Formule restauration 150 personnes",
            quantity: 150,
            unitPrice: 15000,
            totalPrice: 2250000,
          },
          {
            description: "Décoration florale complète",
            quantity: 1,
            unitPrice: 200000,
            totalPrice: 200000,
          },
        ],
      },
      totalHT: 2950000,
      totalTTC: 3540000,
      createdBy: manager.id,
    },
  });
  console.log(`✅ Dossier: ${folder1.folderNumber} (COMPLETED)`);

  // Folder 2: BOOKED event (upcoming in 25 days)
  const folder2 = await prisma.eventFolder.create({
    data: {
      folderNumber: generateFolderNumber(),
      userId: clients[1].id,
      eventType: EventType.ANNIVERSAIRE,
      start: daysFromNow(25),
      end: daysFromNow(25),
      attendees: 80,
      specialRequests: "Anniversaire 40 ans — ambiance tropicale",
      status: EventStatus.BOOKED,
      version: 1,
      items: {
        create: [
          {
            description: "Location salle réception",
            quantity: 1,
            unitPrice: 300000,
            totalPrice: 300000,
          },
          {
            description: "Formule cocktail 80 personnes",
            quantity: 80,
            unitPrice: 8000,
            totalPrice: 640000,
          },
        ],
      },
      totalHT: 940000,
      totalTTC: 1128000,
      createdBy: manager.id,
    },
  });
  console.log(`✅ Dossier: ${folder2.folderNumber} (BOOKED)`);

  // Folder 3: QUOTED event (prospect received quote)
  const folder3 = await prisma.eventFolder.create({
    data: {
      folderNumber: generateFolderNumber(),
      userId: clients[2].id,
      eventType: EventType.PROFESSIONNEL,
      start: daysFromNow(45),
      end: daysFromNow(45),
      attendees: 200,
      specialRequests: "Séminaire entreprise — prévoir projecteur et micro",
      status: EventStatus.QUOTED,
      version: 1,
      items: {
        create: [
          {
            description: "Location grande salle",
            quantity: 1,
            unitPrice: 600000,
            totalPrice: 600000,
          },
          {
            description: "Café-pause matin + après-midi",
            quantity: 200,
            unitPrice: 3000,
            totalPrice: 600000,
          },
          {
            description: "Déjeuner buffet",
            quantity: 200,
            unitPrice: 10000,
            totalPrice: 2000000,
          },
        ],
      },
      totalHT: 3200000,
      totalTTC: 3840000,
      createdBy: manager.id,
    },
  });
  console.log(`✅ Dossier: ${folder3.folderNumber} (QUOTED)`);

  // Folder 4: PROSPECT (new inquiry)
  const folder4 = await prisma.eventFolder.create({
    data: {
      folderNumber: generateFolderNumber(),
      userId: clients[0].id,
      eventType: EventType.AUTRE,
      start: daysFromNow(60),
      end: daysFromNow(61),
      attendees: 50,
      specialRequests: "Réunion familiale — demande d'information",
      status: EventStatus.PROSPECT,
      version: 0,
      createdBy: admin.id,
    },
  });
  console.log(`✅ Dossier: ${folder4.folderNumber} (PROSPECT)`);

  // ──────────────────────────────────────────
  // 4. EQUIPMENT ASSIGNMENTS
  // ──────────────────────────────────────────
  await prisma.eventEquipment.createMany({
    data: [
      {
        eventFolderId: folder2.id,
        inventoryItemId: inventoryItems[0].id,
        quantityReserved: 80,
      },
      {
        eventFolderId: folder2.id,
        inventoryItemId: inventoryItems[1].id,
        quantityReserved: 8,
      },
      {
        eventFolderId: folder2.id,
        inventoryItemId: inventoryItems[4].id,
        quantityReserved: 10,
      },
    ],
  });
  console.log("✅ Équipements assignés au dossier BOOKED");

  // ──────────────────────────────────────────
  // 5. PAYMENTS
  // ──────────────────────────────────────────
  // Folder 1 (COMPLETED): all paid
  await prisma.payment.createMany({
    data: [
      {
        eventFolderId: folder1.id,
        amount: 1770000,
        type: PaymentType.ACOMPTE,
        status: PaymentStatus.PAID,
        dueDate: daysAgo(45),
        paidAt: daysAgo(44),
      },
      {
        eventFolderId: folder1.id,
        amount: 1770000,
        type: PaymentType.SOLDE,
        status: PaymentStatus.PAID,
        dueDate: daysAgo(31),
        paidAt: daysAgo(31),
      },
      {
        eventFolderId: folder1.id,
        amount: 100000,
        type: PaymentType.CAUTION,
        status: PaymentStatus.REFUNDED,
        dueDate: daysAgo(45),
        paidAt: daysAgo(44),
        isRefundable: true,
        refundedAmount: 100000,
        refundedAt: daysAgo(28),
      },
    ],
  });
  console.log("✅ Paiements dossier COMPLETED");

  // Folder 2 (BOOKED): acompte paid, solde pending
  await prisma.payment.createMany({
    data: [
      {
        eventFolderId: folder2.id,
        amount: 564000,
        type: PaymentType.ACOMPTE,
        status: PaymentStatus.PAID,
        dueDate: daysAgo(5),
        paidAt: daysAgo(4),
      },
      {
        eventFolderId: folder2.id,
        amount: 564000,
        type: PaymentType.SOLDE,
        status: PaymentStatus.PENDING,
        dueDate: daysFromNow(20),
      },
      {
        eventFolderId: folder2.id,
        amount: 100000,
        type: PaymentType.CAUTION,
        status: PaymentStatus.PENDING,
        dueDate: daysFromNow(20),
        isRefundable: true,
      },
    ],
  });
  console.log("✅ Paiements dossier BOOKED");

  // ──────────────────────────────────────────
  // 6. CHECKLIST ITEMS
  // ──────────────────────────────────────────
  const defaultChecklist = [
    "Visite des lieux avec le client",
    "Contrat signé et retourné",
    "Acompte reçu",
    "Plan de salle validé",
    "Confirmation finale du nombre d'invités",
  ];

  for (const folder of [folder1, folder2, folder3]) {
    for (let i = 0; i < defaultChecklist.length; i++) {
      await prisma.checklistItem.create({
        data: {
          eventFolderId: folder.id,
          title: defaultChecklist[i],
          displayOrder: i + 1,
          completed:
            folder.status === EventStatus.COMPLETED ||
            (folder.status === EventStatus.BOOKED && i < 3),
          completedAt:
            folder.status === EventStatus.COMPLETED ||
            (folder.status === EventStatus.BOOKED && i < 3)
              ? daysAgo(randomInt(5, 30))
              : null,
        },
      });
    }
  }
  console.log("✅ Checklist items créés");

  // ──────────────────────────────────────────
  // 7. FEEDBACK (for completed event)
  // ──────────────────────────────────────────
  await prisma.feedback.create({
    data: {
      userId: clients[0].id,
      eventFolderId: folder1.id,
      rating: 5,
      comment:
        "Magnifique prestation ! L'équipe a été très professionnelle et le lieu était parfait pour notre mariage. Merci pour tout !",
      isRead: true,
      response:
        "Merci beaucoup Aminata ! Ce fut un plaisir de vous accompagner pour ce beau jour.",
      respondedAt: daysAgo(25),
    },
  });
  console.log("✅ Feedback créé");

  // ──────────────────────────────────────────
  // 8. QUOTE DEFAULT ITEMS (libellés par défaut du devis)
  // ──────────────────────────────────────────
  const defaultQuoteLabels = [
    "Salle climatisée",
    "Sono + DJ",
    "Chaises",
    "Tables rondes de 10 personnes + nappes",
    "Table ronde gâteau",
    "Tables rectangulaires + nappes",
    "Assiettes plates",
    "Assiettes creuses",
    "Assiette dessert",
    "Verre à eau",
    "Verre à vin",
    "Verre à champagne",
    "Couverts VIP dorés (cuillères, fourchettes, couteaux)",
    "Futs à boissons",
    "Serveurs",
  ];
  const existingDefaults = await prisma.quoteDefaultItem.count();
  if (existingDefaults === 0) {
    await prisma.quoteDefaultItem.createMany({
      data: defaultQuoteLabels.map((label, i) => ({
        label,
        displayOrder: i + 1,
      })),
    });
    console.log("✅ Éléments de devis par défaut créés");
  }

  // ──────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────
  console.log("\n🎉 Seed terminé avec succès !");
  console.log("───────────────────────────────");
  console.log(`  👤 Utilisateurs: ${2 + clients.length}`);
  console.log(`  📦 Équipements: ${inventoryItems.length}`);
  console.log(`  📁 Dossiers événement: 4`);
  console.log(`  💰 Paiements: 6`);
  console.log(`  ✅ Checklist items: ${defaultChecklist.length * 3}`);
  console.log(`  ⭐ Feedbacks: 1`);
  console.log("───────────────────────────────");
  console.log("\n🔑 Comptes de test:");
  console.log("  Admin:   admin@pavillon-les-lys.com / Password123!");
  console.log("  Manager: manager@pavillon-les-lys.com / Password123!");
  console.log("  Client:  client1@example.com / Password123!");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

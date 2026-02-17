// Prisma seed script (JavaScript to run in production containers without ts-node)
// Enhanced seed with rich test data for all entities

const {
  PrismaClient,
  Prisma,
  Role,
  EventType,
  ReservationStatus,
  PaymentType,
  PaymentStatus,
  QuoteStatus,
  InventoryItemType,
  InventoryItemStatus,
} = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateQuoteNumber = () => {
  const date = new Date().toISOString().slice(0, 7).replace("-", "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DEV-${date}-${random}`;
};

// ============================================================================
// DATA GENERATORS
// ============================================================================

const firstNames = [
  "Alice", "Benoit", "Claire", "David", "Emma", "Francois", "Gabrielle",
  "Hugo", "Isabelle", "Jean", "Karine", "Louis", "Marie", "Nicolas",
  "Olivia", "Pierre", "Quentin", "Rose", "Stephane", "Thomas",
  "Ursule", "Vincent", "Wendy", "Xavier", "Yasmine", "Zacharie",
];

const lastNames = [
  "Kossi", "Akpo", "Dossou", "Agbeko", "Mensah", "Kodjo", "Amouzou",
  "Lawson", "Sossou", "Adjovi", "Hounsou", "Gbaguidi", "Tonou",
  "Amoussou", "Degnon", "Hounsa", "Zinsou", "Ahouandjinou", "Dossavi", "Houngbedji",
];

const eventDescriptions = {
  MARIAGE: [
    "Mariage traditionnel avec ceremonie religieuse",
    "Reception de mariage - 150 invites",
    "Celebration de mariage avec orchestre live",
    "Mariage intime en famille",
    "Grand mariage avec feu d artifice",
  ],
  ANNIVERSAIRE: [
    "Anniversaire 30 ans - Theme tropical",
    "Fete des 50 ans - Soiree elegante",
    "Sweet 16 - Theme princesse",
    "Anniversaire surprise 40 ans",
    "Fete des 25 ans de mariage",
  ],
  PROFESSIONNEL: [
    "Seminaire d entreprise - 2 jours",
    "Lancement de produit",
    "Conference annuelle",
    "Team building corporate",
    "Gala de fin d annee",
  ],
  AUTRE: [
    "Baby shower",
    "Bapteme",
    "Remise de diplomes",
    "Reunion de famille",
    "Soiree de charite",
  ],
};

const feedbackComments = [
  "Service excellent et equipe tres professionnelle. Merci !",
  "Magnifique lieu, parfait pour notre evenement. Nous recommandons vivement.",
  "Organisation impeccable du debut a la fin. L equipe a ete aux petits soins.",
  "Le cadre est somptueux, nos invites ont adore. Merci pour tout !",
  "Tres satisfait de la prestation. Rapport qualite/prix excellent.",
  "Quelques petits details a ameliorer mais dans l ensemble tres bien.",
  "Une experience inoubliable ! Le staff est vraiment competent.",
  "Nous avons passe une soiree magique. Merci a toute l equipe.",
  "Service client reactif et professionnel. Je recommande sans hesitation.",
  "La decoration etait magnifique, exactement ce qu on voulait.",
];

const checklistItems = [
  "Signature du contrat",
  "Acompte recu",
  "Plan de table valide",
  "Menu valide avec le traiteur",
  "Decoration confirmee",
  "Musique/DJ confirme",
  "Photographe reserve",
  "Fleuriste contacte",
  "Gateau commande",
  "Liste d invites finalisee",
  "Transport organise",
  "Hebergement verifie",
  "Animation prevue",
  "Solde encaisse",
  "Restitution des cles",
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log("Starting enhanced seed...");

  // Check if already seeded
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`Database already seeded (${userCount} users found)`);
    console.log("Clearing existing data for fresh seed...");

    // Clear all data in correct order (respecting foreign keys)
    await prisma.reservationEquipment.deleteMany();
    await prisma.checklistItem.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.user.deleteMany();

    console.log("Existing data cleared");
  }

  const passwordPlain = "Password123!";
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  // =========================================================================
  // 1. CREATE USERS (Admin, Managers, Clients)
  // =========================================================================
  console.log("Creating users...");

  const admin = await prisma.user.create({
    data: {
      email: "admin@pavillon-les-lys.fr",
      password: passwordHash,
      firstName: "Admin",
      lastName: "Root",
      role: Role.ADMIN,
      phone: "+22960000001",
      isFirstLogin: false,
    },
  });

  const managers = await Promise.all([
    prisma.user.create({
      data: {
        email: "manager@pavillon-les-lys.fr",
        password: passwordHash,
        firstName: "Event",
        lastName: "Manager",
        role: Role.EVENT_MANAGER,
        phone: "+22960000002",
        isFirstLogin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: "sophie.manager@pavillon-les-lys.fr",
        password: passwordHash,
        firstName: "Sophie",
        lastName: "Dubois",
        role: Role.EVENT_MANAGER,
        phone: "+22960000010",
        isFirstLogin: false,
      },
    }),
  ]);

  // Create 15 clients
  const clients = [];
  for (let i = 0; i < 15; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const client = await prisma.user.create({
      data: {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        password: passwordHash,
        firstName,
        lastName,
        role: Role.CLIENT,
        phone: `+2296${String(i + 100).padStart(7, "0")}`,
        isFirstLogin: i % 3 === 0,
        lastLoginAt: i % 2 === 0 ? daysAgo(randomInt(1, 30)) : null,
      },
    });
    clients.push(client);
  }

  console.log(`Created ${2 + managers.length + clients.length} users`);

  // =========================================================================
  // 2. CREATE INVENTORY ITEMS
  // =========================================================================
  console.log("Creating inventory items...");

  const inventoryItems = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        name: "Chaise Napoleon Doree",
        description: "Chaise elegante style empire avec finition doree",
        type: InventoryItemType.INTERNAL,
        category: "Mobilier",
        totalStock: 200,
        availableStock: 180,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 5000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Table Ronde 8 Places",
        description: "Table ronde en bois massif pour 8 convives",
        type: InventoryItemType.INTERNAL,
        category: "Mobilier",
        totalStock: 30,
        availableStock: 25,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 15000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Table Rectangulaire 10 Places",
        description: "Grande table pour banquets",
        type: InventoryItemType.INTERNAL,
        category: "Mobilier",
        totalStock: 20,
        availableStock: 18,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 20000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Nappe Blanche",
        description: "Nappe en lin blanc 3x3m",
        type: InventoryItemType.INTERNAL,
        category: "Linge",
        totalStock: 100,
        availableStock: 95,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 3000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Nappe Doree",
        description: "Nappe en satin dore 3x3m",
        type: InventoryItemType.INTERNAL,
        category: "Linge",
        totalStock: 50,
        availableStock: 45,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 5000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Centre de Table Floral",
        description: "Arrangement floral artificiel haut de gamme",
        type: InventoryItemType.INTERNAL,
        category: "Decoration",
        totalStock: 40,
        availableStock: 35,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 8000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Chandelier 5 branches",
        description: "Chandelier argente pour bougie",
        type: InventoryItemType.INTERNAL,
        category: "Decoration",
        totalStock: 30,
        availableStock: 28,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 12000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Guirlande LED 10m",
        description: "Guirlande lumineuse blanc chaud",
        type: InventoryItemType.INTERNAL,
        category: "Eclairage",
        totalStock: 50,
        availableStock: 45,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 6000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Sono Professionnelle JBL",
        description: "Pack sono complet avec 2 enceintes et table de mixage",
        type: InventoryItemType.EXTERNAL_PROVIDER,
        category: "Sonorisation",
        providerName: "SoundMaster Cotonou",
        providerContact: "+22997001122",
        totalStock: 5,
        availableStock: 4,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 75000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Projecteur Video HD",
        description: "Projecteur 4K avec ecran 3m",
        type: InventoryItemType.EXTERNAL_PROVIDER,
        category: "Audiovisuel",
        providerName: "TechEvent Pro",
        providerContact: "+22996554433",
        totalStock: 3,
        availableStock: 3,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 50000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Photobooth Premium",
        description: "Cabine photo avec impressions illimitees",
        type: InventoryItemType.EXTERNAL_PROVIDER,
        category: "Animation",
        providerName: "Flash Memories",
        providerContact: "+22998776655",
        totalStock: 2,
        availableStock: 2,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 100000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Machine a Fumee",
        description: "Machine a fumee professionnelle avec telecommande",
        type: InventoryItemType.INTERNAL,
        category: "Effets speciaux",
        totalStock: 4,
        availableStock: 3,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 25000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Arche de Mariage",
        description: "Arche florale metallique 2.5m x 2m",
        type: InventoryItemType.INTERNAL,
        category: "Decoration",
        totalStock: 3,
        availableStock: 2,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 45000,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        name: "Tapis Rouge 10m",
        description: "Tapis rouge evenementiel avec barrieres",
        type: InventoryItemType.INTERNAL,
        category: "Decoration",
        totalStock: 5,
        availableStock: 5,
        status: InventoryItemStatus.AVAILABLE,
        unitPrice: 20000,
      },
    }),
  ]);

  console.log(`Created ${inventoryItems.length} inventory items`);

  // =========================================================================
  // 3. CREATE RESERVATIONS (Mix of statuses and dates)
  // =========================================================================
  console.log("Creating reservations...");

  const reservations = [];
  const eventTypes = Object.values(EventType);

  // Past reservations (completed)
  for (let i = 0; i < 8; i++) {
    const client = clients[i % clients.length];
    const eventType = eventTypes[i % eventTypes.length];
    const startDaysAgo = randomInt(30, 180);
    const res = await prisma.reservation.create({
      data: {
        userId: client.id,
        eventType,
        start: daysAgo(startDaysAgo),
        end: daysAgo(startDaysAgo - 1),
        attendees: randomInt(20, 200),
        status: ReservationStatus.COMPLETED,
        description: randomElement(eventDescriptions[eventType]),
        specialRequests: i % 3 === 0 ? "Decoration speciale demandee par le client" : null,
        createdBy: randomElement(managers).id,
      },
    });
    reservations.push(res);
  }

  // Current/upcoming confirmed reservations
  for (let i = 0; i < 6; i++) {
    const client = clients[(i + 8) % clients.length];
    const eventType = eventTypes[i % eventTypes.length];
    const startDays = randomInt(5, 60);
    const res = await prisma.reservation.create({
      data: {
        userId: client.id,
        eventType,
        start: daysFromNow(startDays),
        end: daysFromNow(startDays + (i % 2 === 0 ? 0 : 1)),
        attendees: randomInt(30, 150),
        status: ReservationStatus.CONFIRMED,
        description: randomElement(eventDescriptions[eventType]),
        estimatedBudget: randomInt(500000, 3000000),
        createdBy: admin.id,
      },
    });
    reservations.push(res);
  }

  // Pending reservations (awaiting confirmation)
  for (let i = 0; i < 5; i++) {
    const client = clients[(i + 14) % clients.length];
    const eventType = eventTypes[i % eventTypes.length];
    const startDays = randomInt(15, 90);
    const res = await prisma.reservation.create({
      data: {
        userId: client.id,
        eventType,
        start: daysFromNow(startDays),
        end: daysFromNow(startDays),
        attendees: randomInt(25, 100),
        status: ReservationStatus.PENDING,
        description: randomElement(eventDescriptions[eventType]),
        specialRequests: "En attente de confirmation du budget et des disponibilites",
        createdBy: randomElement(managers).id,
      },
    });
    reservations.push(res);
  }

  // Canceled reservations
  for (let i = 0; i < 3; i++) {
    const client = clients[i % clients.length];
    const eventType = eventTypes[i % eventTypes.length];
    const res = await prisma.reservation.create({
      data: {
        userId: client.id,
        eventType,
        start: daysFromNow(randomInt(20, 60)),
        end: daysFromNow(randomInt(21, 61)),
        attendees: randomInt(20, 80),
        status: ReservationStatus.CANCELED,
        description: randomElement(eventDescriptions[eventType]),
        specialRequests: "Annulation demandee par le client",
        createdBy: admin.id,
      },
    });
    reservations.push(res);
  }

  console.log(`Created ${reservations.length} reservations`);

  // =========================================================================
  // 4. CREATE QUOTES (New format with QuoteItems)
  // =========================================================================
  console.log("Creating quotes...");

  const quoteItemsData = [
    { description: "Location salle principale", qty: 1, price: 350000 },
    { description: "Location terrasse exterieure", qty: 1, price: 150000 },
    { description: "Forfait decoration standard", qty: 1, price: 200000 },
    { description: "Forfait decoration premium", qty: 1, price: 400000 },
    { description: "Service traiteur (par personne)", qty: "attendees", price: 8500 },
    { description: "Boissons soft (par personne)", qty: "attendees", price: 2500 },
    { description: "Pack boissons alcoolisees (par personne)", qty: "attendees", price: 5000 },
    { description: "Service DJ et sonorisation", qty: 1, price: 150000 },
    { description: "Photographe professionnel", qty: 1, price: 100000 },
    { description: "Videaste", qty: 1, price: 150000 },
    { description: "Fleuriste - compositions tables", qty: "tables", price: 15000 },
    { description: "Gateau de mariage (par personne)", qty: "attendees", price: 3000 },
    { description: "Animation pour enfants", qty: 1, price: 75000 },
    { description: "Feu d artifice", qty: 1, price: 250000 },
    { description: "Voiturier", qty: 1, price: 50000 },
  ];

  const quotes = [];
  const confirmedAndCompletedRes = reservations.filter(
    (r) => r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.COMPLETED
  );

  for (let i = 0; i < confirmedAndCompletedRes.length; i++) {
    const res = confirmedAndCompletedRes[i];
    const client = clients.find((c) => c.id === res.userId) || clients[0];

    const selectedItems = [];
    const numItems = randomInt(4, 8);
    const usedIndices = new Set();

    selectedItems.push({
      description: quoteItemsData[0].description,
      quantity: 1,
      unitPrice: quoteItemsData[0].price,
    });

    while (selectedItems.length < numItems) {
      const idx = randomInt(1, quoteItemsData.length - 1);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        const item = quoteItemsData[idx];
        let qty = 1;
        if (item.qty === "attendees") qty = res.attendees;
        else if (item.qty === "tables") qty = Math.ceil(res.attendees / 8);
        else qty = item.qty;

        selectedItems.push({
          description: item.description,
          quantity: qty,
          unitPrice: item.price,
        });
      }
    }

    const totalHT = selectedItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const vatRate = 18;
    const totalTTC = totalHT * (1 + vatRate / 100);

    const quoteStatus = res.status === ReservationStatus.COMPLETED
      ? QuoteStatus.ACCEPTED
      : res.status === ReservationStatus.CONFIRMED
        ? randomElement([QuoteStatus.ACCEPTED, QuoteStatus.SENT])
        : QuoteStatus.DRAFT;

    const quote = await prisma.quote.create({
      data: {
        number: generateQuoteNumber(),
        userId: client.id,
        reservationId: res.id,
        totalHT: new Prisma.Decimal(totalHT),
        vatRate: new Prisma.Decimal(vatRate),
        totalTTC: new Prisma.Decimal(totalTTC),
        validUntil: daysFromNow(30),
        status: quoteStatus,
        items: {
          create: selectedItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
          })),
        },
      },
    });
    quotes.push(quote);
  }

  // Create some standalone quotes (not linked to reservations)
  for (let i = 0; i < 5; i++) {
    const client = clients[randomInt(0, clients.length - 1)];
    const selectedItems = [
      { description: "Location salle - Devis preliminaire", quantity: 1, unitPrice: 350000 },
      { description: "Service traiteur estime", quantity: randomInt(50, 100), unitPrice: 8500 },
      { description: "Forfait decoration", quantity: 1, unitPrice: randomInt(200000, 400000) },
    ];

    const totalHT = selectedItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const totalTTC = totalHT * 1.18;

    const quote = await prisma.quote.create({
      data: {
        number: generateQuoteNumber(),
        userId: client.id,
        totalHT: new Prisma.Decimal(totalHT),
        vatRate: new Prisma.Decimal(18),
        totalTTC: new Prisma.Decimal(totalTTC),
        validUntil: daysFromNow(randomInt(15, 45)),
        status: randomElement([QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.REJECTED]),
        items: {
          create: selectedItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
          })),
        },
      },
    });
    quotes.push(quote);
  }

  console.log(`Created ${quotes.length} quotes`);

  // =========================================================================
  // 5. CREATE PAYMENTS
  // =========================================================================
  console.log("Creating payments...");

  let paymentsCount = 0;
  for (const res of reservations) {
    const quote = quotes.find((q) => q.reservationId === res.id);
    const baseAmount = quote ? Number(quote.totalTTC) : randomInt(500000, 2000000);

    if (res.status === ReservationStatus.COMPLETED) {
      await prisma.payment.create({
        data: {
          reservationId: res.id,
          amount: new Prisma.Decimal(Math.round(baseAmount * 0.3)),
          type: PaymentType.ACOMPTE,
          status: PaymentStatus.PAID,
          paidAt: daysAgo(randomInt(60, 120)),
          userId: admin.id,
        },
      });
      await prisma.payment.create({
        data: {
          reservationId: res.id,
          amount: new Prisma.Decimal(Math.round(baseAmount * 0.7)),
          type: PaymentType.SOLDE,
          status: PaymentStatus.PAID,
          paidAt: daysAgo(randomInt(30, 59)),
          userId: admin.id,
        },
      });
      await prisma.payment.create({
        data: {
          reservationId: res.id,
          amount: new Prisma.Decimal(100000),
          type: PaymentType.CAUTION,
          status: PaymentStatus.REFUNDED,
          paidAt: daysAgo(randomInt(25, 35)),
          userId: admin.id,
        },
      });
      paymentsCount += 3;
    } else if (res.status === ReservationStatus.CONFIRMED) {
      await prisma.payment.create({
        data: {
          reservationId: res.id,
          amount: new Prisma.Decimal(Math.round(baseAmount * 0.3)),
          type: PaymentType.ACOMPTE,
          status: PaymentStatus.PAID,
          paidAt: daysAgo(randomInt(5, 20)),
          userId: randomElement(managers).id,
        },
      });
      await prisma.payment.create({
        data: {
          reservationId: res.id,
          amount: new Prisma.Decimal(Math.round(baseAmount * 0.7)),
          type: PaymentType.SOLDE,
          status: PaymentStatus.PENDING,
          dueDate: daysFromNow(randomInt(5, 30)),
          userId: randomElement(managers).id,
        },
      });
      paymentsCount += 2;
    } else if (res.status === ReservationStatus.PENDING) {
      await prisma.payment.create({
        data: {
          reservationId: res.id,
          amount: new Prisma.Decimal(Math.round(baseAmount * 0.3)),
          type: PaymentType.ACOMPTE,
          status: PaymentStatus.PENDING,
          dueDate: daysFromNow(randomInt(7, 14)),
          userId: admin.id,
        },
      });
      paymentsCount += 1;
    }
  }

  console.log(`Created ${paymentsCount} payments`);

  // =========================================================================
  // 6. CREATE CHECKLIST ITEMS
  // =========================================================================
  console.log("Creating checklist items...");

  let checklistCount = 0;
  for (const res of reservations) {
    const numItems = randomInt(5, 10);
    const selectedChecklist = [];
    const usedIndices = new Set();

    while (selectedChecklist.length < numItems) {
      const idx = randomInt(0, checklistItems.length - 1);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        selectedChecklist.push(checklistItems[idx]);
      }
    }

    for (let i = 0; i < selectedChecklist.length; i++) {
      const isCompleted =
        res.status === ReservationStatus.COMPLETED ||
        (res.status === ReservationStatus.CONFIRMED && i < numItems * 0.6) ||
        (res.status === ReservationStatus.PENDING && i < 2);

      await prisma.checklistItem.create({
        data: {
          reservationId: res.id,
          title: selectedChecklist[i],
          completed: isCompleted,
          assignedTo: i % 2 === 0 ? randomElement(managers).id : null,
          dueAt: daysFromNow(randomInt(-10, 30)),
        },
      });
      checklistCount++;
    }
  }

  console.log(`Created ${checklistCount} checklist items`);

  // =========================================================================
  // 7. CREATE FEEDBACK
  // =========================================================================
  console.log("Creating feedback...");

  const completedRes = reservations.filter((r) => r.status === ReservationStatus.COMPLETED);
  let feedbackCount = 0;

  for (const res of completedRes) {
    if (Math.random() > 0.3) {
      const client = clients.find((c) => c.id === res.userId) || clients[0];
      await prisma.feedback.create({
        data: {
          userId: client.id,
          reservationId: res.id,
          rating: randomInt(3, 5),
          comment: randomElement(feedbackComments),
        },
      });
      feedbackCount++;
    }
  }

  console.log(`Created ${feedbackCount} feedback entries`);

  // =========================================================================
  // 8. CREATE RESERVATION EQUIPMENT (Link inventory to reservations)
  // =========================================================================
  console.log("Linking equipment to reservations...");

  let equipmentLinkCount = 0;
  const activeReservations = reservations.filter(
    (r) => r.status === ReservationStatus.CONFIRMED || r.status === ReservationStatus.COMPLETED
  );

  for (const res of activeReservations) {
    const numEquipment = randomInt(3, 7);
    const usedItems = new Set();

    for (let i = 0; i < numEquipment; i++) {
      const item = inventoryItems[randomInt(0, inventoryItems.length - 1)];
      if (usedItems.has(item.id)) continue;
      usedItems.add(item.id);

      const maxQty = Math.min(
        item.totalStock,
        item.category === "Mobilier" ? Math.ceil(res.attendees / 8) * 2 : 5
      );
      const qty = randomInt(1, Math.max(1, maxQty));

      await prisma.reservationEquipment.create({
        data: {
          reservationId: res.id,
          inventoryItemId: item.id,
          quantityReserved: qty,
          returnedQuantity: res.status === ReservationStatus.COMPLETED ? qty : 0,
          notes: res.status === ReservationStatus.COMPLETED && Math.random() > 0.8
            ? "Leger dommage constate"
            : null,
        },
      });
      equipmentLinkCount++;
    }
  }

  console.log(`Created ${equipmentLinkCount} equipment links`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n==================================================");
  console.log("SEED COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
  console.log(`
Summary:
   - Users: ${2 + managers.length + clients.length} (1 admin, ${managers.length} managers, ${clients.length} clients)
   - Inventory Items: ${inventoryItems.length}
   - Reservations: ${reservations.length}
   - Quotes: ${quotes.length}
   - Payments: ${paymentsCount}
   - Checklist Items: ${checklistCount}
   - Feedback: ${feedbackCount}
   - Equipment Links: ${equipmentLinkCount}

Test Credentials:
   - Admin: admin@pavillon-les-lys.fr / Password123!
   - Manager: manager@pavillon-les-lys.fr / Password123!
   - Client: alice.kossi@example.com / Password123!
`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

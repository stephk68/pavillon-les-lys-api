// Prisma seed script (JavaScript to run in production containers without ts-node)
// Seeds: Users (admin, manager, clients), Reservations, Quotes, Payments, ChecklistItems, Feedback

const {
  PrismaClient,
  Prisma,
  Role,
  EventType,
  ReservationStatus,
  PaymentType,
  PaymentStatus,
} = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔰 Starting seed...');

  // Idempotency: if users already exist, skip full seed
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`ℹ️  Seed skipped (users already exist: ${userCount})`);
    return;
  }

  const passwordPlain = 'Password123!';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  // 1) Users
  const [admin, manager, client1, client2] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@pavillon-les-lys.fr',
        password: passwordHash,
        firstName: 'Admin',
        lastName: 'Root',
        role: Role.ADMIN,
        phone: '+22960000001',
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@pavillon-les-lys.fr',
        password: passwordHash,
        firstName: 'Event',
        lastName: 'Manager',
        role: Role.EVENT_MANAGER,
        phone: '+22960000002',
      },
    }),
    prisma.user.create({
      data: {
        email: 'client1@pavillon-les-lys.fr',
        password: passwordHash,
        firstName: 'Alice',
        lastName: 'Kossi',
        role: Role.CLIENT,
        phone: '+22960000003',
      },
    }),
    prisma.user.create({
      data: {
        email: 'client2@pavillon-les-lys.fr',
        password: passwordHash,
        firstName: 'Benoit',
        lastName: 'Akpo',
        role: Role.CLIENT,
        phone: '+22960000004',
      },
    }),
  ]);

  // 2) Reservations (3 examples)
  const now = new Date();
  const daysFromNow = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const reservations = await prisma.$transaction([
    prisma.reservation.create({
      data: {
        userId: client1.id,
        eventType: EventType.MARIAGE,
        start: daysFromNow(30),
        end: daysFromNow(31),
        attendees: 120,
        status: ReservationStatus.CONFIRMED,
      },
    }),
    prisma.reservation.create({
      data: {
        userId: client2.id,
        eventType: EventType.ANNIVERSAIRE,
        start: daysFromNow(10),
        end: daysFromNow(10),
        attendees: 30,
        status: ReservationStatus.PENDING,
      },
    }),
    prisma.reservation.create({
      data: {
        userId: client1.id,
        eventType: EventType.PROFESSIONNEL,
        start: daysFromNow(60),
        end: daysFromNow(60),
        attendees: 80,
        status: ReservationStatus.PENDING,
      },
    }),
  ]);

  // 3) Quotes for reservations
  for (const res of reservations) {
    const items = [
      { label: 'Location salle', qty: 1, unit: 'forfait', price: 300000 },
      { label: 'Décoration', qty: 1, unit: 'forfait', price: 150000 },
      { label: 'Traiteur', qty: res.attendees, unit: 'pers', price: 8000 },
    ];
    const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const quote = await prisma.quote.create({
      data: {
        items,
        totalAmount: new Prisma.Decimal(total),
        currency: 'XOF',
      },
    });
    await prisma.reservation.update({
      where: { id: res.id },
      data: { quoteId: quote.id },
    });
  }

  // 4) Payments
  for (const res of reservations) {
    const acompte = await prisma.payment.create({
      data: {
        reservationId: res.id,
        amount: new Prisma.Decimal(200000),
        currency: 'XOF',
        type: PaymentType.ACOMPTE,
        status: PaymentStatus.PAID,
        paidAt: daysFromNow(-1),
      },
    });
    await prisma.payment.create({
      data: {
        reservationId: res.id,
        amount: new Prisma.Decimal(300000),
        currency: 'XOF',
        type: PaymentType.SOLDE,
        status: PaymentStatus.PENDING,
        dueDate: daysFromNow(7),
        userId: admin.id,
      },
    });
  }

  // 5) Checklist items
  for (const res of reservations) {
    await prisma.checklistItem.createMany({
      data: [
        {
          reservationId: res.id,
          title: 'Signature du contrat',
          completed: true,
        },
        { reservationId: res.id, title: 'Acompte reçu' },
        { reservationId: res.id, title: 'Plan de table' },
      ],
    });
  }

  // 6) Feedback (for confirmed reservation)
  const confirmed = reservations.find(
    (r) => r.status === ReservationStatus.CONFIRMED,
  );
  if (confirmed) {
    await prisma.feedback.create({
      data: {
        userId: client1.id,
        reservationId: confirmed.id,
        rating: 5,
        comment: 'Service excellent et équipe très professionnelle. Merci !',
      },
    });
  }

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

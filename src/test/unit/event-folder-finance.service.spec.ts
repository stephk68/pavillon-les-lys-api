import { EventStatus, PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import {
  EventFolderService,
  getCautionAmount,
  getDepositRequired,
} from "../../resources/event-folder/event-folder.service";

/**
 * Règles financières du dossier : acompte / caution du dossier, passage en
 * READY (total intégralement payé + caution complète), recalcul des
 * paiements en attente après un changement de prix.
 */
const D = (n: number) => new Prisma.Decimal(n);

function baseFolder(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    folderNumber: "EVT-2026-0001",
    userId: "u1",
    status: EventStatus.BOOKED,
    totalTTC: D(1_000_000),
    depositAmount: D(0),
    cautionAmount: D(0),
    schedules: [{ date: new Date("2020-01-01"), startTime: "10:00", endTime: "22:00" }],
    items: [{ description: "Salle", quantity: 1 }],
    user: { email: "c@example.com", firstName: "C", lastName: "L" },
    ...overrides,
  };
}

const pay = (
  type: PaymentType,
  amount: number,
  status: PaymentStatus = PaymentStatus.PAID,
) => ({
  id: `${type}-${amount}-${status}`,
  type,
  amount: D(amount),
  status,
});

function makeService(folder: any, payments: any[]) {
  const prisma: any = {
    eventFolder: {
      findUnique: jest.fn().mockResolvedValue({ ...folder, payments }),
      update: jest.fn().mockImplementation(({ data }) => ({ ...folder, ...data })),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue(payments),
      update: jest.fn().mockResolvedValue({}),
    },
    checklistItem: { updateMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  // Transaction interactive (callback) ou tableau de requêtes
  prisma.$transaction = jest.fn((arg: any) =>
    typeof arg === "function" ? arg(prisma) : Promise.all(arg),
  );
  const audit = { create: jest.fn().mockResolvedValue({}) };
  const mail = { sendFeedbackRequest: jest.fn().mockResolvedValue(undefined) };
  const service = new EventFolderService(prisma, audit as any, mail as any, {} as any);
  return { service, prisma };
}

describe("Montants de référence du dossier", () => {
  const OLD = process.env.CAUTION_AMOUNT;
  afterEach(() => (process.env.CAUTION_AMOUNT = OLD));

  it("la caution du dossier fait foi, sinon la valeur globale", () => {
    process.env.CAUTION_AMOUNT = "100000";
    expect(getCautionAmount({ cautionAmount: D(150000) })).toBe(150000);
    expect(getCautionAmount({ cautionAmount: D(0) })).toBe(100000);
  });

  it("l'acompte du dossier fait foi, sinon 50 % du TTC", () => {
    expect(getDepositRequired({ depositAmount: D(300000), totalTTC: D(1_000_000) })).toBe(300000);
    expect(getDepositRequired({ depositAmount: D(0), totalTTC: D(1_000_000) })).toBe(500000);
  });
});

describe("Passage en READY", () => {
  beforeEach(() => (process.env.CAUTION_AMOUNT = "100000"));

  it("refuse un solde partiel (avant : n'importe quel solde > 0 suffisait)", async () => {
    const { service } = makeService(baseFolder(), [
      pay(PaymentType.ACOMPTE, 500000),
      pay(PaymentType.SOLDE, 1),
      pay(PaymentType.CAUTION, 100000),
    ]);
    await expect(service.transitionStatus("f1", EventStatus.READY, "admin")).rejects.toThrow(
      /pas soldé.*reste : 499999 XOF/,
    );
  });

  it("refuse une caution incomplète", async () => {
    const { service } = makeService(baseFolder({ cautionAmount: D(150000) }), [
      pay(PaymentType.ACOMPTE, 500000),
      pay(PaymentType.SOLDE, 500000),
      pay(PaymentType.CAUTION, 100000),
    ]);
    await expect(service.transitionStatus("f1", EventStatus.READY, "admin")).rejects.toThrow(
      /Caution incomplète. Requise : 150000/,
    );
  });

  it("accepte un dossier soldé avec caution complète, sans cocher la checklist", async () => {
    const { service, prisma } = makeService(baseFolder(), [
      pay(PaymentType.ACOMPTE, 500000),
      pay(PaymentType.SOLDE, 500000),
      pay(PaymentType.CAUTION, 100000),
    ]);
    await service.transitionStatus("f1", EventStatus.READY, "admin");
    expect(prisma.eventFolder.update).toHaveBeenCalled();
    expect(prisma.checklistItem.updateMany).not.toHaveBeenCalled();
  });
});

describe("Recalcul des paiements en attente après un changement de prix", () => {
  it("réaligne acompte et solde en attente sur le nouveau total", async () => {
    const folder = baseFolder({ status: EventStatus.QUOTED, totalTTC: D(1_200_000) });
    const { service, prisma } = makeService(folder, [
      pay(PaymentType.ACOMPTE, 500000, PaymentStatus.PENDING),
      pay(PaymentType.SOLDE, 500000, PaymentStatus.PENDING),
      pay(PaymentType.CAUTION, 100000, PaymentStatus.PENDING),
    ]);
    process.env.CAUTION_AMOUNT = "100000";

    const changed = await (service as any).resyncPendingPayments("f1");

    expect(changed).toBe(true);
    const amounts = prisma.payment.update.mock.calls.map((c: any) => [c[0].where.id, Number(c[0].data.amount)]);
    expect(amounts).toEqual([
      ["ACOMPTE-500000-PENDING", 600000],
      ["SOLDE-500000-PENDING", 600000],
    ]);
  });

  it("ne touche jamais un paiement validé : le solde absorbe la différence", async () => {
    const folder = baseFolder({ totalTTC: D(1_200_000) });
    const { service, prisma } = makeService(folder, [
      pay(PaymentType.ACOMPTE, 500000, PaymentStatus.PAID),
      pay(PaymentType.SOLDE, 500000, PaymentStatus.PENDING),
      pay(PaymentType.CAUTION, 100000, PaymentStatus.PENDING),
    ]);
    process.env.CAUTION_AMOUNT = "100000";

    await (service as any).resyncPendingPayments("f1");

    const calls = prisma.payment.update.mock.calls.map((c: any) => [c[0].where.id, Number(c[0].data.amount)]);
    expect(calls).toEqual([["SOLDE-500000-PENDING", 700000]]);
  });
});

describe("Passage PROSPECT → QUOTED (la salle commence à être bloquée)", () => {
  const prospect = () =>
    baseFolder({
      status: EventStatus.PROSPECT,
      schedules: [{ date: new Date("2027-06-12"), startTime: "14:00", endTime: "23:00" }],
    });

  it("refuse si un autre dossier bloque déjà ce créneau, sous verrou", async () => {
    const { service, prisma } = makeService(prospect(), []);
    prisma.eventSchedule = {
      findMany: jest.fn().mockResolvedValue([
        { date: new Date("2027-06-12"), startTime: "18:00", endTime: "02:00" },
      ]),
    };

    await expect(service.transitionStatus("f1", EventStatus.QUOTED, "admin")).rejects.toThrow(
      "pas disponible",
    );
    expect(prisma.$executeRaw).toHaveBeenCalled(); // verrou pris
    expect(prisma.eventFolder.update).not.toHaveBeenCalled();
  });

  it("accepte si le créneau est libre", async () => {
    const { service, prisma } = makeService(prospect(), []);
    prisma.eventSchedule = { findMany: jest.fn().mockResolvedValue([]) };
    // Pas de PDF/mail dans ce test : on neutralise l'envoi du contrat.
    jest.spyOn(service, "buildQuotePdfBuffer").mockResolvedValue(Buffer.from(""));
    (service as any).mailService.sendContract = jest.fn().mockResolvedValue(undefined);

    await service.transitionStatus("f1", EventStatus.QUOTED, "admin");
    expect(prisma.eventFolder.update).toHaveBeenCalled();
  });
});

import { EventStatus } from "@prisma/client";
import {
  intervalsOf,
  reservedOverlapping,
  upcomingPeakReserved,
} from "../../common/utils/schedule.util";

/**
 * Stock du matériel calculé par date : une assignation n'immobilise le
 * matériel que sur les créneaux de son dossier, et seulement tant que le
 * dossier est actif (PROSPECT → READY).
 */
const res = (
  folderId: string,
  qty: number,
  date: string,
  status: EventStatus = EventStatus.BOOKED,
  startTime = "14:00",
  endTime = "23:00",
) => ({
  quantityReserved: qty,
  eventFolderId: folderId,
  eventFolder: { status, schedules: [{ date, startTime, endTime }] },
});

const slot = (date: string, startTime = "14:00", endTime = "23:00") =>
  intervalsOf([{ date, startTime, endTime }]);

describe("reservedOverlapping", () => {
  it("ne compte que les dossiers qui chevauchent le créneau demandé", () => {
    const reservations = [res("a", 50, "2027-06-12"), res("b", 30, "2027-12-01")];
    expect(reservedOverlapping(reservations, slot("2027-06-12"))).toBe(50);
    // Avant : les 80 étaient bloqués quelles que soient les dates.
    expect(reservedOverlapping(reservations, slot("2027-09-01"))).toBe(0);
  });

  it("libère le matériel des dossiers annulés ou terminés", () => {
    const reservations = [
      res("a", 50, "2027-06-12", EventStatus.CANCELLED),
      res("b", 20, "2027-06-12", EventStatus.COMPLETED),
      res("c", 10, "2027-06-12", EventStatus.PROSPECT),
    ];
    expect(reservedOverlapping(reservations, slot("2027-06-12"))).toBe(10);
  });

  it("ignore le dossier pour lequel on calcule (modification de quantité)", () => {
    const reservations = [res("a", 50, "2027-06-12"), res("b", 20, "2027-06-12", EventStatus.BOOKED, "08:00", "12:00")];
    expect(reservedOverlapping(reservations, slot("2027-06-12", "10:00", "13:00"), "a")).toBe(20);
  });

  it("prend en compte les créneaux qui passent minuit", () => {
    const reservations = [res("a", 40, "2027-06-12", EventStatus.BOOKED, "20:00", "03:00")];
    // Le lendemain matin, le matériel est encore pris jusqu'à 3 h
    expect(reservedOverlapping(reservations, slot("2027-06-13", "01:00", "05:00"))).toBe(40);
    expect(reservedOverlapping(reservations, slot("2027-06-13", "10:00", "18:00"))).toBe(0);
  });
});

describe("upcomingPeakReserved", () => {
  const now = new Date("2027-01-01T00:00:00");

  it("retient le pic des réservations simultanées à venir, pas leur somme", () => {
    const reservations = [
      res("a", 50, "2027-06-12"),
      res("b", 30, "2027-06-12", EventStatus.BOOKED, "10:00", "13:00"), // même jour, pas de chevauchement
      res("c", 40, "2027-08-20"),
    ];
    expect(upcomingPeakReserved(reservations, now)).toBe(50);
  });

  it("additionne les réservations qui se chevauchent", () => {
    const reservations = [
      res("a", 50, "2027-06-12"),
      res("b", 30, "2027-06-12", EventStatus.QUOTED, "20:00", "02:00"),
    ];
    expect(upcomingPeakReserved(reservations, now)).toBe(80);
  });

  it("ignore les événements passés (le matériel revient sans action manuelle)", () => {
    const reservations = [res("a", 50, "2026-06-12")];
    expect(upcomingPeakReserved(reservations, now)).toBe(0);
  });
});

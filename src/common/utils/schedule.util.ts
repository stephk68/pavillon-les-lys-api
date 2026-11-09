import { EventStatus } from "@prisma/client";

export type ScheduleLike = {
  date: string | Date;
  startTime: string;
  endTime: string;
};

/**
 * Intervalle absolu [début, fin) d'un créneau. Si endTime <= startTime, le
 * créneau passe minuit et se termine le lendemain (overnight).
 */
export function toInterval(
  date: string | Date,
  startTime: string,
  endTime: string,
): [Date, Date] {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = new Date(base);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(base);
  end.setHours(eh, em, 0, 0);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  return [start, end];
}

export function intervalsOf(schedules: ScheduleLike[]): [Date, Date][] {
  return schedules.map((s) => toInterval(s.date, s.startTime, s.endTime));
}

/** Deux ensembles de créneaux se chevauchent-ils ? */
export function overlaps(a: [Date, Date][], b: [Date, Date][]): boolean {
  return a.some(([as, ae]) => b.some(([bs, be]) => as < be && ae > bs));
}

/**
 * Statuts dans lesquels un dossier immobilise le matériel qui lui est
 * assigné. CANCELLED et COMPLETED le libèrent.
 */
export const EQUIPMENT_HOLDING_STATUSES: EventStatus[] = [
  EventStatus.PROSPECT,
  EventStatus.QUOTED,
  EventStatus.BOOKED,
  EventStatus.READY,
];

type Reservation = {
  quantityReserved: number;
  eventFolderId: string;
  eventFolder: { status: EventStatus; schedules: ScheduleLike[] };
};

/**
 * Quantité d'un matériel immobilisée sur les créneaux `target` par les
 * autres dossiers actifs (le dossier `excludeFolderId` est ignoré).
 */
export function reservedOverlapping(
  reservations: Reservation[],
  target: [Date, Date][],
  excludeFolderId?: string,
): number {
  return reservations
    .filter(
      (r) =>
        r.eventFolderId !== excludeFolderId &&
        EQUIPMENT_HOLDING_STATUSES.includes(r.eventFolder.status) &&
        overlaps(intervalsOf(r.eventFolder.schedules), target),
    )
    .reduce((sum, r) => sum + r.quantityReserved, 0);
}

/**
 * Pic de réservation à venir : pour chaque dossier actif futur, quantité
 * immobilisée sur ses créneaux (lui compris), et on retient le maximum.
 * Sert à afficher « disponible » dans la liste d'inventaire : c'est le
 * stock garanti libre sur toute la période à venir.
 */
export function upcomingPeakReserved(
  reservations: Reservation[],
  now = new Date(),
): number {
  const upcoming = reservations.filter(
    (r) =>
      EQUIPMENT_HOLDING_STATUSES.includes(r.eventFolder.status) &&
      intervalsOf(r.eventFolder.schedules).some(([, end]) => end > now),
  );
  let peak = 0;
  for (const r of upcoming) {
    const target = intervalsOf(r.eventFolder.schedules);
    const load =
      r.quantityReserved + reservedOverlapping(upcoming, target, r.eventFolderId);
    peak = Math.max(peak, load);
  }
  return peak;
}

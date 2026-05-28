import { BookingStatus } from "@prisma/client";

export const bookingStatusLabels: Record<BookingStatus, string> = {
  OPEN: "Offen",
  PAID: "Bezahlt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

export const spotStateLabels = {
  FREE: "Frei",
  RESERVED: "Reserviert",
  OCCUPIED: "Belegt",
} as const;

export function normalizeDate(dateInput: string): Date {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Ungültiges Datum");
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function diffDays(arrivalDate: Date, departureDate: Date): number {
  const ms = departureDate.getTime() - arrivalDate.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function intersects(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

export function centsToEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

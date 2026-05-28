import { BookingStatus } from "./types";

export const bookingStatusLabel: Record<BookingStatus, string> = {
  OPEN: "Offen",
  PAID: "Bezahlt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

export const bookingStatusOptions: BookingStatus[] = ["OPEN", "PAID", "COMPLETED"];

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

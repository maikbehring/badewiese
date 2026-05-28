import nodemailer from "nodemailer";

export async function sendBookingConfirmationMail(params: {
  recipient: string;
  customerName: string;
  bookingId: number;
  placeName: string;
  arrivalDate: string;
  departureDate: string;
  totalPrice: string;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  const transport = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 587),
        secure: false,
        auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });

  await transport.sendMail({
    from: SMTP_FROM ?? "noreply@badewiese-manager.local",
    to: params.recipient,
    subject: `Buchungsbestaetigung #${params.bookingId}`,
    text: [
      `Hallo ${params.customerName},`,
      "",
      "vielen Dank fuer Ihre Buchung an der Badewiese.",
      `Platz: ${params.placeName}`,
      `Anreise: ${params.arrivalDate}`,
      `Abreise: ${params.departureDate}`,
      `Gesamtpreis: ${params.totalPrice}`,
      "",
      "Viele Gruesse\nBadewiese Team",
    ].join("\n"),
  });
}

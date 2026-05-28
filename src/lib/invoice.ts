import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateInvoicePdf(payload: {
  bookingId: number;
  customerName: string;
  customerEmail: string;
  placeName: string;
  arrivalDate: string;
  departureDate: string;
  totalDays: number;
  unitPrice: string;
  totalPrice: string;
  statusLabel: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Badewiese Manager - Rechnung", {
    x: 50,
    y: 790,
    size: 18,
    font: bold,
    color: rgb(0.02, 0.32, 0.45),
  });

  const lines = [
    `Rechnungsnummer: BW-${payload.bookingId.toString().padStart(6, "0")}`,
    `Kunde: ${payload.customerName}`,
    `E-Mail: ${payload.customerEmail}`,
    `Stellplatz: ${payload.placeName}`,
    `Anreise: ${payload.arrivalDate}`,
    `Abreise: ${payload.departureDate}`,
    `Tage: ${payload.totalDays}`,
    `Preis/Tag: ${payload.unitPrice}`,
    `Gesamt: ${payload.totalPrice}`,
    `Status: ${payload.statusLabel}`,
  ];

  let y = 740;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 24;
  }

  page.drawText("Vielen Dank fuer Ihren Aufenthalt.", {
    x: 50,
    y: y - 20,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  return Buffer.from(await pdfDoc.save());
}

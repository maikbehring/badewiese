import { format } from "date-fns";
import { de } from "date-fns/locale";
import { NextResponse } from "next/server";
import { bookingStatusLabels, centsToEuro } from "@/lib/domain";
import { generateInvoicePdf } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const bookingId = Number(id);

  if (Number.isNaN(bookingId)) {
    return NextResponse.json({ error: "Ungueltige Buchungs-ID" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { spot: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
  }

  const pdfBuffer = await generateInvoicePdf({
    bookingId: booking.id,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    placeName: booking.spot.name,
    arrivalDate: format(booking.arrivalDate, "dd.MM.yyyy", { locale: de }),
    departureDate: format(booking.departureDate, "dd.MM.yyyy", { locale: de }),
    totalDays: booking.totalDays,
    unitPrice: centsToEuro(booking.spot.dayPriceCents),
    totalPrice: centsToEuro(booking.totalCents),
    statusLabel: bookingStatusLabels[booking.status],
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rechnung-${booking.id}.pdf"`,
    },
  });
}

import { BookingStatus } from "@prisma/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { NextResponse } from "next/server";
import { bookingStatusLabels, centsToEuro, diffDays, normalizeDate } from "@/lib/domain";
import { sendBookingConfirmationMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validation";

async function isSpotAvailable(spotId: number, arrivalDate: Date, departureDate: Date) {
  const overlapping = await prisma.booking.count({
    where: {
      spotId,
      status: { not: BookingStatus.CANCELLED },
      AND: [{ arrivalDate: { lt: departureDate } }, { departureDate: { gt: arrivalDate } }],
    },
  });

  return overlapping === 0;
}

export async function GET() {
  const bookings = await prisma.booking.findMany({
    include: {
      spot: true,
      statusHistory: {
        orderBy: { changedAt: "desc" },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungueltige Eingaben", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const arrivalDate = normalizeDate(parsed.data.arrivalDate);
  const departureDate = normalizeDate(parsed.data.departureDate);
  const totalDays = diffDays(arrivalDate, departureDate);

  if (totalDays <= 0) {
    return NextResponse.json({ error: "Buchung muss mindestens 1 Nacht enthalten" }, { status: 400 });
  }

  const spot = await prisma.spot.findUnique({ where: { id: parsed.data.spotId } });
  if (!spot) {
    return NextResponse.json({ error: "Stellplatz nicht gefunden" }, { status: 404 });
  }

  const available = await isSpotAvailable(spot.id, arrivalDate, departureDate);
  if (!available) {
    return NextResponse.json(
      { error: "Der ausgewaehlte Stellplatz ist im Zeitraum bereits belegt" },
      { status: 409 },
    );
  }

  const totalCents = totalDays * spot.dayPriceCents;

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        arrivalDate,
        departureDate,
        totalDays,
        totalCents,
        spotId: spot.id,
        notes: parsed.data.notes,
      },
      include: { spot: true },
    });

    await tx.statusHistory.create({
      data: {
        bookingId: created.id,
        fromStatus: null,
        toStatus: BookingStatus.OPEN,
        reason: "Buchung angelegt",
      },
    });

    return created;
  });

  await sendBookingConfirmationMail({
    recipient: booking.customerEmail,
    customerName: booking.customerName,
    bookingId: booking.id,
    placeName: booking.spot.name,
    arrivalDate: format(booking.arrivalDate, "dd.MM.yyyy", { locale: de }),
    departureDate: format(booking.departureDate, "dd.MM.yyyy", { locale: de }),
    totalPrice: centsToEuro(booking.totalCents),
  });

  return NextResponse.json(
    {
      booking: {
        ...booking,
        statusLabel: bookingStatusLabels[booking.status],
      },
    },
    { status: 201 },
  );
}

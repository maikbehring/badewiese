import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const bookingId = Number(id);

  if (Number.isNaN(bookingId)) {
    return NextResponse.json({ error: "Ungueltige Buchungs-ID" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = statusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungueltige Eingaben", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
  }

  if (booking.status === BookingStatus.CANCELLED) {
    return NextResponse.json(
      { error: "Stornierte Buchungen koennen nicht weiter geaendert werden" },
      { status: 409 },
    );
  }

  if (booking.status === parsed.data.status) {
    return NextResponse.json({ booking });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.booking.update({
      where: { id: bookingId },
      data: { status: parsed.data.status },
      include: {
        spot: true,
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
    });

    await tx.statusHistory.create({
      data: {
        bookingId,
        fromStatus: booking.status,
        toStatus: parsed.data.status,
        reason: parsed.data.reason,
      },
    });

    return changed;
  });

  return NextResponse.json({ booking: updated });
}

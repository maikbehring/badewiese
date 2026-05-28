import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSpotSchema } from "@/lib/validation";

export async function GET() {
  const spots = await prisma.spot.findMany({
    orderBy: [{ placeId: "asc" }],
  });

  return NextResponse.json({ spots });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSpotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungueltige Eingaben", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await prisma.spot.create({
    data: parsed.data,
  });

  return NextResponse.json({ spot: created }, { status: 201 });
}

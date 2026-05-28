import { BookingStatus, SpotType } from "@prisma/client";
import { z } from "zod";

export const createSpotSchema = z.object({
  placeId: z.string().min(1).max(20),
  name: z.string().min(2).max(120),
  type: z.nativeEnum(SpotType),
  dayPriceCents: z.number().int().min(500).max(99999),
});

export const createBookingSchema = z
  .object({
    customerName: z.string().min(2).max(120),
    customerEmail: z.email(),
    arrivalDate: z.iso.date(),
    departureDate: z.iso.date(),
    spotId: z.number().int().positive(),
    notes: z.string().max(500).optional(),
  })
  .refine((input) => input.arrivalDate < input.departureDate, {
    message: "Anreise muss vor Abreise liegen",
    path: ["departureDate"],
  });

export const statusUpdateSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  reason: z.string().max(300).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(300).optional(),
});

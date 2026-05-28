export type SpotType = "MOTORHOME" | "TENT";
export type BookingStatus = "OPEN" | "PAID" | "COMPLETED" | "CANCELLED";

export type Spot = {
  id: number;
  placeId: string;
  name: string;
  type: SpotType;
  dayPriceCents: number;
  isActive: boolean;
};

export type StatusHistory = {
  id: number;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  reason?: string | null;
  changedAt: string;
};

export type Booking = {
  id: number;
  customerName: string;
  customerEmail: string;
  arrivalDate: string;
  departureDate: string;
  totalDays: number;
  totalCents: number;
  status: BookingStatus;
  notes?: string | null;
  spotId: number;
  spot: Spot;
  statusHistory?: StatusHistory[];
};

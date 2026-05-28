"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Search, TentTree, Caravan } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { bookingStatusLabel, bookingStatusOptions, formatEuro } from "./constants";
import { Booking, BookingStatus, Spot } from "./types";

type SpotState = "FREE" | "RESERVED" | "OCCUPIED";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function BadewieseAppShell() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [newSpot, setNewSpot] = useState<{
    placeId: string;
    name: string;
    type: "MOTORHOME" | "TENT";
    dayPriceCents: string;
  }>({
    placeId: "",
    name: "",
    type: "MOTORHOME",
    dayPriceCents: "2500",
  });

  const [newBooking, setNewBooking] = useState<{
    customerName: string;
    customerEmail: string;
    arrivalDate: string;
    departureDate: string;
    spotId: string | null;
    notes: string;
  }>({
    customerName: "",
    customerEmail: "",
    arrivalDate: todayIso(),
    departureDate: todayIso(),
    spotId: null,
    notes: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [spotRes, bookingRes] = await Promise.all([fetch("/api/spots"), fetch("/api/bookings")]);
      if (!spotRes.ok || !bookingRes.ok) {
        throw new Error("Daten konnten nicht geladen werden");
      }
      const spotJson = await spotRes.json();
      const bookingJson = await bookingRes.json();
      setSpots(spotJson.spots);
      setBookings(bookingJson.bookings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  const filteredSpots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return spots;

    return spots.filter(
      (spot) => spot.placeId.toLowerCase().includes(q) || spot.name.toLowerCase().includes(q),
    );
  }, [search, spots]);

  function spotState(spotId: number): SpotState {
    const today = new Date(todayIso());

    const active = bookings.filter((booking) => {
      if (booking.spotId !== spotId || booking.status === "CANCELLED") {
        return false;
      }
      const arrival = new Date(booking.arrivalDate);
      const departure = new Date(booking.departureDate);
      return arrival <= today && departure > today;
    });

    if (active.length > 0) {
      const paidOrDone = active.some((booking) => booking.status === "PAID" || booking.status === "COMPLETED");
      return paidOrDone ? "OCCUPIED" : "RESERVED";
    }

    return "FREE";
  }

  function stateBadge(state: SpotState) {
    if (state === "FREE") return <Badge className="bg-emerald-600">Frei</Badge>;
    if (state === "RESERVED") return <Badge className="bg-amber-500">Reserviert</Badge>;
    return <Badge className="bg-sky-700">Belegt</Badge>;
  }

  async function createSpot() {
    const payload = {
      ...newSpot,
      dayPriceCents: Number(newSpot.dayPriceCents),
    };

    const res = await fetch("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Stellplatz konnte nicht angelegt werden");
    }

    setNewSpot({ placeId: "", name: "", type: "MOTORHOME", dayPriceCents: "2500" });
    await loadData();
    toast.success("Stellplatz wurde angelegt");
  }

  async function createBooking() {
    if (!newBooking.spotId) {
      throw new Error("Bitte einen Stellplatz auswaehlen");
    }

    const payload = {
      ...newBooking,
      spotId: Number(newBooking.spotId),
      notes: newBooking.notes.trim() || undefined,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Buchung konnte nicht angelegt werden");
    }

    setNewBooking({
      customerName: "",
      customerEmail: "",
      arrivalDate: todayIso(),
      departureDate: todayIso(),
      spotId: null,
      notes: "",
    });

    await loadData();
    toast.success("Buchung erfolgreich erstellt");
  }

  async function changeBookingStatus(bookingId: number, status: BookingStatus) {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Status konnte nicht geaendert werden");
    }

    await loadData();
    toast.success("Status aktualisiert");
  }

  async function cancelBooking(bookingId: number) {
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Vom Mitarbeiter storniert" }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Buchung konnte nicht storniert werden");
    }

    await loadData();
    toast.success("Buchung storniert, Stellplatz freigegeben");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-blue-50 to-white p-4 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-lg border bg-white/90 p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-cyan-900">Badewiese Manager</h1>
          <p className="mt-1 text-sm text-slate-600">Buchungen, Stellplaetze und Rechnungen zentral verwalten.</p>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[480px]">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="booking">Buchung</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Stellplaetze</CardTitle>
                <CardDescription>Frei, reserviert und belegt auf einen Blick.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Suche nach Platz-ID oder Name"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSpots.map((spot) => {
                    const state = spotState(spot.id);
                    return (
                      <Card key={spot.id} className="border-cyan-100">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-lg">
                            {spot.placeId}
                            {stateBadge(state)}
                          </CardTitle>
                          <CardDescription>{spot.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            {spot.type === "MOTORHOME" ? <Caravan className="h-4 w-4" /> : <TentTree className="h-4 w-4" />}
                            {spot.type === "MOTORHOME" ? "Wohnmobil" : "Zelt"}
                          </div>
                          <p>Tagespreis: {formatEuro(spot.dayPriceCents)}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Buchungen</CardTitle>
                <CardDescription>Statuswechsel, Storno und PDF-Rechnung.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Platz</TableHead>
                      <TableHead>Zeitraum</TableHead>
                      <TableHead>Gesamt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>#{booking.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.customerName}</div>
                          <div className="text-xs text-muted-foreground">{booking.customerEmail}</div>
                        </TableCell>
                        <TableCell>{booking.spot.placeId}</TableCell>
                        <TableCell>
                          {format(new Date(booking.arrivalDate), "dd.MM.yy", { locale: de })} -{" "}
                          {format(new Date(booking.departureDate), "dd.MM.yy", { locale: de })}
                        </TableCell>
                        <TableCell>{formatEuro(booking.totalCents)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{bookingStatusLabel[booking.status]}</Badge>
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Select
                            value={booking.status}
                            onValueChange={(value) => {
                              void changeBookingStatus(booking.id, value as BookingStatus).catch((error: unknown) => {
                                toast.error(error instanceof Error ? error.message : "Statuswechsel fehlgeschlagen");
                              });
                            }}
                            disabled={booking.status === "CANCELLED"}
                          >
                            <SelectTrigger className="inline-flex h-8 w-36 align-middle">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {bookingStatusOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {bookingStatusLabel[status]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={booking.status === "CANCELLED"}
                            onClick={() => {
                              void cancelBooking(booking.id).catch((error: unknown) => {
                                toast.error(error instanceof Error ? error.message : "Storno fehlgeschlagen");
                              });
                            }}
                          >
                            Storno
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/bookings/${booking.id}/invoice`, "_blank")}
                          >
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking">
            <Card>
              <CardHeader>
                <CardTitle>Neue Buchung erfassen</CardTitle>
                <CardDescription>Verfuegbarkeit wird serverseitig geprueft.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newBooking.customerName}
                    onChange={(event) => setNewBooking((prev) => ({ ...prev, customerName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input
                    type="email"
                    value={newBooking.customerEmail}
                    onChange={(event) => setNewBooking((prev) => ({ ...prev, customerEmail: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anreise</Label>
                  <Input
                    type="date"
                    value={newBooking.arrivalDate}
                    onChange={(event) => setNewBooking((prev) => ({ ...prev, arrivalDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abreise</Label>
                  <Input
                    type="date"
                    value={newBooking.departureDate}
                    onChange={(event) => setNewBooking((prev) => ({ ...prev, departureDate: event.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Stellplatz</Label>
                  <Select
                    value={newBooking.spotId ?? undefined}
                    onValueChange={(value) => setNewBooking((prev) => ({ ...prev, spotId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      {spots.map((spot) => (
                        <SelectItem key={spot.id} value={String(spot.id)}>
                          {spot.placeId} - {spot.name} ({formatEuro(spot.dayPriceCents)}/Tag)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Notiz</Label>
                  <Textarea
                    value={newBooking.notes}
                    onChange={(event) => setNewBooking((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <Button
                    className="bg-cyan-700 hover:bg-cyan-800"
                    onClick={() => {
                      void createBooking().catch((error: unknown) => {
                        toast.error(error instanceof Error ? error.message : "Buchung fehlgeschlagen");
                      });
                    }}
                  >
                    Buchung anlegen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Stellplatz anlegen</CardTitle>
                <CardDescription>Neue Stellplaetze sind sofort im Dashboard sichtbar.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platz-ID</Label>
                  <Input
                    value={newSpot.placeId}
                    onChange={(event) => setNewSpot((prev) => ({ ...prev, placeId: event.target.value }))}
                    placeholder="A-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newSpot.name}
                    onChange={(event) => setNewSpot((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Sonnendeck Nord"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select
                    value={newSpot.type}
                    onValueChange={(value) =>
                      setNewSpot((prev) => ({ ...prev, type: value as "MOTORHOME" | "TENT" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MOTORHOME">Wohnmobil</SelectItem>
                      <SelectItem value="TENT">Zelt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tagespreis (Cent)</Label>
                  <Input
                    type="number"
                    value={newSpot.dayPriceCents}
                    onChange={(event) => setNewSpot((prev) => ({ ...prev, dayPriceCents: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    className="bg-cyan-700 hover:bg-cyan-800"
                    onClick={() => {
                      void createSpot().catch((error: unknown) => {
                        toast.error(error instanceof Error ? error.message : "Anlage fehlgeschlagen");
                      });
                    }}
                  >
                    Stellplatz speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading ? <p className="text-sm text-muted-foreground">Lade Daten...</p> : null}
      </div>
    </div>
  );
}

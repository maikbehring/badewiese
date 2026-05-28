# Badewiese Manager

Webanwendung zur Verwaltung von Stellplaetzen (Wohnmobile und Zelte) an einem Badesee.
Das Projekt ist als internes Buchungs- und Verwaltungswerkzeug konzipiert und deckt im MVP folgende Bereiche ab:

- Stellplatzverwaltung
- Buchungserfassung mit Verfuegbarkeitspruefung
- Statusmanagement inkl. Historie
- Stornierung und Freigabe von Plaetzen
- PDF-Rechnung je Buchung
- automatischer E-Mail-Versand nach Buchung

## Inhalt

- [Funktionsueberblick](#funktionsueberblick)
- [Technologie-Stack](#technologie-stack)
- [Projektstruktur](#projektstruktur)
- [Lokale Installation](#lokale-installation)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Datenmodell](#datenmodell)
- [API-Dokumentation](#api-dokumentation)
- [UI/UX Hinweise](#uiux-hinweise)
- [Sicherheit und Validierung](#sicherheit-und-validierung)
- [Entwicklungs-Workflow](#entwicklungs-workflow)
- [Deployment-Hinweise](#deployment-hinweise)
- [Troubleshooting](#troubleshooting)

## Funktionsueberblick

### 1) Dashboard und Uebersicht

- Stellplaetze als Kartenansicht mit farblichem Status:
  - `Frei`
  - `Reserviert`
  - `Belegt`
- Suchfunktion nach `placeId` oder Stellplatzname
- Buchungstabelle mit zentralen Aktionen

### 2) Buchungserfassung

- Erfassung von:
  - Name
  - E-Mail
  - Anreise/Abreise
  - Stellplatz
  - Notiz
- Serverseitige Pruefung auf doppelte/ueberlappende Buchungen
- Automatische Preisberechnung: `totalDays * dayPriceCents`

### 3) Statusmanagement

- Statuswechsel je Buchung:
  - `OPEN`
  - `PAID`
  - `COMPLETED`
  - `CANCELLED`
- Protokollierung jeder Aenderung in `StatusHistory`
- Storno setzt Buchung auf `CANCELLED` und gibt den Platz fuer neue Buchungen frei

### 4) Kommunikation und Dokumente

- Automatische Bestaetigungs-E-Mail nach erfolgreicher Buchung
- PDF-Rechnung als Download pro Buchung

## Technologie-Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **UI System:** `shadcn/ui`, Tailwind CSS v4, Sonner (Toasts)
- **Backend:** Next.js Route Handlers (`src/app/api`)
- **Datenbank:** SQLite
- **ORM:** Prisma
- **Validierung:** Zod
- **PDF:** `pdf-lib`
- **E-Mail:** `nodemailer`

## Projektstruktur

```text
.
├── prisma
│   ├── schema.prisma
│   └── seed.mjs
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── spots/route.ts
│   │   │   └── bookings
│   │   │       ├── route.ts
│   │   │       └── [id]
│   │   │           ├── status/route.ts
│   │   │           ├── cancel/route.ts
│   │   │           └── invoice/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── badewiese
│   │   │   ├── app-shell.tsx
│   │   │   ├── constants.ts
│   │   │   └── types.ts
│   │   └── ui
│   └── lib
│       ├── prisma.ts
│       ├── validation.ts
│       ├── domain.ts
│       ├── mailer.ts
│       └── invoice.ts
└── README.md
```

## Lokale Installation

### Voraussetzungen

- Node.js 22+
- npm 10+

### Setup

```bash
npm install
cp .env .env.local 2>/dev/null || true
npm run db:push
npm run db:seed
npm run dev
```

App aufrufen:

- [http://localhost:3000](http://localhost:3000)

## Umgebungsvariablen

In `.env`:

```bash
DATABASE_URL="file:./dev.db"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@badewiese-manager.local"
APP_BASE_URL="http://localhost:3000"
```

Hinweise:

- Ohne `SMTP_HOST` nutzt das Projekt einen JSON-Transport (kein echter Versand, aber kein Fehler im Flow).
- Fuer produktiven Versand muessen SMTP-Werte gesetzt werden.

## Datenmodell

### `Spot`

- `id` (Int, PK)
- `placeId` (String, eindeutig)
- `name` (String)
- `type` (`MOTORHOME` | `TENT`)
- `dayPriceCents` (Int)
- `isActive` (Boolean)
- Timestamps

### `Booking`

- `id` (Int, PK)
- `customerName`, `customerEmail`
- `arrivalDate`, `departureDate`
- `totalDays`, `totalCents`
- `status` (`OPEN` | `PAID` | `COMPLETED` | `CANCELLED`)
- `notes` (optional)
- Relation zu `Spot`
- Timestamps

### `StatusHistory`

- `bookingId`
- `fromStatus`, `toStatus`
- `reason`
- `changedAt`

## API-Dokumentation

Alle Endpunkte liefern JSON, ausser PDF-Download.

### `GET /api/spots`

- Liefert alle Stellplaetze

### `POST /api/spots`

- Legt neuen Stellplatz an
- Body:

```json
{
  "placeId": "A-03",
  "name": "Seeblick Mitte",
  "type": "MOTORHOME",
  "dayPriceCents": 3500
}
```

### `GET /api/bookings`

- Liefert Buchungen inkl. Spot und Statushistorie

### `POST /api/bookings`

- Legt neue Buchung an
- Prueft Ueberlappung im Zeitraum (Doppelbuchung blockiert mit `409`)
- Erstellt initialen Historieneintrag
- Versendet Bestaetigungs-E-Mail
- Beispiel-Body:

```json
{
  "customerName": "Max Mustermann",
  "customerEmail": "max@example.com",
  "arrivalDate": "2026-06-01",
  "departureDate": "2026-06-05",
  "spotId": 1,
  "notes": "Spaete Anreise"
}
```

### `PATCH /api/bookings/:id/status`

- Aktualisiert Status einer Buchung
- Legt Historieneintrag an
- Beispiel-Body:

```json
{
  "status": "PAID",
  "reason": "Bezahlung vor Ort"
}
```

### `PATCH /api/bookings/:id/cancel`

- Storniert Buchung (`CANCELLED`)
- Legt Historieneintrag an
- Beispiel-Body:

```json
{
  "reason": "Gast hat abgesagt"
}
```

### `GET /api/bookings/:id/invoice`

- Gibt eine PDF-Rechnung zur Buchung zurueck
- `Content-Type: application/pdf`

## UI/UX Hinweise

- Durchgaengig mit `shadcn/ui` umgesetzt
- Responsive fuer Desktop/Tablet
- Toaster-Meldungen fuer Erfolg/Fehler
- Farbthema in Blau/Tuerkis mit Fokus auf gute Lesbarkeit

## Sicherheit und Validierung

- Zod-validierte Input-Schemas fuer alle mutierenden Endpunkte
- Keine direkte SQL-Ausfuehrung, Zugriff ausschliesslich ueber Prisma
- Verfuegbarkeitslogik serverseitig (nicht nur im Client)
- Keine ungefilterte HTML-Ausgabe im Frontend (XSS-Risiko minimiert)

## Entwicklungs-Workflow

### NPM Scripts

- `npm run dev` - Entwicklungsserver
- `npm run lint` - ESLint
- `npm run build` - Production Build
- `npm run db:push` - Prisma Schema nach SQLite pushen
- `npm run db:seed` - Beispiel-Stellplaetze anlegen
- `npm run db:studio` - Prisma Studio

### Typischer Ablauf

```bash
npm run db:push
npm run db:seed
npm run dev
```

## Deployment-Hinweise

- Fuer Produktion eine persistente SQLite-Datei ausserhalb ephemerer Container verwenden.
- SMTP in Produktion verpflichtend konfigurieren.
- Fuer Multi-User/hohe Last spaeter ggf. Migration auf PostgreSQL einplanen.

## Troubleshooting

### HMR WebSocket Fehler im Netzwerkzugriff

Wenn die Seite ueber LAN-IP aufgerufen wird und HMR blockiert ist:

- `next.config.ts` enthaelt `allowedDevOrigins`
- Dev-Server neu starten

Aktuell gesetzt:

```ts
allowedDevOrigins: ["192.168.9.127"];
```

### Port 3000 bereits belegt

- Laufenden Prozess beenden oder anderen Port nutzen.
- Beispiel:

```bash
kill <PID>
npm run dev
```

---

Bei Fragen zur Erweiterung (z. B. Rollen/Rechte, Gast-Portal, Reporting, Online-Zahlung) kann das Projekt modular erweitert werden.

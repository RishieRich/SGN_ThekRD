# ARQ Thekedar: Build Specification v1.2

**Product:** ARQ Thekedar, by ARQ ONE AI Labs
**Tagline:** Hajri se hisaab tak (from attendance to accounts)
**First tenant:** Rajesh Desai (labour and fitter supply contractor, GIDC Gujarat)
**Spec date:** 10 Nov 2026
**Audience:** Claude Code or Codex. Build a working localhost version from this file alone.
**Companion file (business context, optional):** `rajesh-desai-spec.md`

**What changed in v1.2 (real scale):** the tenant has **150+ workers (helpers, fitters, welders, supervisors) across 5 companies**, and **Rajesh alone marks attendance for all of them**. So: a fast multi-company Hajri built for 150 names (6.4), worker moves between companies (6.4.4), role-wise billing rates alongside flat rates (9.3), new owner insights for this scale (margin by company, cash needed for wages, shortage alerts; 6.3 and 9.6), sample data of 152 workers across 5 companies including one outside Gujarat (section 14), and performance rules for lists of this size (section 16).

**Earlier (v1.1):** four-language coverage as a release blocker (section 12), Remove sample data and Start fresh (section 15), the Drop Box import zone and first-run Setup (6.10, 6.11, 11.3).

---

## 0. Instructions for the coding agent

Read the whole file before writing code. Then:

1. Build in the phase order in section 18. Do not start a phase while the previous phase's acceptance checks fail.
2. The app must run fully on localhost with **no AI keys**. Every AI feature (voice, camera, chat, Drop Box extraction of images and text) has a manual path and an honest "not connected" state.
3. **AI never calculates money or counts.** All totals, bills, man-days and insights come from deterministic TypeScript in `src/domain/`. AI only (a) turns speech into text, (b) turns photos, PDFs and free text into *proposed* records, (c) picks which query to run in chat, and (d) phrases a result in the user's language.
4. **Nothing AI proposes is saved without a human confirm tap.**
5. Money is integer paise. No floating point for money.
6. **Four languages are a release blocker.** English, Hindi, Marathi and Gujarati must cover every screen, button, toast, error, empty state, insight, chat answer, spoken sentence and PDF label. See section 12.
7. No hex colours outside the token file. No user-visible text hardcoded in components.
8. Verify package versions, model identifiers and API shapes (Gemini, Sarvam, SheetJS) against official docs at build time. Model IDs live in env vars.
9. When done, write `HANDOFF.md`: what works, commands run and results, what is not built, next step. Never claim a check you did not run.

---

## 1. Product summary

### 1.1 Who it is for

A labour contractor who supplies **150+ workers and fitters to 5 factories**, and personally keeps the attendance for all of them. Today he records attendance in a notebook, the factory signs a daily attendance card, he copies attendance again into a home register, tallies against the factory's count on the 1st, writes bills by hand in a bill book, and pays workers in cash or by one-by-one bank transfers.

### 1.2 What changes for him

- **First day:** he drops whatever he has (register photos, old bills, an Excel of workers, a typed list, a voice note) into the **Drop Box**. The app proposes companies, rates and workers; he ticks what is right and taps Apply.
- **Every morning:** a **pre-filled attendance sheet** for all 5 companies, everyone ticked present for their usual company and shift. He only names who did not come (tap, type, speak, or a photo of the gate list). **All 5 companies in under 5 minutes.**
- **For the owner at this scale:** which company earns the most per man-day after wages, how much cash he needs for wages this month against cheques due, and which company is short of workers today.
- After he confirms, **every report updates**: which company gives the most work and money, this month against last, wages due, cheque status, open issues.
- **On the 1st:** one tap makes the bill in his bill-book layout with PF, ESIC and GST.
- **Anyone in the family** opens Home in Marathi, Gujarati, Hindi or English, taps any card and **hears it**.
- **Every text box takes voice.** Chat answers by text or voice.
- It feels **calm, premium and a little playful**.

### 1.3 Product principles

1. **Fewer taps beat more features.** A daily action over 3 taps or 10 seconds gets redesigned.
2. **Defaults do the work.** Pre-fill everything that is usually the same as yesterday.
3. **The notebook stays.** Never ask him to stop using paper, the signed card or the bill book.
4. **His language, everywhere.** Switching language changes every word on screen and every spoken sentence.
5. **Speak and listen everywhere.** Mic on every text input, speaker on every insight.
6. **Honest states.** Missing data says "not entered yet", never a fake zero. Sample data is always labelled.
7. **Easy to start over.** Sample data removes in one step; a full fresh start is possible with a backup first.

---

## 2. Users and roles

Multi-tenant from day one (`tenant_id` on every row). v1 has one real tenant and no tenant-management UI.

| Role | Who (tenant 1) | Can do | Cannot do |
| --- | --- | --- | --- |
| `owner` | Rajesh | Everything inside the tenant, including Drop Box, Remove sample data, Start fresh | Other tenants |
| `viewer` | Family members (e.g. his father) | Home, insights, listen, chat questions (read-only), worker list without sensitive fields | Edit anything; see health notes, bank or ID fields; Drop Box; data reset |
| `admin` | Rishi (ARQ) | Everything, plus provider status and reseeding | Nothing hidden |

Each user has: name, phone, 4-digit PIN, role, language, digits (Latin default), theme, animations on/off, sound on/off.

---

## 3. Constitution (non-negotiables)

Write into `constitution.md`, each rule with its proof.

| # | Rule | Proof |
| --- | --- | --- |
| C1 | Money is integer paise; all money maths in `src/domain/money.ts` and `billing.ts` | Golden bill test (section 9.5) |
| C2 | One fact, one computation path; components never re-total | No `reduce` over money or man-day fields outside `src/domain` and `src/server/queries` |
| C3 | App works with every AI key absent | Journeys J1 to J4, J8, J9 pass with empty AI env |
| C4 | AI output is zod-validated; any number in a chat answer must exist in the tool result | `src/ai/__tests__/guard.test.ts` |
| C5 | Every AI-proposed write (chat, camera, Drop Box) needs a confirm tap | e2e tests |
| C6 | Every query and write is scoped by `tenant_id` from the session | Two-tenant isolation test |
| C7 | Sensitive fields encrypted at rest and hidden from `viewer` | Viewer API response test |
| C8 | Every user-visible string exists in `en`, `hi`, `mr`, `gu` with matching placeholders; no English leaks in non-English locales | `pnpm i18n:check` and the leak test (section 12.6) |
| C9 | Motion respects `prefers-reduced-motion` and the user toggle | Motion hook unit test |
| C10 | Secrets never reach the client, logs or URLs | AI calls only in route handlers; `.env.example` empty |
| C11 | Day confirm and import apply are idempotent | Same key twice gives one result |
| C12 | Sample rows are flagged `is_sample` and removable without touching real rows | Remove-sample test with mixed data |
| C13 | Start fresh always writes a backup before deleting | Test asserts backup file exists before delete runs |
| C14 | Uploaded files are deleted after apply or after 7 days; full Aadhaar numbers are never stored | Cleanup job test; extraction test masks to last 4 |

---

## 4. Stack, structure and environment

### 4.1 Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js (App Router), TypeScript strict | Later on Vercel, functions region `sin1` next to Neon Singapore |
| Styling | CSS variables token layer (section 5); Tailwind optional, mapped only to tokens | No CSS-in-JS |
| Motion | `motion` (Framer Motion) | Variants in `src/ui/motion.ts` |
| Charts | Recharts | Token colours only |
| Icons | lucide-react | 1.75 stroke |
| Celebration | `canvas-confetti` with custom marigold shapes | Off under reduced motion |
| i18n | `next-intl` with ICU messages | Locales `en`, `hi`, `mr`, `gu` |
| Validation | zod | API inputs, AI outputs, import items |
| Spreadsheets | SheetJS (`xlsx`) | `.xlsx`, `.xls`, `.csv` parsing on the server |
| PDF in | `pdfjs-dist` to render pages to images for vision | Max 10 pages per file |
| PDF out | `@react-pdf/renderer` with embedded Noto fonts | Bills, cash slips, backups summary |
| Images | Client-side compression to ≤ 1600px; HEIC converted with `heic2any` if present | |
| DB | PostgreSQL 16 (Docker locally, Neon in cloud) | Same schema |
| ORM | Drizzle ORM + drizzle-kit | `src/db/schema.ts` |
| Auth | Phone + 4-digit PIN (bcrypt), httpOnly session cookie, 30 days | No SMS OTP in v1 |
| Voice | Sarvam (STT and TTS), server side | Model and language codes from env and docs |
| Vision and language understanding | Gemini, server side, project **with billing enabled** | Paid-tier data terms for worker data |
| File storage | Local: `./var/uploads/{tenant}/{batch}/`. Cloud later: private object storage (Vercel Blob) | Behind `src/server/storage.ts` interface |
| PWA | Manifest + service worker | Offline queue for attendance confirm |
| Tests | Vitest, Playwright | |
| Package manager | pnpm | |

### 4.2 Repository layout

```text
arq-thekedar/
  constitution.md  README.md  HANDOFF.md  .env.example
  docker-compose.yml  drizzle.config.ts
  specs/000-product-brief.md  specs/decisions/ADR-0001-stack.md
  messages/en.json  hi.json  mr.json  gu.json
  public/manifest.webmanifest  public/icons/  public/sounds/tick.mp3  public/sounds/done.mp3
  scripts/
    i18n-check.ts            # keys, placeholders, leak scan
    make-import-fixtures.ts  # generates sample xlsx/csv/text for tests
  src/
    app/
      (auth)/login/page.tsx
      (app)/layout.tsx                         # nav, language switch, global mic, sample ribbon
      (app)/home/page.tsx
      (app)/hajri/page.tsx  (app)/hajri/[date]/page.tsx
      (app)/kaamgar/page.tsx  (app)/kaamgar/[workerId]/page.tsx
      (app)/masle/page.tsx  (app)/masle/[issueId]/page.tsx
      (app)/pucho/page.tsx
      (app)/mahina/[clientId]/[month]/page.tsx
      (app)/setup/page.tsx                     # first-run checklist
      (app)/dropbox/page.tsx                   # upload
      (app)/dropbox/[batchId]/page.tsx         # review and apply
      (app)/settings/page.tsx  (app)/settings/data/page.tsx
      api/ auth/ home/ attendance/ bills/ workers/ issues/ chat/
           voice/stt/ voice/tts/ vision/attendance/
           import/batches/ import/files/ import/items/ import/apply/ import/undo/
           data/remove-sample/ data/load-sample/ data/backup/ data/start-fresh/
           health/
    domain/      money.ts billing.ts mandays.ts payroll.ts margin.ts cashplan.ts strength.ts insights.ts streaks.ts dates.ts matching.ts
    server/      queries/ repositories/ services/ session.ts storage.ts jobs/cleanup.ts
    ai/          providers/{gemini,sarvam,index}.ts  chat/{tools,router,guard}.ts
                 extract/{classify,image,pdf,text,sheetMapping}.ts
    db/          schema.ts client.ts seed.ts sampleData.ts crypto.ts
    ui/          tokens.css motion.ts components/
    i18n/        config.ts format.ts numberWords.ts
  tests/e2e/  tests/fixtures/photos/  tests/fixtures/import/
```

### 4.3 Commands

```bash
pnpm setup        # install, start docker Postgres, migrate, seed sample tenant
pnpm dev          # localhost:3000
pnpm test         # vitest
pnpm e2e          # playwright, runs key journeys in all 4 locales
pnpm i18n:check   # keys, placeholders, English-leak scan
pnpm seed         # reset and reseed sample data
pnpm fixtures     # generate import test files
pnpm db:studio
```

### 4.4 Environment (`.env.example`, no values)

```bash
DATABASE_URL=            # postgres://thekedar:thekedar@localhost:5432/thekedar
SESSION_SECRET=          # 32+ random bytes
APP_ENCRYPTION_KEY=      # 32-byte base64, AES-256-GCM
UPLOAD_DIR=./var/uploads
UPLOAD_RETENTION_DAYS=7
BACKUP_DIR=./var/backups
GEMINI_API_KEY=          # optional
GEMINI_MODEL_VISION=     # optional, verify ID in docs
GEMINI_MODEL_CHAT=       # optional, verify ID in docs
SARVAM_API_KEY=          # optional
SARVAM_STT_MODEL=        # optional
SARVAM_TTS_MODEL=        # optional
SARVAM_TTS_SPEAKER_EN=   # optional, one speaker per locale
SARVAM_TTS_SPEAKER_HI=
SARVAM_TTS_SPEAKER_MR=
SARVAM_TTS_SPEAKER_GU=
```

Startup fails loudly if `DATABASE_URL`, `SESSION_SECRET` or `APP_ENCRYPTION_KEY` is missing. `/api/health` reports each provider as `connected`, `missing_key` or `error`.

---

## 5. Design system: calm, premium, playful

### 5.1 Mood

**Paithani silk:** deep royal plum with brass-gold zari on warm porcelain. Calm and premium. Motion is soft and springy. Delight comes from small rewarding moments, not noise.

### 5.2 Colour tokens (`src/ui/tokens.css`)

```css
:root {
  --royal-975:#211028; --royal-950:#2b1233; --royal-800:#4b2058;
  --royal-700:#642c72; --royal-600:#7b3f88; --royal-100:#efe6f2;
  --brass-500:#cf9f48; --brass-300:#ebcf94; --brass-100:#f8eedb;
  --saffron-400:#e9963a;                       /* marigold accent, celebration only */
  --porcelain:#f7f4ef; --canvas:#f2eff3; --surface:#ffffff; --surface-soft:#f7f4f8;
  --ink:#28222b; --ink-strong:#1e1921; --muted:#6f6873; --line:#ddd7df;
  --success:#2f7666; --success-soft:#e3f1ed;
  --warning:#ad6b25; --warning-soft:#f7ead9;
  --danger:#b4434e;  --danger-soft:#f6e1e3;
  --chart-1:#642c72; --chart-2:#cf9f48; --chart-3:#2f7666;
  --chart-4:#7b3f88; --chart-5:#ad6b25; --chart-6:#8a8290;
  --r-control:10px; --r-card:16px; --r-hero:24px;
  --shadow-card:0 1px 2px rgb(33 16 40/6%),0 8px 24px rgb(33 16 40/6%);
}
[data-theme="dark"]{
  --canvas:#1b1020; --surface:#26162c; --surface-soft:#2f1c36;
  --ink:#efe9f1; --ink-strong:#ffffff; --muted:#b3a8b8; --line:#3d2a44;
}
```

Plum carries identity and primary actions. Brass marks progress, selection and reward. Green, amber and red mean healthy, pending and problem. Colour never carries meaning alone.

### 5.3 Typography and scripts

| Locale | UI font | Display font |
| --- | --- | --- |
| en | Inter | Fraunces (fallback Georgia) |
| hi, mr | Noto Sans Devanagari | Noto Serif Devanagari |
| gu | Noto Sans Gujarati | Noto Serif Gujarati |

- Load with `next/font`; the `<html lang>` and font class switch with the locale.
- Body minimum 16px; Indic scripts +2px and line height 1.6. Key numbers 32 to 48px serif.
- Numbers use Indian grouping (`4,00,200`). Latin digits by default; user can switch to native digits (०१२ / ૦૧૨).

### 5.4 Layout

- Mobile first (360 to 430px), works on tablet and laptop.
- Bottom nav, 5 tabs, 64px, safe-area aware. On desktop it becomes a left rail.
- Top bar: tenant name, **language chip** (`EN · हिं · मरा · ગુજ`), avatar.
- Tap targets ≥ 48px; tick rows and steppers ≥ 56px.
- **Every layout must hold the longest locale string** (Marathi and Gujarati often run 30 to 60% longer than English): wrap, never truncate important labels, no fixed-width buttons.

### 5.5 Motion and delight

Durations 150 to 400ms, spring `stiffness 260, damping 24`. Reduced motion or toggle off: fades only, no confetti, no count-ups.

| Moment | Animation |
| --- | --- |
| App open | Header fades, cards rise with 40ms stagger |
| Numbers | Count-up over 600ms |
| Month ring | Brass ring fills to confirmed days / days in month |
| Tick a worker | Check path draws, row tints green, soft tick sound |
| Untick | Row slides 4px, name dims, no alarm colour |
| Confirm day | Sheet slides up; on confirm, marigold petals (brass, plum, saffron) 1.2s, `navigator.vibrate(30)`, chime |
| Streak | Diya flame grows at 3, 7, 15, 30 days |
| Badge | Card flips, brass shimmer once |
| Charts | Bars grow from baseline, staggered |
| Speaking | Three brass bars pulse while audio plays |
| Mic hold | Ring pulses with volume; release shows a "listening" shimmer |
| Drop Box | Files fly into an open box; each extracted item "pops" into its group with a count-up |
| Setup checklist | Each step completed fills a segment of a rangoli-style ring |
| Empty states | Line art (notebook, diya, box) with one action |

**Badges** (deterministic, `streaks.ts`): Pehla Kadam (first day confirmed), Saat Din (7-day streak), Poora Mahina (every day of a month confirmed), Samay Par Bill (bill made on the 1st or 2nd), Saaf Hisaab (tally with zero difference), Chhota Hero (month with all issues closed), Setup Poora (setup checklist completed). Badge names and descriptions are translated in all four languages.

### 5.6 Core components

`Card`, `Metric`, `MonthRing`, `TickRow`, `ShiftSection`, `ConfirmSheet`, `MicButton`, `SpeakButton`, `VoiceTextField`, `Pill`, `BarChart`, `TrendChart`, `Avatar`, `EmptyState`, `ProviderStatusBanner`, `SampleDataRibbon`, `LanguageSwitch`, `BadgeCard`, `StreakDiya`, `DropZone`, `ImportItemCard`, `ConflictCompare`, `SetupStep`, `DangerConfirm` (type-to-confirm).

Each has default, focus-visible (brass ring), disabled, loading (skeleton) and error states, and no hardcoded text.

---

## 6. Screens

### 6.1 Navigation (5 tabs)

| Tab | en | hi | mr | gu | Icon |
| --- | --- | --- | --- | --- | --- |
| Home | Home | होम | होम | હોમ | `Home` |
| Attendance | Hajri | हाज़िरी | हजेरी | હાજરી | `ClipboardCheck` |
| Workers | Workers | कामगार | कामगार | કામદાર | `Users` |
| Issues | Issues | समस्याएँ | अडचणी | સમસ્યા | `AlertCircle` |
| Ask | Ask | पूछो | विचारा | પૂછો | `MessageCircle` |

A floating **global mic** above the nav (all tabs except Ask) opens a voice command sheet routed to chat (section 10).

The **Drop Box** opens from: Setup, Settings → Data, the Workers tab header ("Import"), and every empty state.

### 6.2 Login

- Porcelain background, plum band with the ARQ Thekedar mark and tagline in the device language (falls back to English).
- Step 1: tap your avatar from the tenant's users. Fallback: phone number.
- Step 2: 4-digit PIN keypad; dots fill with brass.
- "Remember this phone" on by default.
- 5 wrong PINs lock for 10 minutes.
- **First login: choose language** with four large cards (English, हिन्दी, मराठी, ગુજરાતી); each speaks its own name when tapped. The choice applies instantly to every screen.

### 6.3 Home (insights)

Top to bottom:

1. Greeting with name and date, `StreakDiya`.
2. **Sample data ribbon** (if any sample rows exist): "You are seeing sample data. [Remove sample data]".
3. **Today card:** not confirmed → "Today's attendance is pending" + "Fill attendance". Confirmed → green tick, man-days, present/absent counts.
4. **This month hero:** `MonthRing`, man-days, estimated bill so far ("Estimate"), change vs same date last month.
5. **Work by company:** bar chart of man-days with share percent.
6. **Earnings by company:** bar chart of estimated billing; tap a bar for that client's month page.
7. **Money in:** per client, last bill and cheque status (`Not billed`, `Billed`, `Cheque received`), days since bill.
8. **Wages:** wages due this month, cash vs bank, paid so far.
9. **Margin by company** (owner and admin; viewer only if owner turns on "Family can see margin"): per company, billed per man-day minus average wage per man-day, as a ranked bar chart with ₹ per man-day and month total. Uses estimated bills for the open month and actual invoices for closed months. Shows "Wages not entered for N workers" instead of a wrong number when wages are missing.
10. **Cash plan:** wages to pay this month (cash and bank separately) against cheques expected (delivered, unpaid invoices) with expected dates, and the gap. Example: "Cash wages ₹9.8L due; cheques expected ₹14.2L by 10 Dec."
11. **Today's strength:** per company, usual headcount vs present today, by shift; amber when present is below 90% of usual, red below 75%. This is the "short of workers" signal he can act on before the company calls.
12. **Issues:** open issues by type.
13. **Insights:** 3 to 5 sentences (section 9.6), each with a speak button.
14. **Badges:** earned and the next one with progress.
15. **Month close card** from the 28th to the 5th: "Close month" per client, with a 5-step progress per company (tally, bill, delivered, cheque, wages).

With 5 companies, every per-company card shows all 5 in a fixed colour order (`--chart-1` to `--chart-5`) so a company keeps the same colour everywhere in the app.

Every card has a `SpeakButton` that speaks a sentence in the active language. A header button "Listen to all" plays the cards in order. Viewer sees the same Home without edit actions.

If setup is incomplete (no clients or no workers), Home shows the Setup checklist card first.

### 6.4 Hajri (daily attendance sheet)

**Design target:** one person marks 150+ workers across 5 companies in **under 5 minutes** on a phone. The trick is that he records only the **exceptions** (who did not come, who moved); everyone else is already present.

#### 6.4.1 Today overview (landing view)

- Date strip at top (past 7 days; calendar for older). Chips: green confirmed, amber partial, grey not started.
- **Five company cards** in a 2-column grid (one column under 380px), each with: company colour bar, name, `Day 26/28 · Night 16/17`, absent count, a small ring that fills as that company is confirmed, and status (Not started, In progress, Confirmed).
- Global actions above the cards:
  - **Same as yesterday for all** (copies yesterday's statuses for every company and shift, then shows the summary so he can adjust).
  - **Gate list photos** (multi-photo, see 6.4.3).
  - **Say who is absent** (mic, see 6.4.3).
- Sticky footer: "Confirm all (412 man-days)" enabled when every company has been opened or set; per-company confirm is also possible.
- Celebration plays once per company confirmed (small) and once when all 5 are done (full marigold burst).

#### 6.4.2 Company sheet (tap a company card)

- Header: company name, shift tabs **Day | Night** with counts, search box with mic, role filter chips (All, Fitters, Helpers, Welders, Supervisors).
- **Two views, toggle at top:**
  - **Absent only (default for 20+ workers):** shows the absent list (empty at first) and a big search field "Who did not come?". Typing or speaking 2 or 3 letters shows matching workers from this company and shift; one tap marks absent and adds them to the list. Undo by tapping ✕ on a chip.
  - **Full list:** all workers grouped by role, alphabetical, **virtualised** (only visible rows rendered), sticky letter index on the right edge for fast jump, every row a 56px tick row.
- Each shift section header: `present/usual`, **All present**, **Same as yesterday**.
- Row tap toggles present/absent. Note icon opens a `VoiceTextField` (late, half day, sent home). Notes do not change man-days in v1.
- Present = 1 man-day. Absent = 0.
- "Done with this company" returns to the overview with the card updated.

#### 6.4.3 Faster inputs (because one person covers 5 gates)

1. **Gate list photos (main path when someone at the gate sends him photos on WhatsApp):** select several photos at once. Each photo is read (section 11.2), assigned to a company by the company name on the page or by the user picking it, and turned into proposed ticks. A review screen shows per photo: company, shift, matched absentees and presents, unmatched names. One confirm applies all.
2. **Say who is absent:** one utterance can cover several companies: "Shree Polymers day mein Manoj, Ravi; Om Packaging night mein Raju nahi aaya". Parsed into per-company absent lists with fuzzy name matching (9.9), shown highlighted before confirm. If a name matches more than one worker, a chooser appears.
3. **Type a list:** paste text like "Absent: Manoj, Ravi, Suresh" into the company search; each name resolves to a chip.
4. **Headcount check:** each shift header has an optional "Gate count" field. If the gate register says 26 and the sheet says 28 present, an amber pill shows "2 more present than gate count" so he can find the missing absentees.

#### 6.4.4 Moves between companies (support both fixed and rotating)

The tenant's real pattern is unknown, so support both:

- Every worker has a **home placement** (company + shift), stored in `assignments` with `kind = 'home'`.
- **Move for today:** from a worker row (long-press or swipe), pick another company and shift. The worker is shown under that company today with a "moved from Shree Polymers" tag, and counts there for man-days and billing.
- **Move from today onwards:** ends the current home assignment yesterday and starts a new one today (history kept on the worker profile).
- **Unplaced workers:** active workers with no home placement appear in an "Unplaced" card on the overview; tap to place them for today.
- **Pre-fill source setting** (Settings → Attendance): `home` (default: everyone starts at their home company) or `yesterday` (everyone starts where they worked yesterday). Choose `yesterday` if workers rotate by demand.
- A worker can be present at only one company per shift per day; the second placement asks "Move Manoj from Om Packaging to Shree Polymers for today?"

#### 6.4.5 Confirm

`ConfirmSheet` lists each company: day, night, total man-days, absent names (collapsed beyond 5 with "+12 more"), moved-in and moved-out names. "Yes, confirm" writes idempotently, plays the celebration, updates streak, returns to Home.

**Edit a confirmed day:** owner taps "Change"; changes go to `audit_log` and require re-confirm.

**Offline:** confirm is queued in IndexedDB with its idempotency key ("Saved on phone, will sync") and syncs later without duplicates.

### 6.5 Kaamgar (workers)

**List:** search (with mic), filter chips (All, per company, Fitters, Helpers, Welders, Supervisors, Inactive, Unplaced, PF pending, ESIC pending, Bank details missing), sort (name, attendance %, wage). Row: avatar, name, role, company and shift, attendance percent ring, PF/ESIC pills. The list is **virtualised** with a sticky letter index (150+ rows). A summary strip at the top shows counts per company and per role. Header actions: **+ Add**, **Import** (opens Drop Box).

**Bulk actions** (select mode via long-press, "Select all in filter"): move to company and shift, change daily wage, set PF or ESIC status, set pay mode (cash/bank), mark inactive. Every bulk action shows a confirm sheet with the count and is written to `audit_log`.

**Worker reliability:** attendance percent for the last 30 days drives a small label: Regular (≥ 90%), Sometimes absent (75 to 90%), Often absent (< 75%). Used for the "who to call first" suggestion when a company is short today.

**Quick add (under 30 seconds):** Name (voice), Phone, Role, Client, Shift, Daily wage. Everything else later.

**Worker profile:**

| Section | Fields | Viewer sees |
| --- | --- | --- |
| Header | Photo or initials, name, role, client, shift, phone (call, WhatsApp), active | Yes, phone masked |
| This month | Calendar heat map, man-days, attendance percent | Yes |
| Pay | Daily wage, gross this month, advances outstanding, net payable, cash/bank, paid | Totals only |
| Statutory | UAN, ESIC IP number, PF status, ESIC status (`done`, `pending`, `not applicable`) | Status only |
| Bank | Bank, IFSC, account (encrypted, shown `XXXX1234`), holder name | No |
| ID | Aadhaar last 4 only | No |
| Advances | Date, amount, reason (voice), recovered; + Advance | Totals only |
| Issues | Linked issues with status | Count only |
| Health and safety notes | Facts only: date, what happened, treatment, days off, who paid | No |
| Notes | Free text by voice | No |
| History | Joined, client changes, wage changes, import source | Yes |

### 6.6 Masle (issues)

- Open / Closed segmented list. Card: type icon, worker, client, date, short text, age, status.
- **New issue in 3 taps:** type tile (Injury, Health, PF/ESIC, Dispute, Advance, Long absence, Other) → speak or type → link worker and client (suggested from text). Optional amount and paid by (contractor, company, worker).
- Detail: timeline of updates (voice or text), status Open / In progress / Closed, closing note required.
- Injury and health issues visible to owner and admin only.

### 6.7 Pucho (chat)

- Bubbles: plum for user, white cards for answers.
- Input: text, hold-to-talk mic, send.
- Suggested question chips **in the active language** (section 12.5).
- Answer card: sentence in the active language, optional mini table or chart, speak button, footnote "From your data, as of {time}" (translated).
- Write intents show a confirm card. Nothing is saved until "Yes, confirm".
- Without Gemini: chips still work; free text says (translated) "Chat needs a connection. Try a suggested question."

### 6.8 Mahina (month close and bill), per client per month

1. **Tally:** our man-days (with day-by-day table), field for the company's man-days (keypad or voice), difference pill (green Match or amber Difference: N), list of unconfirmed or edited days, choice "Use our count" / "Use company count".
2. **Bill:** bill-book style (placeholder layout section 9.4). Shows bill no, date, client and GSTIN, period, man-days and rate (one line for a flat-rate company, or one line per role such as Fitter, Helper, Welder for a role-rate company), base, PF, ESIC, taxable, CGST, SGST or IGST, total, amount in words. DRAFT banner while statutory rates are unconfirmed. Actions: Copy to bill book (big-font view), Download PDF, Share, Mark delivered.
3. **GST sheet:** per month, all clients: bill no, date, client GSTIN, taxable, CGST, SGST, IGST, total. Copy and CSV.
4. **Cheque:** "Cheque received": number (optional), date, amount (defaults to bill total), voice note.
5. **Wages:** per worker: man-days, daily wage, gross, advance recovery (editable), net, cash/bank, paid tick. Virtualised for 150+ rows, with totals pinned at the bottom and filters (cash, bank, unpaid). A worker who worked at several companies in the month gets one payroll line per company plus a combined total. Exports: Cash slips PDF (3 slips per A4 page, one page per company, plus a cash denomination summary: how many ₹500, ₹200, ₹100 notes are needed), Bank list CSV.

**All-companies month close** (`/mahina/all/[month]`): one screen showing the 5 companies as rows with their 5-step progress, total billing, total wages and the month margin, so the 1st of the month is handled from one place.

**Bill language:** setting with `English` (default, for the client) or `English + {user language}` (bilingual labels). Screen labels always follow the user's language.

### 6.9 Settings

- Business: name, legal name, GSTIN, address, state, SAC, bank footer, bill prefix, next bill number.
- Clients, rates (per client, effective-from), assignments.
- Statutory: PF mode and percent, ESIC mode and percent, GST percent, rounding, `rates_confirmed` checkbox.
- Holidays and weekly offs.
- Users: add family as viewer, reset PIN.
- Personal: language, digits, theme, animations, sound.
- **Data** (owner and admin): see 6.11.
- Admin: provider status, reseed.

### 6.10 Setup (first run and after a fresh start)

Route `/setup`. Shown automatically when the tenant has no real clients or workers. A checklist with a rangoli progress ring:

| Step | Done when | Ways to fill |
| --- | --- | --- |
| 1. Drop everything | Optional; any batch applied | **Drop Box** (photos, Excel, PDF, text, voice) |
| 2. Business details | Name and state set | Form with voice, or from a bill photo |
| 3. Companies and rates | At least 1 client with a rate | Form, or Drop Box |
| 4. Workers | At least 1 worker | Quick add, or Drop Box |
| 5. Who works where | Every active worker has an assignment | Drag/pick screen; suggested from imported data |
| 6. PF, ESIC, GST | `rates_confirmed = true` | Form; can copy from a bill photo |
| 7. Family members | Optional | Add viewer with PIN |
| 8. Past attendance and bills | Optional | Drop Box (register photos, old bills) |

Each step card has: what it means (one line), "Fill now", "Drop files", "Skip for now". Finishing steps 2 to 6 awards **Setup Poora** and opens Home.

### 6.11 Data management (Settings → Data)

| Action | Who | What it does | Safety |
| --- | --- | --- | --- |
| **Remove sample data** | owner, admin | Deletes every row with `is_sample = true` (workers, clients, attendance, bills, issues, advances, badges, sample viewer user) and resets sample business fields. Real rows untouched. Opens Setup. | Confirm sheet listing counts to be deleted ("152 workers, 5 companies, 10,512 attendance rows…"). One tap confirm. |
| **Load sample data** | owner, admin | Re-creates the 152-worker, 5-company sample set | Only allowed when the tenant has **no real data**; otherwise disabled with a reason |
| **Download backup** | owner, admin | ZIP of CSV per table + `backup.json` + a PDF summary | Sensitive fields stay encrypted in the export unless "include decrypted" is ticked by owner (audited) |
| **Start fresh** | owner, admin | Deletes all tenant data (real and sample) except the tenant and its users | Automatic backup first (C13); type the business name to confirm; 10-second undo toast is not enough, so the backup is the undo |
| **Undo last import** | owner, admin | Removes rows created by a Drop Box batch | Allowed within 24 hours and only if no later confirmed attendance or bills depend on them; otherwise shows what blocks it |

---

## 7. Core journeys and acceptance

| ID | Journey | Done when |
| --- | --- | --- |
| J1 | Morning hajri: untick 2, voice note, confirm | Under 60 s cold open on mid-range Android; Home Today card green; ring, streak update; celebration |
| J2 | Family member opens Home in Gujarati, taps Work card speaker | Hears a correct Gujarati sentence matching the card; without Sarvam, sees the sentence and "Voice not connected" in Gujarati |
| J3 | Month close: enter company count, generate bill, PDF, GST CSV | Totals equal domain calculation; PDF renders in Latin and Indic fonts |
| J4 | Log injury by voice, link worker, close later | Shows on Home while open; hidden from viewer |
| J5 | Ask "Kaun si company sabse zyada kaam deti hai?" by voice in Hindi | Correct client and share; every number in the answer exists in the tool result |
| J6 | Photo of handwritten list on Hajri | Proposed ticks, matched names with confidence, unmatched list; nothing saved before confirm |
| J7 | Confirm offline, reconnect | One record set, no duplicates |
| J8 | Remove sample data | All 152 sample workers and related rows gone; real rows (if any) intact; app opens Setup; ribbon gone |
| J9 | Drop an Excel worker list (with and without Gemini) | Columns mapped (suggested by AI or picked manually), workers proposed, duplicates flagged, Apply creates them, Undo works |
| J10 | Drop a register photo and an old bill photo | Past attendance and a client with rate proposed; user edits one value, applies |
| J11 | Switch through all four languages on every tab | No English leaks (except allow-list), no clipped text at 360px, insights and chips change language, speech uses the right voice |
| J12 | Start fresh | Backup ZIP exists, data wiped, Setup opens, users still log in |
| J13 | Full morning at real scale: 152 sample workers, 5 companies; mark 9 absentees across 3 companies by voice and search, move 1 worker for today, confirm all | Under 5 minutes on a mid-range Android; man-days per company correct; moved worker counted at the new company only |
| J14 | Gate list photos: 3 photos for 3 companies in one go | Each photo assigned to the right company, proposals reviewed together, one confirm |
| J15 | Month close for 5 companies from the all-companies screen, one role-rate company and one out-of-state company | Role lines on the bill; IGST on the out-of-state bill; totals equal domain calculation |

---

## 8. Data model (`src/db/schema.ts`)

All data tables: `id uuid pk`, `tenant_id uuid not null` (except `tenants`), `created_at`, `updated_at`, **`is_sample boolean not null default false`**, **`source enum(manual, camera, voice, chat, import, seed) default 'manual'`**, **`import_batch_id uuid null`**. Index `tenant_id` and `(tenant_id, is_sample)`. Money in `bigint` paise.

| Table | Key columns | Notes |
| --- | --- | --- |
| `tenants` | name, legal_name, gstin, address, state_code, sac_code, bill_prefix, next_bill_no, bank_footer jsonb, bill_language enum(en, bilingual), weekly_off int[], prefill_source enum(home, yesterday) default 'home', family_can_see_margin bool default false, bill_template jsonb, profile_is_sample bool, setup_completed_at | |
| `users` | name, phone, pin_hash, role, locale enum(en,hi,mr,gu), digits enum(latin,native), theme, animations, sound, failed_pins, locked_until, is_sample | Unique (tenant_id, phone) |
| `sessions` | user_id, token_hash, expires_at, device_label | |
| `clients` | name, gstin, address, state_code, office_location, active | |
| `rate_cards` | client_id, role enum(fitter,helper,welder,supervisor,other) null, rate_paise, effective_from, effective_to | `role = null` is the company's flat rate. Role rows override the flat rate for that role. A company is "role-rate" if it has any role row. |
| `statutory_settings` | pf_mode, pf_bps, esic_mode, esic_bps, gst_bps (1800), rounding, rates_confirmed | bps = basis points |
| `workers` | name, phone, role enum(fitter,helper,welder,supervisor,other), status, joined_on, daily_wage_paise, pay_mode, photo_url, uan, esic_ip, pf_status, esic_status, aadhaar_last4, bank_name, ifsc, bank_account_enc, bank_holder, notes_enc | |
| `assignments` | worker_id, client_id, shift enum(day,night), kind enum(home, temporary), from_date, to_date | `home` drives pre-fill; `temporary` covers "move for today" (from_date = to_date). At most one home assignment per worker per date. |
| `shift_days` | client_id, date, shift, status enum(draft,confirmed), confirmed_by, confirmed_at, idempotency_key | Unique (tenant_id, client_id, date, shift) |
| `attendance` | shift_day_id, worker_id, status enum(present,absent), note | Unique (shift_day_id, worker_id) |
| `month_closes` | client_id, month, our_man_days, client_man_days, billed_man_days, status | |
| `invoices` | client_id, month_close_id, bill_no, bill_date, period, man_days, rate_paise, base, pf, esic, taxable, cgst, sgst, igst, total (all paise), is_draft, status | Snapshot; imported old bills have `month_close_id` null |
| `payments_in` | invoice_id, cheque_no, cheque_date, amount_paise, received_on, note | |
| `advances` | worker_id, given_on, amount_paise, reason, recovered_paise | |
| `payroll_lines` | worker_id, client_id, month, man_days, daily_wage_paise, gross, recovery, net, mode, paid, paid_on | |
| `issues` | type, worker_id, client_id, title, body_enc, amount_paise, paid_by, status, sensitive, closed_note, closed_at | |
| `issue_updates` | issue_id, body_enc, created_by | |
| `badges` | code, earned_on | |
| `holidays` | date, label | |
| `import_batches` | created_by, status enum(uploading, extracting, review, applied, failed, undone, expired), summary jsonb, applied_at, undo_until | |
| `import_files` | batch_id, filename, mime, size_bytes, storage_path, kind enum(image, pdf, sheet, text, audio), detected_doc_type enum(register_page, attendance_card, bill, worker_list, id_card, bank_details, notes, unknown), status, error, deleted_at | Physical file deleted after apply or retention |
| `import_items` | batch_id, file_id, locator (sheet/row or page/region), entity_type enum(business, client, rate, worker, assignment, attendance_day, invoice, advance, issue, note), payload jsonb, confidence real, match_status enum(new, duplicate, conflict, unmatched), matched_entity_id, decision enum(pending, accept, reject, edited), edited_payload jsonb | |
| `audit_log` | user_id, action, table_name, record_id, before, after | Never deleted by Remove sample or Start fresh |
| `chat_messages` | user_id, role, text, tool_calls, locale | Keep 90 days |

---

## 9. Domain logic (`src/domain/`, pure and tested)

### 9.1 Man-days

Count of `present` attendance in `confirmed` shift days for the client and date range. Night shift starting 8 PM on date D belongs to D. Unconfirmed days are excluded from bills and shown as "not confirmed".

### 9.2 Money

- `rupeesToPaise`, `paiseToRupees`, `formatINR(paise, locale, digits)` with Indian grouping and ₹.
- `applyBps(paise, bps)` with integer maths, round half up.
- Rounding `line_half_up`: each line rounded to the nearest rupee, totals are sums of rounded lines.
- `amountInWords(paise, locale)`: Indian system (lakh, crore) in all four languages (`src/i18n/numberWords.ts`), unit-tested for 0, 1, 15, 100, 1,000, 1,00,000, 5,48,975, 1,00,00,000 in each locale.

### 9.3 Bill

```text
For each confirmed present attendance row of this client in the month:
    rate = role rate for (client, worker.role, date) if one exists, else the client's flat rate for date
    (no rate found → bill blocked with "Rate missing for {role} at {client}")
base    = Σ over (role, rate period) groups of (man_days_in_group × rate)
          (each group becomes one bill line: "Fitter, 200 man-days × ₹720")
pf      = percent_of_base ? round(base × pf_bps / 10000) : fixed ? entered : 0
esic    = same with esic settings
taxable = base + pf + esic
same state:   cgst = sgst = round(taxable × (gst_bps/2) / 10000), igst = 0
other state:  igst = round(taxable × gst_bps / 10000)
total   = taxable + cgst + sgst + igst
```

### 9.4 Bill layout (placeholder until a real bill photo is imported)

Header: legal name, address, GSTIN, phone. Title "TAX INVOICE". Bill no, date. Bill to: client, address, GSTIN. Line: "Manpower supply services, {period}", SAC, man-days, rate, amount. Then Base, PF, ESIC, Taxable, CGST 9%, SGST 9% (or IGST 18%), Total, amount in words, bank details, signature box. One component `BillDocument`. If a bill photo is imported, the extracted field labels and order are stored as `tenants.bill_template jsonb` and used by `BillDocument`.

### 9.5 Golden test (sample settings)

Rate ₹667, PF 1300 bps, ESIC 325 bps, GST 1800 bps intra-state, `line_half_up`, 600 man-days:

| Line | Value |
| --- | --- |
| Base | ₹4,00,200 |
| PF | ₹52,026 |
| ESIC | ₹13,007 |
| Taxable | ₹4,65,233 |
| CGST | ₹41,871 |
| SGST | ₹41,871 |
| **Total** | **₹5,48,975** |

**Golden test 2, role-rate company** (same PF, ESIC, GST, rounding): Fitter 200 man-days × ₹720, Helper 350 × ₹620, Welder 50 × ₹760:

| Line | Value |
| --- | --- |
| Fitter | ₹1,44,000 |
| Helper | ₹2,17,000 |
| Welder | ₹38,000 |
| Base | ₹3,99,000 |
| PF | ₹51,870 |
| ESIC | ₹12,968 (12,967.50 rounds up) |
| Taxable | ₹4,63,838 |
| CGST | ₹41,745 (41,745.42) |
| SGST | ₹41,745 |
| **Total** | **₹5,47,328** |

Same inputs for an out-of-state client: IGST ₹83,491, total ₹5,47,329.

Also: IGST case for golden test 1 = ₹83,742; zero man-days blocks the bill ("No confirmed days"); mid-month rate change; `pf_mode = none`. These rates are samples; `rates_confirmed = false` keeps bills DRAFT.

### 9.6 Insights (`insights.ts`)

Functions return `{ key, params, severity }`. UI renders via i18n templates (section 12.4); speech uses the same rendered sentence. No AI.

| Key | Rule |
| --- | --- |
| `top_client_work` | Client with most man-days this month, share percent |
| `month_vs_last_up` / `_down` / `_same` | Month-to-date man-days vs same day last month |
| `today_pending` / `today_done` | Today's confirm status |
| `absent_most` | Worker with most absences this month (≥ 3) |
| `cheque_pending` | Delivered, unpaid invoice, days since |
| `pf_missing` / `esic_missing` | Count of active workers pending |
| `open_issues` | Open issue count |
| `streak` | Current streak |
| `estimated_bill` | Sum of estimated bills this month |
| `best_margin` | Company with the highest (billed per man-day − average wage per man-day) this month; owner only unless family margin is on |
| `short_today` | Company with present below 90% of usual today, with the gap |
| `cash_plan` | Wages to pay vs cheques expected this month, and the gap |
| `unplaced` | Active workers with no home company |

Show at most 5 ordered by severity (problem, pending, positive). Plurals via ICU.

### 9.7 Payroll

`gross = man_days × daily_wage`; `recovery = min(advance_outstanding, entered)`; `net = gross − recovery`. Statutory deductions from wages are out of scope for v1.

**Margin (`margin.ts`):** per client per month, `billed_per_manday = base / man_days` (base only; PF, ESIC and GST are pass-through and excluded), `wage_per_manday = Σ(gross wages of workers for their man-days at this client) / man_days`, `margin_per_manday = billed_per_manday − wage_per_manday`, `margin_total = base − Σ gross wages`. If any present worker at the client has no daily wage, return `{ status: 'incomplete', missing_wage_count }` instead of a number.

**Cash plan (`cashplan.ts`):** `wages_due = Σ net payroll for the month (cash and bank separately) − paid`; `cheques_expected = Σ total of delivered unpaid invoices`, each with expected date = delivered date + the client's usual days to pay (median of last 3 payments, default 5 days); `gap = cheques_expected − wages_due`.

**Strength (`strength.ts`):** usual headcount per client and shift = count of home assignments active today; present = confirmed or draft present today; ratio thresholds 0.9 and 0.75.

### 9.8 Streaks

A date is complete when every client-shift with an active assignment is confirmed. Streak counts consecutive complete dates ending today or yesterday, skipping holidays and weekly offs.

### 9.9 Matching (`matching.ts`, used by camera, chat and Drop Box)

- Normalise: lowercase, strip honorifics (bhai, ben, shri, shree, ji, mr), collapse spaces, transliterate Devanagari and Gujarati to Latin for comparison.
- Score: exact phone match = 1.0; exact GSTIN = 1.0; name Levenshtein ≤ 2 or phonetic key match = 0.8; first-name only = 0.5.
- ≥ 0.8 → `duplicate` (same entity); 0.5 to 0.8 → `conflict` (ask); < 0.5 → `new`.

---

## 10. Chat and voice commands (`src/ai/chat/`)

### 10.1 Flow

```text
text (typed or Sarvam STT in the user's locale)
 → router: Gemini function calling with the tools below
     (no Gemini: keyword/synonym matcher with synonyms in all 4 languages)
 → tool runs a named, tenant-scoped query
 → narrator: Gemini phrases ONLY the result JSON in {locale}
     (no Gemini: the tool's i18n template)
 → guard: every number in the sentence must exist in the result (after normalising Indian grouping and native digits); otherwise use the template
 → answer card in {locale} (+ TTS in {locale})
```

### 10.2 Read tools

`mandays_by_client(month)`, `mandays_trend(months)`, `estimated_billing_by_client(month)`, `today_status()`, `worker_attendance(worker, month)`, `top_absentees(month, limit)`, `cheque_status(client?)`, `wages_due(month, client?)`, `pf_esic_pending()`, `open_issues(type?)`, `worker_lookup(name)`, `streak_and_badges()`, `margin_by_client(month)` (owner, or viewer if family margin is on), `cash_plan(month)`, `strength_today()`, `unplaced_workers()`. Viewer role strips sensitive fields.

### 10.3 Write intents (always a confirm card)

| Intent | Example | Effect |
| --- | --- | --- |
| `mark_absent` | "Aaj Shree Polymers day mein Manoj nahi aaya" | Absent on today's draft, or reopen with audit |
| `add_note` | "Ramesh ke liye likho: der se aaya" | Note on attendance row |
| `log_issue` | "Suresh ka haath kat gaya, company ne ilaaj karaya" | New injury issue, paid by company |
| `mark_cheque` | "Om Packaging ka cheque aa gaya" | Payment on latest delivered invoice |
| `add_advance` | "Manoj ko 2000 advance diya" | Advance row |

### 10.4 Prompt rules

- You know no numbers except those in the tool result.
- Reply only in `{locale}` (en, hi, mr or gu), one or two short sentences, simple everyday words, Indian number grouping.
- Keep worker and company names exactly as stored.
- Out of scope → say so and suggest the closest question chip.
- No legal or tax advice; for PF, ESIC, GST rules say "please confirm with your CA" in `{locale}`.

---

## 11. Voice, camera and the Drop Box

### 11.1 Voice

- **STT:** hold to record (≤ 30 s; ≤ 2 min inside Drop Box), send to `/api/voice/stt` with the language code for the active locale (Sarvam codes such as `en-IN`, `hi-IN`, `mr-IN`, `gu-IN`; verify in docs). The text lands in the field for editing.
- **TTS:** `/api/voice/tts` with text and locale, speaker from `SARVAM_TTS_SPEAKER_{LOCALE}`. Cache by hash(text, locale, speaker) in IndexedDB. Tap again to stop. Max 400 characters per call; "Listen to all" plays card by card.
- **Fallbacks:** no Sarvam key → mic shows "Voice not connected. Please type." and speak buttons show the sentence (all translated). Browser `speechSynthesis` only if a voice exists for that locale.

### 11.2 Camera to attendance

1. Photo, compressed to ≤ 1600px JPEG.
2. Gemini vision with schema:

```json
{ "date": "YYYY-MM-DD|null",
  "entries": [{ "client_hint": "string|null", "shift_hint": "day|night|null",
                "names_present": ["string"], "names_absent": ["string"], "headcount": 0 }],
  "confidence": 0.0 }
```

3. zod-validate, match names (9.9), show proposed ticks in brass, unmatched names with "Add as new worker" / "Ignore".
4. Confirm via normal flow. **Photo not stored.** UI says so.

### 11.3 Drop Box (import zone)

**Purpose:** one place where he dumps everything he already has, and the app turns it into proposed records he reviews before anything is saved.

**Names:** en "Drop Box", hi "सब डालो", mr "सगळं टाका", gu "બધું નાખો".

#### 11.3.1 Upload screen (`/dropbox`)

- Large `DropZone` with an open-box illustration. Accepts drag and drop, file picker, camera, paste text, record voice.
- Buttons: **Photo**, **File**, **Paste text**, **Speak**.
- Accepted: JPG, PNG, WebP, HEIC (converted), PDF (≤ 10 pages), XLSX, XLS, CSV, TXT (including WhatsApp chat exports), pasted text, voice notes (≤ 2 min).
- Limits: 20 files per batch, 10 MB per file. Over limit: friendly message, nothing lost.
- Optional hint chips the user can tap to help classification: "Worker list", "Attendance register", "Old bill", "Company details", "Bank details", "Other".
- "Start reading" creates the batch; a progress view shows each file with an animated status: Reading → Found N items → Done, or Needs connection, or Could not read (with reason).

#### 11.3.2 Extraction pipeline (server, `src/ai/extract/`, `src/server/services/import.ts`)

| Step | Sheet (xlsx/xls/csv) | Image / PDF | Text / WhatsApp export | Voice |
| --- | --- | --- | --- | --- |
| 1. Read | SheetJS: all sheets, header row detection (first row with ≥ 3 non-empty text cells) | PDF pages rendered to images | Raw text | Sarvam STT in user's locale, then as text |
| 2. Classify | By headers | Gemini: `detected_doc_type` | Gemini: which entity types are present | Same as text |
| 3. Map / extract | **Column mapping**: Gemini suggests header → field map; without Gemini, user maps columns on a screen with dropdowns. Then deterministic row conversion. | Gemini vision with the schema for the doc type | Gemini with the multi-entity schema | Same as text |
| 4. Validate | zod per entity | zod | zod | zod |
| 5. Match | `matching.ts` against existing rows and other items in the batch | same | same | same |
| 6. Store | `import_items` with locator, confidence, match status | same | same | same |

Without Gemini: sheets work end to end with manual mapping; images, PDFs, text and voice show "Needs AI connection" and stay in the batch until a key is added.

**Field dictionary for sheet mapping** (headers matched in all four languages and common spellings): name/naam/नाम/નામ → worker.name; mobile/phone/फोन/मोबाइल/ફોન → worker.phone; company/kampani/कंपनी/કંપની → assignment.client; shift/पाली/પાળી → assignment.shift; rate/rojgar/मजदूरी/पगार/પગાર/wage → worker.daily_wage; UAN/PF no → worker.uan; ESIC/IP no → worker.esic_ip; account/khata/खाता/ખાતું → worker.bank_account; IFSC → worker.ifsc; aadhaar/आधार/આધાર → worker.aadhaar_last4 (mask). Date-like columns with P/A or 1/0 values → attendance by day.

**Extraction schemas per doc type:**

| Doc type | Extracts |
| --- | --- |
| `worker_list` | workers: name, phone, role, client, shift, daily_wage, uan, esic_ip, bank fields |
| `register_page` / `attendance_card` | attendance_day: date, client, shift, present names, absent names, headcount |
| `bill` | business (legal name, GSTIN, address, bank footer, SAC), client (name, GSTIN, address), invoice (no, date, period, man-days, rate, base, PF, ESIC, CGST, SGST, IGST, total), bill template (field labels in order) |
| `id_card` | worker name and Aadhaar **last 4 only**; anything else discarded |
| `bank_details` | worker bank name, IFSC, account (to be encrypted) |
| `notes` / text | any of: workers, clients, rates, advances ("Manoj ko 2000 diye"), issues, notes |

**Rules:**

- Extracted invoice numbers are **recomputed** by `billing.ts` from extracted inputs; mismatches are flagged on the item ("Bill total on paper ₹X, calculated ₹Y") and never silently corrected.
- Full Aadhaar numbers are masked to last 4 before anything is stored, including in `import_items.payload`.
- Every item keeps its locator so the review screen can show the source (sheet and row, or a crop of the page).

#### 11.3.3 Review screen (`/dropbox/[batchId]`)

- Summary bar with count-up: "Found: 1 business, 5 companies, 156 workers, 1,840 attendance days, 3 bills".
- Groups as collapsible sections in this order: Business, Companies and rates, Workers, Who works where, Attendance history, Bills, Advances, Issues and notes, Could not use.
- Each `ImportItemCard`: the proposed values (editable inline, voice on text fields), confidence chip (High ≥ 0.85, Check 0.6 to 0.85, Low < 0.6), source preview, match badge (New, Already exists, Looks similar), and Accept / Reject.
- Defaults: High and New items pre-accepted; Check and Low items unticked; Already exists items skipped unless values differ.
- `ConflictCompare` for Looks similar or differing values: side by side "Now: wage ₹480 | From file: wage ₹500" with choices Keep, Replace, Keep both (separate worker).
- Bulk actions: "Accept all high", "Reject all low".
- Sticky footer: "Apply 26 items". Disabled while any accepted item fails validation (field highlighted with a translated message).

#### 11.3.4 Apply, undo and cleanup

- Apply runs in one DB transaction with an idempotency key per batch. Order: business → clients → rates → workers → assignments → attendance (creates `shift_days` as `confirmed` with `source = import`) → invoices → advances → issues.
- All created rows carry `source = 'import'` and `import_batch_id`.
- Success screen: celebration, counts, and next suggested Setup step.
- **Undo** (24 hours): removes rows of the batch if nothing later depends on them (e.g. a bill generated from imported attendance); otherwise lists blockers.
- Physical files are deleted right after Apply, or after `UPLOAD_RETENTION_DAYS` if never applied (`jobs/cleanup.ts`, run on server start and daily).

---

## 12. Four languages (release blocker)

### 12.1 Scope: everything changes language

When the user switches language, **all** of these change immediately, without reload:

1. Tab names, headers, buttons, labels, placeholders, helper text.
2. Toasts, confirm sheets, errors, validation messages, empty states, provider status banners.
3. Insights and every spoken sentence (TTS voice and language follow the locale).
4. Chat suggested chips, chat answers and chat errors.
5. Voice input language (STT uses the locale's code).
6. Badge names and descriptions, setup steps, Drop Box statuses and review labels.
7. Dates, month names, weekday names, numbers (Indian grouping, optional native digits), amount in words.
8. Bill screen labels (the bill document itself follows the bill language setting, 6.8).
9. Cash slips (print in the worker-facing language chosen at export: Hindi, Marathi or Gujarati).
10. `<html lang>`, fonts and line heights.

User-entered data (names, notes) stays as entered.

### 12.2 Mechanics

- `next-intl` with ICU messages for plurals and selects. Locale stored per user; the top-bar chip switches instantly and saves.
- Namespaces: `nav`, `common`, `home`, `hajri`, `workers`, `issues`, `chat`, `mahina`, `setup`, `dropbox`, `settings`, `data`, `insights`, `badges`, `errors`, `voice`, `pdf`.
- AI prompts take `{locale}` and a language name; narrator output is checked to be in the right script (Devanagari for hi/mr, Gujarati for gu, Latin for en); wrong script → template fallback.
- Server errors return codes, never English messages; the client translates.

### 12.3 Core glossary (draft, native review required)

| Key | en | hi | mr | gu |
| --- | --- | --- | --- | --- |
| present | Present | हाज़िर | हजर | હાજર |
| absent | Absent | गैरहाज़िर | गैरहजर | ગેરહાજર |
| day_shift | Day shift | दिन पाली | दिवस पाळी | દિવસ પાળી |
| night_shift | Night shift | रात पाली | रात्र पाळी | રાત પાળી |
| man_days | Man-days | मैन-डे | मॅन-डे | મેન-ડે |
| confirm | Confirm | पक्का करें | निश्चित करा | પાકું કરો |
| yes_confirm | Yes, confirm | हाँ, पक्का | हो, पक्के | હા, પાકું |
| make_bill | Make bill | बिल बनाओ | बिल बनवा | બિલ બનાવો |
| cheque_received | Cheque received | चेक आया | चेक आला | ચેક આવ્યો |
| wages | Wages | पगार | पगार | પગાર |
| speak | Speak | बोलो | बोला | બોલો |
| listen | Listen | सुनो | ऐका | સાંભળો |
| listen_all | Listen to all | सब सुनो | सगळे ऐका | બધું સાંભળો |
| today_pending | Today's attendance is pending | आज की हाज़िरी बाकी है | आजची हजेरी बाकी आहे | આજની હાજરી બાકી છે |
| fill_attendance | Fill attendance | हाज़िरी भरो | हजेरी भरा | હાજરી ભરો |
| same_as_yesterday | Same as yesterday | कल जैसा | कालसारखे | ગઈકાલ જેવું |
| all_present | All present | सब हाज़िर | सगळे हजर | બધા હાજર |
| close_month | Close month | महीना बंद करो | महिना बंद करा | મહિનો બંધ કરો |
| estimate | Estimate | अंदाज़ | अंदाज | અંદાજ |
| drop_box | Drop Box | सब डालो | सगळं टाका | બધું નાખો |
| apply | Apply | लागू करो | लागू करा | લાગુ કરો |
| sample_data | Sample data | नमूना डेटा | नमुना माहिती | નમૂના માહિતી |
| remove_sample | Remove sample data | नमूना डेटा हटाओ | नमुना माहिती काढा | નમૂના માહિતી કાઢો |
| start_fresh | Start fresh | नई शुरुआत | नव्याने सुरुवात | નવી શરૂઆત |
| setup | Setup | सेटअप | सेटअप | સેટઅપ |

### 12.4 Insight templates (draft, native review required)

| Key | en | hi | mr | gu |
| --- | --- | --- | --- | --- |
| top_client_work | {client} gave {pct}% of this month's work. | इस महीने का {pct}% काम {client} ने दिया। | या महिन्यातील {pct}% काम {client} कडून आले. | આ મહિનાનું {pct}% કામ {client} તરફથી આવ્યું. |
| month_vs_last_up | Work is up {pct}% compared with last month. | पिछले महीने से काम {pct}% ज़्यादा है। | मागील महिन्यापेक्षा काम {pct}% जास्त आहे. | ગયા મહિના કરતાં કામ {pct}% વધારે છે. |
| month_vs_last_down | Work is down {pct}% compared with last month. | पिछले महीने से काम {pct}% कम है। | मागील महिन्यापेक्षा काम {pct}% कमी आहे. | ગયા મહિના કરતાં કામ {pct}% ઓછું છે. |
| today_pending | Today's attendance is not done yet. | आज की हाज़िरी अभी बाकी है। | आजची हजेरी अजून बाकी आहे. | આજની હાજરી હજુ બાકી છે. |
| absent_most | {worker} was absent {days} days this month. | {worker} इस महीने {days} दिन गैरहाज़िर रहे। | {worker} या महिन्यात {days} दिवस गैरहजर होते. | {worker} આ મહિને {days} દિવસ ગેરહાજર રહ્યા. |
| cheque_pending | {client}'s cheque is pending for {days} days. | {client} का चेक {days} दिन से बाकी है। | {client} चा चेक {days} दिवसांपासून बाकी आहे. | {client} નો ચેક {days} દિવસથી બાકી છે. |
| pf_missing | PF is pending for {count} workers. | {count} कामगारों का PF बाकी है। | {count} कामगारांचा PF बाकी आहे. | {count} કામદારોનું PF બાકી છે. |
| open_issues | {count} issues are open. | {count} समस्याएँ खुली हैं। | {count} अडचणी प्रलंबित आहेत. | {count} સમસ્યાઓ બાકી છે. |
| streak | Attendance done {days} days in a row. | लगातार {days} दिन हाज़िरी भरी गई। | सलग {days} दिवस हजेरी भरली. | સતત {days} દિવસ હાજરી ભરાઈ. |
| estimated_bill | This month's bills so far: about {amount}. | इस महीने अब तक का बिल: लगभग {amount}। | या महिन्याचे आतापर्यंतचे बिल: सुमारे {amount}. | આ મહિનાનું અત્યાર સુધીનું બિલ: આશરે {amount}. |
| best_margin | {client} earns the most: {amount} per man-day after wages. | सबसे ज़्यादा कमाई {client} से: पगार के बाद प्रति मैन-डे {amount}। | सर्वात जास्त कमाई {client} कडून: पगारानंतर प्रति मॅन-डे {amount}. | સૌથી વધુ કમાણી {client} થી: પગાર પછી દરેક મેન-ડે {amount}. |
| short_today | {client} is short by {count} workers today. | आज {client} में {count} कामगार कम हैं। | आज {client} मध्ये {count} कामगार कमी आहेत. | આજે {client} માં {count} કામદાર ઓછા છે. |
| cash_plan | Wages due {wages}; cheques expected {cheques}. | पगार देना है {wages}; चेक आने हैं {cheques}। | पगार द्यायचा आहे {wages}; चेक येणार आहेत {cheques}. | પગાર આપવાનો છે {wages}; ચેક આવવાના છે {cheques}. |
| unplaced | {count} workers have no company assigned. | {count} कामगारों को कोई कंपनी नहीं दी गई है। | {count} कामगारांना कंपनी दिलेली नाही. | {count} કામદારોને કોઈ કંપની સોંપેલી નથી. |

Use ICU plural forms where counts can be 1 (e.g. "1 issue is open").

### 12.5 Chat suggestion chips (draft)

| en | hi | mr | gu |
| --- | --- | --- | --- |
| How many man-days this month? | इस महीने कितने मैन-डे? | या महिन्यात किती मॅन-डे? | આ મહિને કેટલા મેન-ડે? |
| Which company gives the most work? | कौन सी कंपनी सबसे ज़्यादा काम देती है? | कोणती कंपनी सर्वात जास्त काम देते? | કઈ કંપની સૌથી વધુ કામ આપે છે? |
| Who was absent the most? | सबसे ज़्यादा छुट्टी किसने ली? | सर्वात जास्त गैरहजर कोण? | સૌથી વધુ ગેરહાજર કોણ? |
| Whose PF is pending? | किसका PF बाकी है? | कोणाचा PF बाकी आहे? | કોનું PF બાકી છે? |
| Has the cheque come? | चेक आया क्या? | चेक आला का? | ચેક આવ્યો? |
| How much wages to pay? | कितना पगार देना है? | किती पगार द्यायचा आहे? | કેટલો પગાર આપવાનો છે? |
| Which company earns the most? | किस कंपनी से सबसे ज़्यादा कमाई है? | कोणत्या कंपनीकडून सर्वात जास्त कमाई? | કઈ કંપનીથી સૌથી વધુ કમાણી? |
| Which company is short today? | आज किस कंपनी में कामगार कम हैं? | आज कोणत्या कंपनीत कामगार कमी आहेत? | આજે કઈ કંપનીમાં કામદાર ઓછા છે? |

### 12.6 Language quality gates

1. `pnpm i18n:check` fails if any key is missing in any locale, if ICU placeholders differ between locales, or if a value is identical to English in a non-English locale (except an allow-list).
2. **English-leak test (Playwright):** for each locale `hi`, `mr`, `gu`, open every route with seed data, collect visible text, strip user data (seeded names) and allow-listed tokens (`GST`, `PF`, `ESIC`, `UAN`, `IFSC`, `PDF`, `CSV`, `ARQ`, `₹`, digits), and fail on any remaining Latin word.
3. **Layout test:** every route at 360px in each locale, no horizontal scroll, no clipped button text (screenshot per locale per tab saved to `tests/e2e/__screenshots__`).
4. **Speech test:** TTS request uses the locale's language code and speaker; with no key the fallback text is in the locale.
5. **Chat test:** a fixed question in each locale returns an answer in the right script.
6. Every locale file carries `"_review": "pending native review"` until a native speaker signs off. Marathi review by Rishi; Gujarati and Hindi by a native speaker before showing the tenant.

---

## 13. Security and privacy

1. PIN bcrypt (cost ≥ 10), lockout after 5 failures for 10 minutes.
2. Session cookie httpOnly, secure in production, sameSite lax, 30 days, rotated on login.
3. Every repository call takes `tenantId` from the session.
4. AES-256-GCM for bank account, worker notes, issue bodies.
5. Aadhaar: last 4 only, everywhere, including import payloads.
6. Bank account masked; "show" by owner is audited.
7. AI calls server-side only. Bank, Aadhaar and health text are never sent to AI after extraction; chat tools strip them.
8. Camera photos never stored. Drop Box files deleted after apply or retention.
9. Rate limit AI routes (30 per minute per user).
10. Backups include encrypted fields unless the owner explicitly asks for decrypted (audited).
11. Worker deletion removes personal fields and keeps anonymised counts for past bills. Designed for India's DPDP duties applying from 13 May 2027.

---

## 14. Sample data (`src/db/sampleData.ts`, all rows `is_sample = true`, `source = 'seed'`)

Shown with the Sample data ribbon. All names invented.

### 14.1 Tenant and users

- Tenant: "Rajesh Desai", legal name placeholder "Desai Manpower Services", state Gujarat (24), GSTIN placeholder `24AAAAA0000A1Z5`, SAC placeholder `998519`, bill prefix `RD/26-27/`. `profile_is_sample = true`.
- Users: Rajesh (owner, PIN 1234, en, **real, not sample**), Rishi (admin, PIN 9999, en, **real**), Papa (viewer, PIN 1111, gu, **sample**).

### 14.2 Companies (5)

| Company | Location (state code) | Billing | Rates per man-day | Shifts and usual headcount | Sundays |
| --- | --- | --- | --- | --- | --- |
| Shree Polymers | Vapi GIDC, Gujarat (24) | Role rates | Fitter ₹720, Welder ₹760, Helper ₹620, Supervisor ₹800 | Day 28, Night 17 = **45** | Works |
| Om Packaging | Vapi GIDC, Gujarat (24) | Flat | ₹650 | Day 22, Night 13 = **35** | Works |
| Sarigam Chemicals | Sarigam GIDC, Gujarat (24) | Role rates | Fitter ₹700, Welder ₹740, Helper ₹600, Supervisor ₹780 | Day 18, Night 12 = **30** | Works |
| Vapi Fab Works | Vapi GIDC, Gujarat (24) | Flat | ₹700 | Day 25 = **25** | Off |
| Daman Packaging | Daman, DNH and DD (26) | Flat | ₹640 | Day 11, Night 6 = **17** | Works |

**Total: 152 workers.** Daman Packaging is outside Gujarat so its bills use **IGST** (exercises 9.3). Two companies use role rates and three use flat rates (exercises both billing paths).

### 14.3 The 152 sample workers (generated deterministically)

`sampleData.ts` generates workers with a **seeded RNG (seed 2026)** so every `pnpm seed` gives identical data.

**Role mix per company:**

| Company | Supervisor | Fitter | Welder | Helper | Total |
| --- | --- | --- | --- | --- | --- |
| Shree Polymers | 1 | 11 | 5 | 28 | 45 |
| Om Packaging | 1 | 9 | 3 | 22 | 35 |
| Sarigam Chemicals | 1 | 8 | 3 | 18 | 30 |
| Vapi Fab Works | 1 | 8 | 4 | 12 | 25 |
| Daman Packaging | 1 | 4 | 1 | 11 | 17 |
| **Total** | **5** | **40** | **16** | **91** | **152** |

Night-shift headcount is taken from each company's helpers and fitters (supervisors on day).

**Daily wages** (₹10 steps, uniform within range): Helper ₹450 to ₹520, Fitter ₹580 to ₹650, Welder ₹620 to ₹690, Supervisor ₹700 to ₹800.

**Pay mode:** all Om Packaging workers are paid by bank (matches the real pattern of one company paid by transfer); all supervisors by bank; everyone else cash.

**Statutory and data gaps (so filters and insights have something to show):** PF pending for 15 workers, ESIC pending for 9, bank details missing for 3 Om Packaging workers, 2 active workers unplaced, 4 inactive workers (left in October).

**Names:** unique "First Last" combinations from these pools, invented and mixed across Gujarati, Marathi, Hindi and south Gujarat tribal communities:

- First names: Ramesh, Suresh, Manoj, Vikram, Ganesh, Imran, Dinesh, Santosh, Ravi, Prakash, Ajay, Sunil, Mahesh, Kiran, Raju, Anil, Nilesh, Jitendra, Bharat, Sachin, Mukesh, Rakesh, Jignesh, Hitesh, Paresh, Kamlesh, Bhavesh, Sanjay, Vijay, Deepak, Amit, Rohit, Pankaj, Arjun, Sandeep, Yogesh, Rajendra, Shankar, Mohan, Arvind, Govind, Lalit, Naresh, Umesh, Tushar, Prashant, Vinod, Ashok, Dilip, Haresh, Kishor, Pravin, Ramdas, Babu, Salim, Aslam, Rafiq, Iqbal, Shabbir; women helpers at the two packaging companies: Laxmi, Sunita, Geeta, Kavita, Savita, Jyoti, Manisha.
- Surnames: Patel, Patil, Yadav, Solanki, Jadhav, Shaikh, Rathod, More, Chauhan, Vasava, Parmar, Gavit, Pawar, Dhodia, Bhoi, Thakor, Shinde, Mishra, Halpati, Kale, Varli, Koli, Tandel, Mali, Gupta, Prajapati, Rana, Makwana, Chaudhari, Pandey, Tiwari, Kushwaha, Sonawane, Bhosale, Gaikwad, Ansari, Khan, Naik, Dubla, Kokni.

**Fixed "story" workers** (placed first, so insights and tests are predictable):

| Name | Role | Company and shift | Why |
| --- | --- | --- | --- |
| Manoj Kumar | Helper | Shree Polymers, Day | Absent 6 days in the current month (`absent_most`); PF pending; advance ₹2,000 (₹1,000 recovered) |
| Suresh Yadav | Helper | Shree Polymers, Day | Hand injury in October, closed, company paid |
| Ravi Chauhan | Helper | Shree Polymers, Night | PF and ESIC both pending |
| Ramesh Patil | Fitter | Shree Polymers, Day | Name-matching test |
| Ramesh Patel | Helper | Sarigam Chemicals, Day | Near-duplicate of Ramesh Patil, forces the chooser in voice and photo flows |
| Kiran Dhodia | Helper | Om Packaging, Day | Open advance issue, ₹2,500 |
| Raju Bhoi | Helper | Om Packaging, Night | Moved to Daman Packaging for 3 days last week (temporary assignments) |
| Imran Shaikh | Welder | Vapi Fab Works, Day | Advance ₹3,000, fully recovered |
| Jyoti Halpati | Helper | Daman Packaging, Day | Health issue open (sensitive, hidden from viewer) |
| Sachin Kale | Supervisor | Vapi Fab Works, Day | Bank paid, all statutory done |
| Pankaj Varli | Helper | none (unplaced) | Shows in the Unplaced card |

Phones are fake (`90000 00001` upward). Bank workers get fake IFSC `SBIN0000000` and fake account numbers, encrypted. Aadhaar last 4 random.

### 14.4 History

- **Attendance confirmed from 1 Sep 2026 to yesterday** (about 10,500 rows), seeded absences of 3 to 8% a day per company, Vapi Fab Works off on Sundays. Today is left unconfirmed so the morning journey can be tried.
- **Temporary moves:** about 1% of worker-days are moves to another company (always shown with the "moved from" tag).
- **Yesterday's strength:** Sarigam Chemicals night shift at 9 of 12 (75%) so the strength card shows red for yesterday's view.
- **September:** all 5 companies tallied, billed, delivered and paid.
- **October:** all 5 tallied (Om Packaging with a 4 man-day difference, billed on company count), billed and delivered; cheques received for Shree Polymers, Sarigam Chemicals and Vapi Fab Works; **Om Packaging pending 6 days, Daman Packaging pending 9 days**.
- **Payroll:** September and October fully paid; current month open.
- **Advances:** 18 rows across 14 workers, ₹500 to ₹5,000, about half recovered.
- **Issues:** 8 total: 2 injuries (closed), 1 health (open, sensitive), 3 PF/ESIC pending (open), 1 count dispute with Om Packaging for October (open), 1 advance (open).
- **Badges and streak** derived from the data (current streak about 9 days; Saat Din and Poora Mahina earned).
- **Statutory settings:** PF 1300 bps, ESIC 325 bps, GST 1800 bps, `rates_confirmed = false` (bills show DRAFT).
- A second tenant "Demo Tenant 2" with 5 workers, used only by the isolation test, never visible in the UI.

**Sanity numbers the seed test must assert:** 152 workers (148 active), 5 clients shown on Home, 10 closed invoices (Sep and Oct), 2 unpaid invoices, PF pending count 15, unplaced count 2.


---

## 15. Remove sample data and start fresh (behaviour detail)

**Remove sample data** (`POST /api/data/remove-sample`):

1. Count rows with `is_sample = true` per table; show them in the confirm sheet (translated).
2. On confirm, in one transaction and in FK-safe order, delete sample rows; reset tenant fields where `profile_is_sample` (keep tenant name "Rajesh Desai"); recompute badges and streak from remaining data.
3. Audit log entry with counts. Ribbon disappears. Redirect to `/setup`.
4. Real rows created by the user on top of sample data (e.g. a real worker assigned to a sample company) are protected: if a real row references a sample row, the sheet lists these and offers "Keep the sample company" or "Remove them too".

**Load sample data** (`POST /api/data/load-sample`): allowed only when no real clients, workers or attendance exist.

**Start fresh** (`POST /api/data/start-fresh`):

1. Create backup ZIP in `BACKUP_DIR` and offer download.
2. Type the business name to confirm (`DangerConfirm`).
3. Delete all tenant data except `tenants` (identity fields), `users`, `sessions`, `audit_log`.
4. Clear `setup_completed_at`; redirect to `/setup`.

---

## 16. Performance and reliability

- Home interactive < 2 s on 4G mid-range Android; Hajri toggles < 100 ms (optimistic UI).
- Volume: about 150 to 160 attendance rows a day; about 4,500 a month and 55,000 a year per tenant. Postgres handles this without a cache layer.
- Indexes: `attendance (tenant_id, shift_day_id)`, `shift_days (tenant_id, date, client_id)`, `workers (tenant_id, status)`, `assignments (tenant_id, worker_id, from_date)`.
- Hajri: the sheet for all 5 companies loads in one request (≤ 160 workers with today's statuses, about 30 KB); lists over 40 rows are virtualised; every toggle is optimistic and saved to the draft in the background (debounced 800 ms), so nothing is lost if the phone locks.
- Confirm all: up to 400 rows written in one transaction, under 1 second on Neon.
- Home: one request, server-side aggregates only, under 300 ms with seed data.
- Workers list: virtualised, search runs client-side on the loaded list (152 rows).
- Payroll and cash slips for 150+ workers render under 3 seconds; PDFs generated server-side.
- One call `GET /api/home?month=` returns all Home data from `src/server/queries/home.ts`.
- AI routes: 15 s timeout (60 s per file for Drop Box extraction, processed one file at a time with progress), typed errors, UI fallback state.
- Error boundary per tab with a friendly, translated retry.

---

## 17. Test fixtures

- `tests/fixtures/photos/`: 3 synthetic handwritten-style attendance images (generate with a script using a handwriting font).
- `tests/fixtures/import/` (created by `pnpm fixtures`):
  - `workers_en.xlsx` (English headers, 12 workers, 2 duplicates of seed names),
  - `workers_160.xlsx` (160 workers across 5 company names, for import performance and duplicate handling at scale),
  - `workers_gu.xlsx` (Gujarati headers),
  - `attendance_oct.xlsx` (date columns with P/A),
  - `notes_hi.txt` ("Manoj ko 2000 advance diya. Om Packaging rate 650."),
  - `bill_sample.pdf` (one-page invoice matching the golden test).
- AI-dependent tests use recorded fixtures (mocked provider responses) so CI runs without keys.

---

## 18. Build phases

| Phase | Scope | Acceptance |
| --- | --- | --- |
| P1 Scaffold | Repo, constitution, tokens, fonts per locale, `next-intl` with all namespaces stubbed in 4 locales, schema with `is_sample`/`source`, Docker Postgres, sample seed of 152 workers and 5 companies (section 14) with its sanity test, PIN login, nav, language chip, sample ribbon | `pnpm setup && pnpm dev` works; three users log in; language switch changes every visible string; `pnpm i18n:check` passes |
| P2 Domain | money, number words (4 locales), mandays, billing, payroll, insights, streaks, matching, with tests | Golden bill and edge cases pass; ≥ 90% coverage on `src/domain` |
| P3 Hajri | Company overview, company sheet with Absent-only and Full views, virtualised list, search, moves (today and from today), pre-fill source setting, draft autosave, confirm per company and all, celebration, idempotency, audit | J1 and J13 with typing only |
| P4 Home | All cards including margin, cash plan and today's strength; charts for 5 companies; insights in 4 languages; ring, streak, badges, speak buttons with text fallback | Numbers match domain; viewer read-only; margin hidden from viewer by default |
| P5 Mahina | Per-company and all-companies month close, role-rate and flat bills, IGST, PDF (Indic fonts embedded), GST CSV, cheque, payroll for 150+, cash slips with denomination summary, bank CSV | J3, J15 |
| P6 Workers and Issues | List, quick add, profile, encryption, advances; issues with sensitivity | J4; viewer API test |
| P7 Data management | Remove sample, load sample, backup, start fresh, Setup checklist | J8, J12 |
| P8 Drop Box (sheets) | Upload, batches, SheetJS parse, manual and AI column mapping, review, conflicts, apply, undo, cleanup job | J9 with and without Gemini |
| P9 Voice | Sarvam STT/TTS per locale, provider banners | J2 |
| P10 Chat | Tools, router, keyword fallback in 4 languages, narrator, guard, confirm cards, chips | J5 |
| P11 Vision | Camera attendance including multi-photo gate lists for several companies; Drop Box images, PDFs, text and voice extraction | J6, J10, J14 |
| P12 PWA and language QA | Manifest, offline queue, dark mode, reduced motion, empty and error states, leak and layout tests in all locales, Lighthouse PWA and accessibility ≥ 90 | J7, J11; HANDOFF.md |

Stop at the last complete phase if time runs out and write HANDOFF.md.

---

## 19. Non-goals for v1

- Replacing the signed card, gate register or bill book.
- Worker-facing app or logins.
- Supervisor or munshi logins per company (Rajesh marks all attendance in v1; the schema's roles allow adding this later).
- Half-day or overtime billing (notes only).
- Statutory deductions from wages; PF, ESIC or GST portal filing.
- Bank-specific bulk payment format (generic CSV only).
- SMS or WhatsApp sending.
- Keeping uploaded files or photos beyond the retention window.
- Tenant self-signup, SaaS billing, cross-tenant admin console.
- ESIC accident claim workflows.
- Native apps (PWA only).
- Automatic translation of user-entered names and notes.

---

## 20. Open items (confirm with the tenant)

| # | Item | Current assumption |
| --- | --- | --- |
| 1 | Real bill layout, SAC, rounding | Placeholder; replaced when a bill photo is imported |
| 2 | How PF and ESIC appear on the bill | Percent of base, sample rates, DRAFT until confirmed |
| 3 | GST on PF and ESIC portion | Yes, per the call; confirm with a CA |
| 4 | Real clients, workers, rates (150+ workers, 5 companies known) | Loaded via Drop Box after sample removal |
| 5 | Bank and bulk-upload format | Generic CSV |
| 6 | Wage structure and advances | Daily wage × days; advances optional |
| 7 | Wage payment date vs cheque date | Not modelled |
| 8 | Translations | Drafts; native sign-off before showing the tenant |
| 9 | Gujarat rules under the Labour Codes | Not encoded; no compliance claims in UI |
| 10 | Do workers stay with one company or rotate? | Unknown; both supported, pre-fill from home company by default (6.4.4) |
| 11 | Flat or role-wise rates per company? | Unknown; both supported (9.3) |
| 12 | Rajesh marks all attendance alone | Confirmed; supervisor logins are a later option, not in v1 |

---

## 21. Definition of done

- Journeys J1 to J15 pass locally.
- `pnpm test`, `pnpm e2e`, `pnpm i18n:check`, type check and lint are clean.
- The app runs with no AI keys and shows honest, translated "not connected" states.
- Switching between English, Hindi, Marathi and Gujarati changes every screen, insight, chat answer and spoken sentence.
- Sample data (152 workers, 5 companies) removes in one step and the Setup and Drop Box flow can load real data.
- `HANDOFF.md` lists what was verified, what was not built, and the next step.

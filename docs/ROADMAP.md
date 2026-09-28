# finni (Финни) — Implementation Roadmap

Master plan for an LLM implementing the app in this repo. Read in this order before writing any code:

1. [`CONTEXT.md`](../CONTEXT.md) — domain vocabulary. Use these exact RU terms in UI strings and code names.
2. [`docs/REQUIREMENTS.md`](./REQUIREMENTS.md) — the hackathon requirements with every `→ Specify:` slot resolved inline. Requirement IDs (`R1`–`R14`, `TC`, `UX`, `HP`, `ND`) refer to its sections.
3. [`docs/adr/`](./adr/) — why React Native, and why the day cadence works as it does.
4. This document — everything else: settled decisions, architecture, **design flow (§4)**, milestones, content, tests.

Team-owned deliverables (presentation PPTX, demo video, RuStore card) are **out of scope** for the implementation work; §11 lists what to hand over to them.

---

## 1. Ground rules (invariants for every milestone)

- **Fully offline.** Zero network calls in MVP. No Android permissions beyond defaults. No secrets in the repo.
- **RU-only UI.** All user-facing strings in Russian, ages 7–11 register: short phrases, no shaming, complex terms only from Словарик.
- **No real money, no ads, no purchases, no social, no external links** (see `HP` in REQUIREMENTS.md).
- **Balance never changes silently.** Every coin movement goes through the feedback card (source + amount).
- **Safe errors.** A wrong decision lowers Сытость/Счастье and spawns a timed correction Задание — never progress reset, never pet death/illness (no exceptional events in v1).
- **Content decoupled.** Catalog, tasks, and glossary = versioned JSON in `assets/content/`, zod-validated at load, never hardcoded in components. Цели are catalog Желаемые, not a parallel content file. Bump `contentVersion`; new tasks ship without touching app logic.
- **Injectable clock.** All "today" reads go through a `Clock` port; Демо-режим swaps in a manual clock (ADR-0002).
- **Accessibility.** Touch targets ≥48×48 dp; body text ≥16 sp; verdicts/status shown as icon+text, never color alone; animations toggleable in settings; destructive actions double-confirmed.
- **Perf budget.** Launch → main screen ≤5 s (Hermes, no startup I/O beyond DB open); every action gives visual response ≤1 s (optimistic UI, effects applied synchronously).

## 2. Settled decisions — the answers to every `→ Specify:` slot

These were decided in the planning interview; do not re-derive them. If a number seems wrong, flag it — don't silently change it.

### 2.1 Economy (R4, R5, R6, R7)

| Parameter | Value |
|---|---|
| Currency | Монеты (coins), integer only |
| Стартовый бюджет | 100, granted once when the child presses «Дальше» on the pet’s name, with no feedback card. The tour then highlights that 100 on Main under «Твой первый бюджет» |
| Task reward | up to the Задание's `reward` × share of first-try answers (right 1, «с ценой» ½, wrong 0); a replay pays only the improvement over the best run (`taskProgress.bestReward`). A pinned Урок pays up to 30 or 35 — that lesson is the day's income (ADR-0010). A mini-game or correction pays up to 10 or 15 |
| Счета (day bills) | `catalog.json` `bills` cycle, day n = bills[(n − 1) mod 5]: Обед+Проезд 20 · +Школьные 30 · +Лекарство 35 («простыл») · +Школьные 30 · Обед+Проезд 20 |
| Plan areas (≥3) | Обязательные / Желаемые / Копилка |

**Catalog — 11 items** (price / pet impact shown pre-purchase; optional flag `once` defaults false):

| # | Item | Kind | Price | Pet effect |
|---|---|---|---|---|
| 1 | Обед (lunch) | mandatory | 12 | Сытость +10 and Счастье +5; those gains offset the daily drops and do not cancel them |
| 2 | Школьные принадлежности | mandatory | 10 | Счастье +5 |
| 3 | Проезд (transport) | mandatory | 8 | Счастье +5 |
| 4 | Лекарство (medicine) | mandatory | 15 | Счастье +20 |
| 5 | Конфета (candy) | optional | 5 | Счастье +5 |
| 6 | Стикеры (stickers) | optional | 7 | Счастье +6 |
| 7 | Кино (cinema visit) | optional | 20 | Счастье +12 |
| 8 | Игрушка (toy) | optional | 25 | Счастье +10 (priced high so an insufficient-funds attempt is easy to stage) |
| 9 | Скейтборд | optional, `once` | 90 | Счастье +12 |
| 10 | Телескоп | optional, `once` | 160 | Счастье +15 |
| 11 | Велосипед | optional, `once` | 240 | Счастье +18 |

**Цель:** one Желаемое from that catalog (at most one; not an Обязательное). First-run / demo seed Скейтборд. Копилка is a single pot attributed to the active Цель. «Положить» debits Баланс and grows the pot; reaching the price does not spend the pot and does not move Счастье. Celebration («Мечта сбылась!») offers «Купить из копилки» or «Позже»; buying from the pot deducts the price, records the purchase (item meter then), and clears the Цель. Completion-date estimate = remaining ÷ average deposit (rolling over recent transfers), shown only after ≥1 transfer, else «—».

**Day rules:** Игровой день opens when the player starts it (unlocked at local midnight in normal play; back-to-back in Демо-режим). When a day closes, the engine computes the day score, updates meter messages, recomputes Этап, and stores the record that Итоги reopens. Nothing in the play shell closes a day. How Задания advance the day is not specified yet (ADR-0002, ADR-0004).

**Банк (2026-09-24):** a Деньги option after `savings_where` is completed (Демо-режим: always). If the remembered section is Банк and the lesson is still locked, Деньги opens Копилка. Offers in `core/config.ts` `BANK`: 3 дня +10%, 5 дней +20%, minimum 10. «Открыть вклад» → confirm sheet → debit `bank_in` from Баланс; row in `deposits` (migration 5) with `maturesDayN = day n + days`. When a later Игровой день opens on Main, `collectDeposits` credits principal + floor(interest) as `bank_out` once and the day's FeedbackCard says «Вклад вернулся: +N (из них M — проценты)». No early withdrawal; Журнал labels «Вклад в банк» / «Вклад вернулся».

### 2.2 Pet (R2, R3, R9, R10)

- **Identity:** the profile "character" **is** the pet. Appearance = Вид (species) + Окрас (color) + Аксессуар (accessory): **3 × 3 × 3 = 27 combinations** (≥9 required), designer's PNG bundle.
- Species/color/accessory keys: `sp1|sp2|sp3`, `c1|c2|c3`, `a1|a2|a3`. Display names come from the team with the asset drop; placeholders until then.
- **Meters (the "key status indicators"):** Сытость and Счастье, 0–100, rendered as icon + bar (never color alone).
  - Сытость: +10 when Обед is bought. Every Игровой день ends at −15, and that +10 sits on top of the drop. A drumstick marks the meter.
  - Счастье: +5 from Обед, plus the item's number from every other purchase (including a Цель bought from Копилка or Баланс). Every Игровой день ends at −15, and those gains sit on top of the drop. −5 when actual optional spending exceeds the plan bucket, and that stacks with the daily drop. A smile marks the meter. Reaching the Цель price does not move Счастье.
- **Этапы (stages):** Новичок → Друг → Мастер. Per-day score: **+2** all of today's Счета bought · **+1** «по плану» — Желаемые spend ≤ plan **and** Копилка deposits ≥ plan **and** purchases ≤ Обязательные + Желаемые · **+1** savings deposit made. Stage = rolling sum over the last 3 closed days: **<3 Новичок, 3–8 Друг, ≥9 Мастер**. Recomputed at every day close; any change shows a kid-worded explanation. Visuals faked programmatically (scale/glow tint) — see the asset contract in §5.4.
- **Reactions/recovery (R9 slot):** no illness/death events in v1. Negative meters only cause sad pose + explanation + timed correction task. The doc's "unforeseen medical expense" exists solely as the Лекарство catalog item (event variant is stretch, §2.6).

### 2.3 Задания (R8)

**Карта заданий** (2026-09-24, replaces the list): 9 lesson pins, 3 per topic (Савва's 6 lessons + 3 `comingSoon` placeholders — visible «⏳ скоро», never playable, not counted), 3 mini-games belonging to «Покупки» (`parent: "payments_shop"`, open when it is done; listed together under Мини-игры on Карта and as chips on that pin), and the «Почини рюкзак» correction. How to add a lesson: `docs/CONTENT.md`. Each is a pin (`pin: {x, y, district}` in fractions of `assets/map/moscow.png`). Unlock is by completion only, no calendar gate: only budget #1 is open; finishing it opens #1 of savings and payments and budget #2; then each topic goes by `order`; `requires` overrides the chain (bonus games). Демо-режим opens every pin at once. Tapping a pin opens a sheet: topic, district, difficulty stars, description, «Награда: до N» or best result + «можно получить ещё N», «Начать» / «Пройти ещё раз» or «Откроется после «X»». Content is `assets/content/tasks.json` (§5.3); the map art is one PNG that Andrei's design replaces.

### 2.4 Взрослый раздел & Демо-режим (R12, R13)

- **Gate:** random two-digit × one-digit multiplication (e.g., 14 × 7); wrong answer → new question. Asked on every entry (session-scoped).
- **Contents:** learning progress — topics in positive wording, the share of fully right first answers (right counts, «с ценой» and wrong do not), and how many Уроки were first finished across real calendar dates (separate from Игровые дни; a replay does not add an урок) · Демо-режим toggle · profile reset/delete (extra confirmation, typed action) · Родительский бонус is **stretch** (§2.6).
- **Демо-режим:** toggled in Взрослый раздел; creates/switches to a dedicated demo profile (`isDemo = true`), pre-onboarded, with the manual clock; "Сбросить демо" restores its initial state; exit returns to the normal profile untouched. Must sustain **≥5 consecutive days** end-to-end (R13, Appendix A).

### 2.5 Первый запуск & help (R1, R11)

- Первый запуск opens with three static cards from `intro.json` (`welcome`, `task`, `decisions`), buttons «Начать», «Понятно», «Дальше». Top row: back icon «Назад», progress bar, `1/3`…`3/3`. Back on card 1 leaves the app; later cards step back. No skip. The cards do not write a profile and do not grant coins. Then «Настрой своего питомца» (Вид, Окрас; no Аксессуар) and «Придумай имя своему питомцу». «Дальше» on the name writes the Профиль ребёнка (leftover persistence `name` equals `petName`), grants Стартовый бюджет 100 with no feedback card, and opens Main into Finny’s tour (`finnyTour` meta: step id, then `"done"`). Closing the app before that write restarts at card 1. Closing during the tour resumes the saved step. A profile with no tour key (returning child, reset) skips the tour.
- The tour, in order: «Твой первый бюджет», which highlights the live balance (the 100) on Дом; home intro; wallet; map tab; Сытость; Счастье; the Цель block; «Выбери финансовую цель» on the same picker as Деньги → Цель (preset rows and «Своя цель»; «Закрыть» and «Без цели» stay hidden until a Цель is set); confirm «Твоя цель» / «Стоимость»; «Узнать больше»; the educational program «Понятно»; the map with the first mission open and the three-mission period «Понятно»; what happens after a mission. It is not replayed from Словарик. Opening Main does not show an income card.
- Help re-access: Словарик is a button on Карта. Both tabs list only Уроки the child has finished. Tab «Слова» is one tile per theory-card title of those уроки; tapping it shows that card, with `{pet}` replaced. Tab «Уроки» is a compact list of the same finished уроки; tapping one opens its theory cards. An open but unfinished урок is absent, and so are «скоро», correction tasks, mini-games, the «Начать» prompt, and «Готово!». Демо-режим uses the same rule. No replay button.

### 2.6 Stretch tier (build only after M6; never blocks the mandatory scope)

In build order: (1) animation polish — sound effects for a right answer, a wrong answer, and the end of a Задание, plus a volume slider on Настройки, are in · (2) Родительский бонус (+5/+10/+20 once per day with optional reason, logged as a transaction) · (3) «неожиданные расходы» medical event · (4) tablet/landscape · (5) **Помощник** — kid-visible LLM chat button on the main screen: feature-flagged off by default, optional (never required), topic-restricted RU system prompt, no personal data in requests, no links in output, API key via local `.env` (never committed), explicit no-connection message. (See CONTEXT.md «Помощник».)

## 3. Architecture

Stack: **React Native + Expo (managed) + TypeScript**, React Navigation (stack), **expo-sqlite + Drizzle ORM**, zod, jest. Decisions and trade-offs in [ADR-0001](./adr/0001-react-native-expo-drizzle-expo-sqlite.md); day cadence in [ADR-0002](./adr/0002-real-calendar-day-cadence-demo-untied.md).

App identity: `applicationId org.hseteamspb.finni` · display name «Финни» · `versionName 0.1.0` · `versionCode 1` · portrait-only · `minSdkVersion 26` (Android 8.0) via `expo-build-properties` · release APK signed with a locally generated keystore (never committed; generation documented in README).

```
src/
  core/            # PURE domain logic — no React/Expo imports; jest-tested
    economy.ts     #   grants, allowance, purchases, blocking, plan validation
    savings.ts     #   transfers, withdrawal, goal math, date estimate
    stages.ts      #   day score, rolling window, stage thresholds
    days.ts        #   day open/close, unlock rules (uses Clock)
    tasks.ts       #   task runner: nodes, verdicts, unlock order
    clock.ts       #   Clock port + SystemClock + ManualClock (demo)
  data/
    db.ts schema.ts repositories/   # Drizzle over expo-sqlite; migrations
    content.ts     # loads+validates assets/content/*.json (zod), contentVersion check
  ui/
    screens/       # FirstRun, Main (Дом / Карта / Деньги), Shop, Results,
                   # Handbook, Plan, Savings, Bank, TaskRun, Adult, Settings
    components/    # PetView, MeterBar, CoinBadge, FeedbackCard, ConfirmSheet…
    theme.ts strings.ts   # RU strings; spacing/type scale ≥16 sp
assets/
  content/         # catalog.json tasks.json terms.json
  pets/            # designer drop — contract in §5.4
docs/
```

### 3.1 Navigation map

`FirstRun (six cards → Питомец → Имя) → Main`. Opening Main shows Дом with the Стартовый бюджет and no income card. Main is a three-tab shell (ADR-0004): Дом, Карта, Деньги. A fresh launch opens Дом with Деньги on Копилка. While the app stays open it keeps the current tab and the current Деньги choice. The bottom bar is only those three roots; pushed screens hide it. Android Back pops one screen; from Карта or Деньги with nothing pushed it opens Дом; from Дом with nothing pushed it leaves the app. Screen-by-screen specifications and flows: §4.

### 3.2 Storage schema (Drizzle/SQLite; R13 slot)

```
profiles(id PK, name, species, color, accessory, petName, balance INT,
         isDemo INT, contentVersion, createdAt)
days(id PK = profile||'#'||n, profileId FK, n INT, openedAt, closedAt?)
plans(id PK, profileId FK, dayId FK, mandatory INT, optional INT, savings INT,
      status 'draft'|'confirmed', confirmedAt?)
transactions(id PK, profileId FK, dayId FK, kind, amount INT(signed),
             itemId?, goalId?, labelKey, createdAt)
purchases(id PK, profileId FK, dayId FK, itemId, price INT, kind, createdAt)
savingsTransfers(id PK, profileId FK, dayId FK, amount INT, kind 'in'|'out', createdAt)
goals(id PK, profileId FK, key, cost INT, status 'active'|'achieved',
      isActive INT, achievedAt?)
petState(profileId PK, care INT, mood INT, stage INT)
meterEvents(id PK, profileId FK, dayId FK, meter, delta INT, source, createdAt)
dayScores(id PK, profileId FK, dayId FK, mandatoryCovered INT, withinPlan INT,
          deposited INT, score INT)
taskProgress(id PK, profileId FK, taskKey, status, rewardPaid INT, bestReward INT, correctAnswers INT, scoredAnswers INT, completedAt?, firstCompletedAt?)
meta(key PK, value)          -- activeProfileId, onboardingDone, animationsOn…
```

Invariants (unit-tested): `profiles.balance == Σ transactions.amount` for every profile; balance can never go negative; Копилка = Σ `savingsTransfers('in')` − Σ `('out')` ≥ 0; a confirmed plan is immutable for its day.

### 3.3 Flow of a purchase (reference for all coin movements)

Catalog tap → item sheet (price, category, pet impact estimate) → confirm → `core/economy` validates balance (else blocked screen: what's missing + options: wait for Пособие, do a Задание, «Сделать целью» for a Желаемое / «Отложить» for an Обязательное) → debit → transaction + purchase rows → meter event → FeedbackCard: «Баланс −12 · Сытость +10 · причина и следующий шаг». Buying the active Цель from Копилка is a separate intent: pot − price, purchase + item meter, Баланс unchanged.

## 4. Design flow — screens

Written for 360 dp portrait, RU copy, ages 7–11. Conventions for every screen: an empty/disabled state always explains what to do next (no dead ends); every verdict/status is icon + text (never color alone); destructive actions are double-confirmed; every coin/meter movement ends in a FeedbackCard.

**Chrome (all current child-facing screens):** cream/orange finni identity, system font, Russian sentence case. Shared kit: Screen, Card, raised PrimaryButton (darker bottom edge; depresses on press; disabled = flat grey), TextButton, Chip (visible check + `aria-selected`), SpeechBubble, Badge, NavTile (pictogram + word), PetView, MeterBar, BackButton labelled «Назад». Type scale: title / section / body / button; body ≥16 sp. Linear flows (Первый запуск) pin the primary action at the bottom; Дом is one scrolling page above the tab bar. Do not import streak/hearts/XP, a lesson path, an owl mascot, or green-as-success-only.

### 4.1 Screen map

```
Launch
 ├─ first run ──→ FirstRun [cards → Питомец → Имя] ─→ Main ─┐
 └─ returning ──────────────────────────────────────────────────→ Main ◄─────┘

Main ── bottom bar: Дом · Карта · Деньги
 ├─ Дом ─────────→ pet, demo line, Пособие ribbon, Цель card, Итоги, Магазин
 │    Магазин ───→ Catalog ─→ ItemSheet ─→ Confirm ─→ FeedbackCard
 │                             └─ insufficient ─→ BlockedSheet ─→ «Выполнить задание» closes Магазин and shows Карта
 │    Итоги ─────→ Results (last closed day + overall counts)
 ├─ Карта ───────→ TaskList (title «Карта заданий», no Back) ─→ TaskRun ─→ TaskResult ─→ Карта
 │    Словарик ──→ Handbook [Слова | Уроки]
 ├─ Деньги ──────→ dropdown «Раздел денег»: Копилка · План · Журнал · Банк
 │    Копилка ───→ Savings ─→ TransferIn / WithdrawPreview ─→ Confirm ─→ FeedbackCard
 │                             └─ pot ≥ price ─→ Celebration (Купить из копилки / Позже)
 │    План ──────→ Plan (draft → confirm → plan-vs-actual)
 │    Банк ──────→ after savings_where; always in Демо-режим
 └─ ⚙ Настройки ─→ version · «Взрослый раздел» → AdultGate ─→ Adult (progress · demo toggle · reset)
```

### 4.2 Screen specifications

**1–2. FirstRun.** *Purpose:* let the child make the pet theirs before the live hub is explained, without writing a partial profile (R1, R2). The journey is §2.5: three cards (`welcome`, `task`, `decisions`), «Настрой своего питомца» (Вид and Окрас only), «Придумай имя своему питомцу» (1–20 characters, «Дальше» stays disabled until the name is valid). That «Дальше» creates the profile (leftover persistence `name` equals `petName`). Failure keeps the draft on the name screen and shows «Не получилось начать игру. Попробуй ещё раз.» Back on card 1 leaves the app; later steps step back. No «Пропустить». Reopening before the profile exists restarts at card 1.

**Как играть.** Finny’s acquaintance tour on Main after the name is saved. It starts by highlighting the balance 100 («Твой первый бюджет»), then explains that chip, the Карта tab, Сытость, Счастье, and the Цель block, then «Выбери финансовую цель» on the same picker as Деньги → Цель, then the map. Not replayed from Словарик.

**3. StartingBudget.** «Твой первый бюджет» is the first beat of the tour on Main, not its own screen. The balance chip already shows 100, and Finny’s card explains those coins while that chip is highlighted. There is no «Забрать монеты» and no separate «Твой бюджет: 100 монет» line. The +100 grant happened inside profile creation, with no feedback card.

**4. Main (three tabs).** *Purpose:* the pet, the map, and the money tools each have one place (R3, ADR-0004). The status strip is the compact Сытость and Счастье meters (icon + bar, numbers in the accessible name), Баланс, Этап, and ⚙ «Настройки». There is no second pair of chunky bars, no active-Задание card, and no «Закончить день». *Дом, top→bottom under the strip:* large centered pet; «Демо: дни идут подряд» when Демо-режим; Пособие ribbon when that visit credited it (same profile); Цель card (name, accumulated/cost, remaining — display only); «Итоги»; «Магазин». A FeedbackCard for Пособие or a вклад that came due covers Дом only on the open that credits them. *Карта:* title «Карта заданий», no Back, «Словарик» in the title row. *Деньги:* dropdown trigger «Раздел денег» with Копилка, План, Журнал, and Банк (Банк hidden until `savings_where`, always present in Демо-режим). Cold start and a fresh provider open Копилка. The last choice is remembered while the app stays open; a locked Банк falls back to Копилка. Switching the dropdown drops an unfinished confirm; a saved План draft stays. The closed control shows the current section and a dropdown arrow. The open list is its own panel, and the current section is the marked row. *Waiting day:* banner «Новый день откроется завтра» on Дом after the pet and the demo line, Магазин disabled, and План / Копилка / Банк show «Откроется завтра» and take no coins. Журнал, Карта, Словарик, and Итоги stay usable. Демо-режим never waits.

**5. Plan (План).** Embedded in Деньги: no Back and no own status strip. While the day is closed the body is the title plus «Откроется завтра» and the steppers are absent. *Purpose:* promise today's split across 3 areas without moving coins (R5). *Zones:* «Сегодня пришло: +N» (today's income: Пособие, Задания; day 1 includes Стартовый бюджет); compact available amount, the same 16px pixel face as the strip Баланс (balance incl. today's Пособие); promise line under that amount, «Это обещание на сегодня. Монеты пока в Балансе.»; «Счета на сегодня» on the Обязательные row (optional note, e.g. «Питомец простыл…», and «Обед 12 · Проезд 8 = 20»; if Баланс < Счета, «На все счета не хватает N…»); three bucket rows in one card under «Раздели на три кучки» (after confirm, «Как делим»), in decision order — Обязательные, Копилка, Желаемые — with a thin bar of that split above the rows and the unfilled part of the bar as Свободно (no separate ring); each with the integer, a horizontal track 0…available, −/+ (tap ±1, hold repeats), and a pictogram; Обязательные start at today's Счета on a fresh draft and cannot go below them («Обязательных не меньше N — это счета.»; floor clamped to Баланс); Копилка extra «Положишь их отдельно — в Копилке.» plus a live Цель forecast («Скейтборд: накопишь через N дней, если откладывать столько каждый день.» / «Если ничего не отложить, Скейтборд не станет ближе.»); Желаемые hint «Хватит на: …» (cheapest-first items that fit); on later days a draft-only «вчера N» per row from last closed actuals (purchases / `savings_in`), including «вчера 0»; remainder line «Останется свободных: N»; validation line when total > available (blocks confirm); Обязательные below Счета also blocks confirm; «Подтвердить план». After confirm, leftover follow-through is on Магазин (open tab) and Копилка home, not on this screen, Main, or the status strip. *States:* draft (editable; yesterday hint when a closed day exists) → confirmed (locked; confirmation sheet repeats that this is a promise: coins stay in Баланс until Магазин / Копилка, then the plan cannot change; no yesterday; no track) → during-day view adds plan-vs-actual columns (план / потрачено per bucket) → day closed (title and «Откроется завтра» only). The daily drop is not restated here; the Дом «День N» tip and Магазин already say it. *Leaves:* the Деньги tab.

**6. Catalog (Магазин).** *Purpose:* purchases with informed consent (R6). Opens on Обязательное. *Zones:* tabs «Обязательное» / «Желаемое» (pictogram + label); with a confirmed План, one leftover line under the tabs for the open tab («В плане осталось N» or «сверх плана N»; TalkBack prefixes the bucket, «Желаемые: в плане осталось 12»). Rows stay in catalog order. A row is an emoji, then the name (phone font, wraps), then the price (pixel number at 16 sp and the coins icon; TalkBack still hears «12 монет»). Under that, one row of effect chips: meter icon and «+10» (Обед also «+5»), One line under the tabs states the daily drop: «Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!» «Цель», «Куплено» (with the check), and «Один раз» sit on the next row. «Не хватает N» sits under the price, in the normal text color, when Баланс cannot cover it. The whole card is the tap target; TalkBack hears that row in order and the pictures stay hidden. No category line and no «после покупки» on the row. `once` Желаемые leave the tab after any purchase. Tap → item phase with the same header, description, the same effect chips (each announces «Сытость +10») and «Цель» again. A once-item keeps «Можно купить один раз». If Баланс covers the price, the next line is «после покупки: N монет». If it does not, that line is «Не хватает N» and «Купить» is absent: text buttons «Дождаться пособия» and «Выполнить задание», and the gold button is «Сделать целью», or «Отложить» for an Обязательное, or «Понятно» plus «Это уже твоя Цель. Копи дальше в Копилке.» when it already is the Цель. When the pot can pay, «Купить из копилки» is the gold button and spends in one tap. If Баланс also covers, «Купить» is a text button above it and «Отложить» dismisses. If Баланс does not, «Понятно» stays a text button. Otherwise, when only Баланс can pay, «Купить» is gold. That «Купить» still opens «Купить за N 🪙?» (the drawer head already names the item), with «в плане останется N» and «Это сверх плана.» when a План is confirmed. Buying the active Цель from Баланс still warns that the Цель clears and the pot stays. A pot purchase skips that plan line. The first «Сделать целью» applies immediately; a switch still asks «Цель станет …. В копилке останется ….» *States:* purchased today → «Куплено» on rebuyable rows; owned `once` rows are omitted, not greyed. Unconfirmed / no plan: omit leftover. *Leaves:* confirm → FeedbackCard (§3.3). FeedbackCard, «Выбрать новую цель», the tabs, Back, and the status strip stay as they are.

**7. Savings (Копилка).** Embedded in Деньги: no Back and no own status strip. The pot number lives here. While the day is closed the body is the title plus «Откроется завтра» and the coin controls are absent. *Purpose:* savings & goals (R7). *Zones:* pot total large; with a confirmed План, one leftover line for the Копилка bucket («В плане осталось N» or «сверх плана N»); active-Цель card (catalog name, cost, accumulated, remaining, date estimate «—» until first transfer) plus «Выбери цель» (one picker of settable Желаемые, drop to none; pot unchanged on drop or switch); «Положить» → centered modal over a dimmed Копилка (integer, horizontal track 0…Баланс, −/+ tap ±1 and hold repeats, confirm; with a confirmed План also «в плане останется N» after this deposit and, if < 0, non-blocking «Это сверх плана.»); «Забрать» → the same modal, amount capped at the pot, then WithdrawPreview in that modal (pot after, «мечта отодвинется на N дней», separate confirm; no plan leftover; allowed with no Цель). *States:* pot ≥ price → Celebration («Мечта сбылась!», «Купить из копилки» / «Позже»; coins stay, Счастье unchanged); after Позже the Цель stays funded; «Купить из копилки» (here or on the Магазин sheet) deducts the price from the pot, records the purchase, clears the Цель, then FeedbackCard (item meter, Копилка delta) and a button «Выбрать новую цель»; do not force the picker after Позже or drop. Unconfirmed / no plan: omit leftover. *Leaves:* FeedbackCard on deposit, withdrawal, and buy; picker anytime.

**8. TaskList (Карта заданий).** The Карта tab. No Back. «Словарик» sits in the title row and opens the handbook. *Purpose:* learning content entry (R8). *Zones:* three topic groups (Бюджет, Копилки, Платежи) × 2 cards each: title, topic icon, reward badge «+10» if unclaimed, completed badge. Mini-game buttons stay on a pin. *States:* locked → «Откроется: завтра» (normal play) / all open (Демо-режим); completed → replayable, no reward. *Leaves:* TaskRun.

**9. TaskRun.** *Purpose:* play one Задание node by node. *Zones:* node text (scene), pet pose reacting to the last verdict, option buttons (≥48 dp), after a tap: verdict banner (✅/🤔/⚠️ icon + word) + explanation panel + «Дальше». `retry` returns into the same node (correction path); `spawnTask` shows «Новое задание появилось в списке!». *Leaves:* TaskResult.

**10. TaskResult.** *Zones:* outcome summary, «+10 монет» if first correct completion, «На карту». When this finish opened Копилка, План, or Банк, a gold plaque leads the screen: «Открылось», the tool name in the pixel face, and a line that it now lives in Деньги. The same plaque leads Итоги дня, including when the app is opened again onto that screen. Демо-режим skips it — those tools are already there. A replay does not show it. *Leaves:* Main on the Карта tab, or Итоги дня when the lesson ended the day.

**11. Record, journal, handbook.** Прогресс is not a screen (ADR-0004). *Итоги* is a pushed screen from Дом and can be opened again: last closed day (score, plan-vs-actual, meter reasons, stage explanation when one exists) plus overall counts (days played, tasks done, «Целей: N»). Empty copy: «Итоги появятся после первого закрытого игрового дня.» This is distinct from Итоги дня, the end-of-day moment. *Журнал* is a Деньги section: chronological transactions grouped by day, and it stays usable on a waiting day. *Словарик* is the handbook on Карта, tabs «Слова» and «Уроки» (§2.5). No replay button.

**12. AdultGate.** *Purpose:* adult gate (R12). *Zones:* «Сколько будет 14 × 7?» (random two-digit × one-digit), numeric input, «Войти». *States:* wrong → new question (after 2 attempts), no hints. *Leaves:* Adult.

**13. Adult (Взрослый раздел).** Reached from Настройки in every build, behind the same arithmetic gate. There is no hub tile and no delete button on Настройки. *Zones:* progress overview (topics completed, days played — positive wording only); Демо-режим toggle (on → confirm sheet «Демо создаёт отдельный тестовый профиль»; off → returns to normal profile); «Сбросить демо»; «Сбросить прогресс» / «Удалить профиль» with typed confirmation. *States:* stretch — Родительский бонус card (§2.6). *Leaves:* Main / demo Main.

**14. DaySummary (Итоги дня).** The end-of-day moment screen stays in the navigator. Nothing in the shell navigates to it, because nothing closes a day. The reopenable record is Итоги (§11). When a close control exists, this screen is the plan-vs-actual table, the day score, meter reasons, a stage explanation when the stage changed, and «Ждём завтра!» (normal) / «Следующий день» (demo). If the lesson that closed the day opened Копилка, План, or Банк, the same gold «Открылось» plaque as on TaskResult sits above the day strip. Итоги does not repeat it.

**15. Settings (⚙).** *Zones:* app name and version; «Взрослый раздел» in every build. Opened from the play-screen strip ⚙ (accessible name «Настройки»). *Leaves:* Main, or AdultGate.

**16. FeedbackCard (component, centered sheet).** *Zones:* delta rows with icons (Баланс ±N · Копилка ±N · Сытость ±N · Счастье ±N); a full-screen tap-catch so the hub behind is inert. Пособие uses chip «Начало игрового дня» (never «награда») instead of a «потому что» sentence. Every card, including the first Пособие, confirms with «Понятно» and does not dim the hub. Purchase / savings cards keep cause + next-step lines. Every row is also appended to Журнал. Used after: grant, Пособие, purchase (Баланс or from Копилка), blocked purchase (variation), transfer, withdrawal, parent bonus (stretch). A finished Задание opens TaskResult instead of a reward card. Reaching the Цель price is Celebration only — no FeedbackCard and no Счастье row until the item is bought.

### 4.3 Key flows

- **First launch (Appendix A 1–4):** Launch → three opening cards → pet → name → «Дальше» (profile created, +100) → Finny’s tour on Main, opening on the highlighted balance → ordinary hub. Force-quit before profile creation discards the draft and restarts at card 1. Force-quit during the tour resumes the saved step. Force-quit after the tour reopens Дом with no tour.
- **Day loop (normal & demo):** day opens on entering Main after unlock → Пособие +20 via FeedbackCard → Plan confirmed from Деньги → free play (Магазин / Карта / Копилка; plan-vs-actual live on Plan). Nothing in the shell closes a day. After a day has closed, normal play waits until the next calendar morning (banner on Дом, Магазин disabled, План / Копилка / Банк frozen); Демо-режим opens the next day on the next visit to Main. Журнал, Карта, Словарик, and Итоги stay available. The stored record is Итоги.
- **Insufficient funds (Appendix A 7):** Магазин → Игрушка (25) at balance < 25 → the row and the item phase say «Не хватает N» and «Купить» is absent → a way out exists in-app (Задание now, Пособие tomorrow, or «Сделать целью»).
- **Savings withdrawal (R7):** Копилка → «Забрать» → amount → WithdrawPreview (pot after, date shift) → separate confirm → FeedbackCard.
- **Correction path / safe error (R9):** bad verdict or skipped mandatory item → meter drop + sad pose + explanation + `spawnTask` correction Задание or next-day plan-adjust hint; progress is never reset.
- **Demo walkthrough (Appendix A 12):** Дом → Настройки → Взрослый раздел → AdultGate → demo toggle → demo Дом (fresh test profile, all tasks open, days back-to-back, «Демо: дни идут подряд») → ≥5 back-to-back days → «Сбросить демо» restores initial state → exit returns to the normal profile.
- **Persistence (Appendix A 11):** every mutation writes through to SQLite immediately; kill & relaunch lands on Main with profile, balance, purchases, savings, goal, and learning progress intact.

## 5. Content contracts

### 5.1 `catalog.json`

```json
{ "contentVersion": 1, "items": [
  { "id": "lunch", "name": "Обед", "kind": "mandatory", "price": 12,
    "effect": { "meter": "care", "delta": 10 },
    "description": "Питомцу нужно есть каждый день" },
  { "id": "skateboard", "name": "Скейтборд", "kind": "optional", "price": 90,
    "effect": { "meter": "mood", "delta": 12 },
    "description": "Кататься во дворе после школы", "once": true } ] }
```

Eleven items. Optional boolean `once` defaults false; true only on Скейтборд, Телескоп, Велосипед. Candy-tier stays rebuyable. A Цель is a catalog Желаемое id, not a separate content list.

### 5.2 `terms.json`

Catalog optional rows are the only Цель source (`id`, `name`, `cost` = price, `description`; `once` as above). Do not restore a parallel `goals.json` presets file. Terms: the 11 glossary entries including План. `intro.json` is the three opening cards (`welcome`, `task`, `decisions`), each with `title`, `body`, and `button`. Later acquaintance lines live in `src/ui/finnyScript.ts`.

### 5.3 `tasks.json` — task node schema

```json
{ "contentVersion": 1, "tasks": [
  { "id": "budget_first_plan", "topic": "budget", "title": "Первый план",
    "reward": 10, "intro": "…",
    "nodes": [
      { "id": "start", "text": "…",
        "options": [
          { "label": "…", "next": "node2 | retry | exit",
            "verdict": "good | warn | bad",
            "explanation": "…",
            "effect": { "meter": "care", "delta": 5 },
            "spawnTask": null } ] } ] } ] }
```

Node kinds: `choice` (default — `text` + `options`), `card` (`title?`, `text`, `next`, `button?` — teaching card, not scored), `sort` (`text`, `bins`, `items: [{label, bin, explanation}]`, `next` — «Нужно или хочется?»-style game; each item scored on its first answer, a wrong basket retries the item). Mission fields: `order`, `difficulty` 1–3, `description`, `pin`, optional `requires`. `{pet}` in any text is replaced with the pet's name. The loader rejects dangling `next` / `spawnTask` / `requires` and a map mission without pin/order.

Rules: every option carries `explanation` (shown after the action, regardless of verdict — R8); `verdict` renders icon+text, never color-only (`UX`); `retry` = correction path back into the same node; `spawnTask` enqueues a timed correction Задание (safe-error rule, R9); runner is generic — a new task is data only.

### 5.4 Designer asset drop — `assets/pets/` (current contract)

Andrei draws one sheet per look: `design/pets/andrei/pet_{1|2|3}_{gray|orange|green}[_glasses|_hat].png` — a 15 × 8 grid of 32 px cells whose rows are animations (legend: `design/pets/for_animations.png`). Species `pet_N` = `spN`, colours gray/orange/green = `c1`/`c2`/`c3`, accessory none/glasses/hat = `a1`/`a2`/`a3`.

`node scripts/slice-pet-sheets.mjs` writes, per drawn look, nearest-neighbour ×8 (256 px frames in 272 px cells, so a frame edge between physical pixels never bleeds):

```
pets/atlas/sp{N}_c{N}_a{N}.png   # IDLE, WALK, JUMP, PUSH rows + PIC and FALLS (living pet on Дом)
pets/poses/sp{N}_c{N}_a{N}.png   # idle (PIC), happy (top of JUMP), sad (FALLS) for still PetView
src/ui/pet/petSprites.generated.ts   # typed require map + layout, committed
```

A look Andrei has not drawn falls back (`resolvePetVariant`): requested accessory → same species/colour without one → same species/colour with any accessory → sp1/c1/none. Аксессуар follows Этап (Новичок none, Про очки, Миллионер шапочка) — see `src/core/accessories.ts`.

## 6. The six Задания — full scripts (RU copy)

Verdicts: `good` ✅ / `warn` 🤔 / `bad` ⚠️ — always with icon, text, and explanation.

### 6.1 «Первый план» — budget_first_plan
Intro: «Сегодня школьная ярмарка! У питомца нет обеда, а ты хочешь мороженое. У тебя 20 монет.»
- **N1 «С чего начнёшь?»**
  - ✅ «Купить обед (10)» → Сытость +5 → N2. «Обязательные расходы — самое важное. Сначала нужды, потом мечты.»
  - ⚠️ «Сначала мороженое (7)» → retry. «На обед больше не хватает. Желаемое подождёт, а питомец — нет.»
  - ⚠️ «Всё в копилку (20)» → retry. «Копить хорошо, но питомец остался голодным. Обязательное важнее.»
- **N2 «Обед куплен. Сколько отложить в копилку?»** (осталось 10)
  - ✅ «5 монет» → exit. «Копилка растёт, и монеты остались на ярмарку.»
  - 🤔 «Все 10» → exit. «Щедро! Но на мелочи не останется ни одной монеты.»
  - 🤔 «Ни одной» → exit. «Копилка не вырастет — мечта отодвинется. Решение с ценой.»

### 6.2 «Сломался рюкзак» — budget_backpack
Intro: «У питомца порвался рюкзак. Починка — 8 монет. Но ты уже запланировал киндер-яйцо за 8!»
- **N1 «Что делать?»**
  - ✅ «Починить рюкзак, яйцо — потом» → exit. «Отложить желаемое — тоже решение. Рюкзак важнее.»
  - ⚠️ «Сначала яйцо» → **spawnTask «Почини рюкзак»** → exit. The answer does not move Сытость or Счастье. «Обязательный ремонт нельзя пропускать. Вот задание, чтобы всё исправить.»
  - 🤔 «Взять из копилки» → preview: дата мечты +1 день → exit. «Можно, но копилка — для мечты, и дата отодвинулась. В следующий раз лучше отложить желаемое.»

### 6.3 «Копилка мечты» — savings_dream_jar
Intro: «Скейт стоит 90 монет. Каждый день можешь откладывать 15. Смотри: 90 : 15 = 6 дней.»
- **N1 «День 1: откладываешь?»**
  - ✅ «Кладу 15» → exit. «Осталось 5 дней. Регулярность бьёт рекорды!»
  - 🤔 «Пропущу, куплю наклейки» → exit. «Пропуск двигает мечту на день: теперь 7. Решение с ценой.»
  - ⚠️ «Заберу всё из копилки» → preview сброса → exit. «Начинать заново обидно. Маленький вклад каждый день — самый честный путь.»

### 6.4 «Большая распродажа» — savings_big_sale
Intro: «Наклейки стоят 7 вместо 14 — только сегодня! В копилке 30 монет на скейт.»
- **N1**
  - ✅ «Проверить дневной бюджет» → хватает → exit. «Молодец: копилка не тронута, а наклейки — твои!»
  - 🤔 «Купить из копилки» → preview: 30→23, дата +1 день → **N2**. «Выгода видна, и цена решения — тоже.»
  - 🤔 «Не покупать» → exit. «Тоже решение: мечта не сдвинулась. Распродажи бывают ещё.»
- **N2 «Скейт теперь на день позже. Как оценишь своё решение?»**
  - ✅ «Я знал(а) цену — норм» / 🤔 «Зря» → оба exit. «Главное — видеть цену решения до того, как платишь.»

### 6.5 «Две цены» — payments_two_prices
Intro: «Питомцу нужен альбом. У школы — 15 монет. За углом такой же — 10.»
- **N1**
  - ✅ «За углом за 10» → exit. «Одинаковое — бери дешевле. Сэкономил 5 монет!»
  - ⚠️ «У школы за 15» → retry. «Ты переплатил 5 за тот же альбом. Сравнивай цены до оплаты!»
- **N2 «А на улице продают фломастер за 3. В магазине такой же стоит 8.»**
  - ⚠️ «Взять за 3» → ломается → retry. «Слишком дешёвое часто ломается сразу. Дешёвый — не значит выгодный.»
  - ✅ «Из магазина за 8» → exit. «Надёжная вещь служит дольше. Считай не только цену.»

### 6.6 «Чек» — payments_receipt
Intro: «Обед 12 + сок 4, дал 20. Продавец вернул сдачу 2. Всё верно?»
- **N1**
  - ✅ «Проверить чек» → exit, **+2 монеты возврат**. «12 + 4 = 16, сдача должна быть 4! Ошибка нашлась.»
  - 🤔 «Спросить продавца, сколько всего» → exit, +2. «Переспросить — тоже хорошо. Ошибка нашлась.»
  - ⚠️ «Забрать и уйти» → exit. «Ты потерял 2 монеты. Проверяй сдачу — так деньги не теряются.»

## 7. Milestones (11 days)

Each milestone ends with a demoable increment. Do not start a stretch item (§2.6) before M6 is done.

- **M0 — Scaffold (Day 1).** Expo RN TS init; app identity per §3; React Navigation; Drizzle+expo-sqlite wiring + migration path; jest; placeholder pet assets; empty Main screen in RU.
  *AC:* release APK builds and installs on an Android 8.0 (API 26) emulator; portrait locked; cold launch → Main ≤5 s.
- **M1 — Domain core (Days 1–2).** `core/` modules + Clock port; content loader with zod; repositories + schema (§3.2) with invariants. Jest suite covering the four mandated areas: **budgeting, debiting, savings, progress/stages** + day gating.
  *AC:* `npm test` green; no UI yet.
- **M2 — Первый запуск, pet, shell (Days 2–4).** Screens per §4.2 #1–4: FirstRun state machine (three opening cards → pet customization → name); Стартовый бюджет granted on «Дальше» with no feedback card; Finny’s one-time tour, opening by highlighting that balance; three-tab Main (Дом, Карта, Деньги) with the strip meters and the Цель card; Словарик on Карта.
  *AC:* Appendix A steps 1–4 passable end-to-end on device.
- **M3 — Economy loop UI (Days 4–6).** Screens per §4.2 #5–7, 11, 16: План (3 buckets, total ≤ available, remainder shown, editable until confirmed, plan-vs-actual); Магазин (catalog, pre-purchase sheet, confirm, insufficient-funds block with options); Копилка (one catalog Цель, deposits that fund without spending, buy from pot, withdrawal with double confirm + before/after + date shift); Журнал; FeedbackCard on every coin/meter movement.
  *AC:* steps 5–9 passable; a wrong-path purchase demonstrates the safe-error rule (no dead ends).
- **M4 — Задания + Демо-режим (Days 6–7).** Generic task runner (nodes/verdicts/explanations/retry/spawnTask); 6 tasks from §6 as JSON; unlock 1/day topic-ordered, all open in demo; demo profile + ManualClock + «Сбросить демо» + exit; day-close sequence with stage recompute and explanations (§4.2 #14).
  *AC:* step 10; **5 consecutive demo days** playable back-to-back; reset restores initial demo state; normal profile still real-day-gated.
- **M5 — Взрослый раздел + persistence (Days 7–8).** Screens per §4.2 #12–13; arithmetic gate; progress view (positive wording); demo toggle; reset/delete with confirmations; kill-and-relaunch persistence check across profile, balance, purchases, savings, goal, task progress.
  *AC:* steps 11–12; **full Appendix A pass (1–12) on a physical device**, twice in a row.
- **M6 — Hardening (Days 8–9).** Perf budget checks; accessibility pass (48 dp, 16 sp, icon+text verdicts, animations toggle, font-scaling check); destructive-action confirmations; permission audit (`adb dumpsys` shows none beyond defaults); airplane-mode full run; crash-free demo ×2.
  *AC:* the `TC`/`UX` checklist in §8 fully checked; no crashes/dead ends in the mandatory scenario.
- **M7 — Docs & release (Days 9–10).** Docs pack (§11); signed release APK (`versionName 0.1.0`, `versionCode 1`); demo rehearsal following Appendix A as a script.
  *AC:* stranger-completes-README test: fresh clone → APK on device in ≤30 min.
- **M8 — Freeze (Day 11).** Final APK + tag `v0.1.0`; hand-off list to the team (§11); buffer for regressions only.

## 8. Test plan

**Automated (jest, `src/core` + repositories):** plan validation (sum ≤ available; draft editable; confirm locks); debit (over-balance rejected, never negative, transaction+history written); savings (in/out, withdrawal gated by confirm, deposit funds without spending the pot, buy-from-Копилка, date estimate monotone under new deposits); stages (+2/+1/+1 day score, rolling-3 window, thresholds 3/9, explanation emitted on change); days (next-calendar-day unlock via fake Clock; ManualClock back-to-back); persistence (schema roundtrip; balance invariant).

**Manual scripted (documented in `docs/test-cases.md`):** Appendix A steps 1–12 as named cases (screen sequence per §4.3 flows); low-end Android 8.0 emulator + one mid-range physical device; airplane mode (offline invariant); font-size 1.3× legibility; demo reset; relaunch persistence; insufficient-funds staging (buy Игрушка at low balance → BlockedSheet shows options).

**Test report:** `docs/test-report.md` filled at M6, listing each case × device × result.

## 9. Requirements traceability

| Req | Where settled/implemented |
|---|---|
| R1 first run | §2.5 · §4.2 · M2 |
| R2 pet creation, 9+ combos | §2.2 (27) · §5.4 · M2 |
| R3 main screen contents | §2.2 · §3.1, §4 · M2 |
| R4 currency/income | §2.1 · §3.3 · M1, M2 |
| R5 budget planning | §2.1 day rules · §4.2 · M3 |
| R6 purchases (11 items) | §2.1 catalog · §4.2 · M3 |
| R7 savings & goals | §2.1 Цель · §4.2 · M3 |
| R8 6 tasks / 3 topics | §2.3 · §6 · M4 |
| R9 consequences/feedback | §2.2 meters · §5.3 safe-error · M3, M4 |
| R10 3 stages + rules | §2.2 Этапы · M1, M4 |
| R11 history + terms | §2.5 terms · §3.2 · M3, M5 |
| R12 adult section | §2.4 · M5 |
| R13 persistence + demo | §2.4 · §3.2 · M4, M5 |
| R14 Appendix A loop | §4.3 flows · §7 milestone ACs · §8 manual cases |
| TC offline/storage/perf/APK/tests | §1, §3, §7, §8 |
| UX | §1 ground rules · M6 |
| HP prohibitions | §1; re-audit at M6 |
| ND repo docs | §11 |

## 10. Risks & mitigations

- **RN cold start on Android 8 low-end** → Hermes, no startup work beyond DB open, splash → measured at M0 and M6.
- **Designer assets late** → §5.4 placeholder contract keeps every screen functional; names swap = data only.
- **Scope creep toward stretch items** → §2.6 is gated behind M6; mandatory traceability first.
- **Economy feels flat** → economics-tuning happens in `assets/content` numbers only; engine constants live in one config file.

## 11. Team hand-off (out of implementation scope)

The implementing LLM delivers to the team: final APK + version/build info, app icon 512×512 source, 3+ annotated screenshots for the RuStore card, the demo walkthrough script (Appendix A as a ≤3-min storyboard), and the docs pack (README, build/run, architecture, data structures, compliance matrix, formulas, content map, UX rationale, permissions/data, test cases + report, limitations, third-party licenses). The team owns: presentation slides, the video, RuStore card text, and any display names for `sp/c/a` keys with the final art drop.

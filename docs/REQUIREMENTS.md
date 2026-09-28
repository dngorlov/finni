# Implementation Checklist — Kids' Financial Literacy App with Virtual Pet (Android)

> Source of truth for this hackathon project, provided verbatim by the team. **Every `→ Specify:` slot has been resolved inline** (marked **Resolved:**); full rationale and screen-level detail live in [`docs/ROADMAP.md`](./ROADMAP.md), domain vocabulary in [`CONTEXT.md`](../CONTEXT.md), architectural decisions in [`docs/adr/`](./adr/).

**Convention:** each feature lists the hard requirements from the doc. Sub-items marked `→ Specify:` in the original doc are the slots the doc leaves to the team — all of them are now filled: each carries a **Resolved:** line stating the decision and where it is specified.

---

## 1. First Launch & Local Profile
- Onboarding: brief intro to the game's purpose + the three decision types (spend on required item / spend on desired item / postpone)
- Guest mode, no mandatory registration; child profile = game name + selected character
- The intro hint is returnable at any time
- **Resolved:** Первый запуск follows the Finny acquaintance script: three cards, then the pet, the pet’s name, then a one-time tour of Main and the map. The cards do not write a profile and do not grant coins. The child chooses Вид and Окрас, names the pet, and presses «Дальше», which writes the Профиль ребёнка (leftover `name` equals `petName`) and grants the Стартовый бюджет. The tour opens on «Твой первый бюджет», highlighting the live balance, and is not replayed from Словарик. Closing the app before that write restarts at the first card. Profile = the pet (name + appearance); no account; Первый запуск does not collect a name for the ребёнок. (ROADMAP §2.5, §4.2; ADR-0003)

## 2. Pet Creation
- Pet appearance customization
- Pet game name entry
- Minimum: **9 visually distinguishable appearance combinations**
- **Resolved:** appearance = Вид (3 species `sp1–sp3`, designer's Pokémon-like PNG bundle) × Окрас (3) × Аксессуар (3) = **27 combinations**; pet name entry after appearance pick. (ROADMAP §2.2, §5.4)

## 3. Main Screen
- Simultaneously visible without complex navigation: pet, available balance, current goal, key status indicators
- Reachable from the play shell: budget plan, tasks, purchases, savings, the day record, adult section
- **Resolved:** three-tab shell (ADR-0004). Bottom bar on the roots only: Дом, Карта, Деньги. Fresh launch opens Дом; Деньги opens on Копилка and remembers the last choice while the app stays open. The strip carries compact Сытость and Счастье meters, Баланс, Этап, and ⚙ Настройки. Дом, under the strip: pet, the demo line when Демо-режим, the Цель card (display only), Итоги, Магазин. Карта is Карта заданий plus Словарик and Мини-игры. Деньги dropdown: Копилка, План, Журнал, Банк (Банк after `savings_where`, always in Демо-режим). Взрослый раздел is in Настройки in every build, behind the arithmetic gate. Key status indicators = Сытость and Счастье, and they are the strip meters. (ROADMAP §4.2; ADR-0004)

## 4. Game Currency & Income
- Only in-game currency (no real money anywhere)
- Income from completing tasks and/or a clear recurring income (doc's example: daily login)
- Every accrual shows source + amount; balance never changes without an explanation to the user
- Starting budget granted at profile setup (game loop step 4)
- **Resolved:** currency = монеты. Стартовый бюджет **100** granted when the child presses «Дальше» on the pet’s name. «Твой первый бюджет» then highlights that 100 on Main; the grant itself has no feedback card. There is no daily stipend (ADR-0010). Task reward: up to the Задание's max (30 or 35 for a pinned Урок, 10 or 15 for a mini-game or correction) scaled by first-try answers; replays pay only the improvement. A matured Вклад returns its coins with interest. Every movement goes through a feedback card (source + amount). (ROADMAP §2.1, §4.2; ADR-0003)

## 5. Budget Planning
- Before each game period: distribute available amount across **≥3 areas** — mandatory expenses, optional expenses, savings
- Enforce: distributed total ≤ available budget; display remaining balance
- Plan editable until confirmation; after confirmation, show **plan vs. actual expenses** comparison
- **Resolved:** a "game period" = **Игровой день** — one economy cycle; a new one unlocks on the next local calendar day in normal play, back-to-back in Демо-режиме (ADR-0002). Area labels: **Обязательные / Желаемые / Копилка**. Draft План is a promise, not a transfer: each row is the integer plus a horizontal track (0…today's available) plus −/+ (tap ±1, hold repeats), with copy that coins stay in Баланс and that Копилка is Положить later; later days show draft-only «вчера N» from last closed actuals (including «вчера 0»). After confirm, Магазин (open tab) and Копилка home show leftover («В плане осталось N» or «сверх плана N»); buy / Положить confirm shows leftover after the tap and warns «Это сверх плана.» without blocking. Confirmed plan is locked for the day; plan-vs-actual columns stay on План during the day and in Итоги. On a waiting day, План, Копилка, and Банк show «Откроется завтра» and take no coins. (ROADMAP §2.1, §4.2; ADR-0002, ADR-0004)

## 6. Purchases & Expenses
- Catalog of priced items/actions of two types: mandatory and optional — minimum **8 items**
- Pre-purchase display: price, category, estimated impact on the pet
- Purchase requires confirmation → deducts balance → recorded in current-period history
- Block negative balance & insufficient-funds purchases; instead explain what's missing and what options exist
- **Resolved:** 11 items — mandatory: Обед 12 (Сытость +10 and Счастье +5), Школьные принадлежности 10 (Счастье +5), Проезд 8 (Счастье +5), Лекарство 15 (Счастье +20); optional (rebuyable): Конфета 5 (Счастье +5), Стикеры 7 (Счастье +6), Кино 20 (Счастье +12), Игрушка 25 (Счастье +10); optional (`once`): Скейтборд 90 (Счастье +12), Телескоп 160 (Счастье +15), Велосипед 240 (Счастье +18). Every Игровой день drops Сытость by 15 and Счастье by 15 whether or not something was bought. A purchase adds its own meter gain on top, which offsets that drop and does not cancel it, including a Цель bought from Копилка. Желаемые overspend still drops Счастье by 5, and that stacks with the daily drop. An open План left unconfirmed drops Счастье by 10 (a draft counts as unconfirmed); a closed План does not, and neither does the day «Планирование бюджета» itself ends. Mandatory items are not all due every day: each Игровой день has **Счета** — the mandatory items due that day, from the `bills` cycle in `catalog.json` (Обед + Проезд daily, Школьные every other day, Лекарство only on the «простыл» day). Blocked purchase shows a sheet: how much is missing + options (wait for Пособие / do a Задание / «Сделать целью» for a Желаемое, «Отложить» for an Обязательное). (ROADMAP §2.1, §4.2)

## 7. Savings & Goals
- Goals with a clear cost, or goal creation from preset parameters — minimum **3 goals**
- Goal view: cost, accumulated amount, remaining amount
- Regular transfers of in-game currency into savings
- If a completion date is shown: calculated transparently from the average of regular deposits
- Withdrawal from savings requires separate confirmation; beforehand show how savings will decrease and how the completion date shifts
- **Resolved:** a Цель is one Магазин Желаемое (candy-tier or a `once` dream), at most one at a time; Обязательные cannot be a Цель. First-run seeds Скейтборд. Копилка is a single pot: «Положить» deposits without spending; reaching the price opens Celebration («Купить из копилки» / «Позже») with no Счастье change; buying the Цель from the pot deducts the price and records the purchase. Completion date = remaining ÷ average deposit, shown only after ≥1 transfer, else «—». Положить and Забрать pick the amount the same way as a План row: integer, horizontal track, −/+ (tap ±1, hold repeats), capped at Баланс or the pot. Withdrawal = that amount → preview screen (pot after, date shift) → separate confirm. (ROADMAP §2.1, §4.2)

## 8. Financial Literacy Tasks
- Minimum **6 tasks** covering **3 topics:** budget planning; savings; payments & purchases
- Format: game situations with choices and consequences — **not** limited to picking an answer from options
- After every answer/action: short explanation, regardless of correctness
- Wording/calculations appropriate for ages 7–11
- Demo mode: all mandatory-scenario tasks available immediately, not tied to real time
- Content management: a new task is added **without reworking main app logic** (content decoupled from code)
- **Resolved:** 6 tasks, 2 per topic — «Первый план», «Сломался рюкзак» (budget) · «Копилка мечты», «Большая распродажа» (savings) · «Две цены», «Чек» (payments); full node scripts with correct/incorrect paths and explanations in ROADMAP §6. Unlock: topics sequential budget → savings → payments, one new task per day; all 6 open in Демо-режиме; completed tasks replayable without reward. Tasks live in `assets/content/tasks.json` (generic node-graph runner; a new task is data only). (ROADMAP §2.3, §5.3, §6)

## 9. Consequences & Feedback
- After each financial action: show change in balance, savings, and the linked pet indicator
- Feedback explains cause-and-effect in simple terms + suggests the next step
- Unsuccessful decision: explanation of consequences + a correction path (new task, adjust next plan, cancel an optional purchase)
- Safe-error rule: an unsuccessful choice creates a clear, timed game task and does **not** reset progress; no pet death/illness/injury except specially planned cases (doc's example: unforeseen medical expenses)
- **Resolved:** every action shows a feedback card: Баланс ±, Копилка ±, Сытость/Счастье ± with icons, a cause line, and a «Что дальше» next-step line (strings from content JSON). No illness/death/recovery events in v1: negative outcomes only lower meters, switch the pet pose to sad, and spawn a timed correction Задание (`spawnTask`) or a next-day plan-adjust hint. The doc's "unforeseen medical expense" exists solely as the Лекарство catalog item; an event variant is stretch. (ROADMAP §2.2, §2.6, §4.2)

## 10. Pet Progress & Development
- Minimum **3 development stages/states**
- Stage changes depend on decisions combined over several game periods: mandatory expenses covered, actual spending vs. plan, savings regularity
- Show a brief explanation for every change in the pet's emotional state
- **Resolved:** stages **Новичок → Друг → Мастер**. Day score: +2 all of today's Счета bought · +1 «по плану» (per bucket: Желаемые spend ≤ plan, Копилка deposits ≥ plan, purchases ≤ Обязательные + Желаемые) · +1 savings deposit made; stage = rolling sum over the last 3 closed days (<3 / 3–8 / ≥9), recomputed at every day close. Visuals faked programmatically (scale/glow) over the designer's poses; every change (meters or stage) shows a kid-worded explanation. (ROADMAP §2.2)

## 11. History & Learning Progress
- Visible: completed tasks, progress toward current goal, results of the last game period
- Short help section explaining key terms
- **Resolved:** no Прогресс screen (ADR-0004). Итоги on Дом is the reopenable record (last closed day + overall counts). Журнал is a Деньги section. Словарик on Карта has «Слова» and «Уроки», and both list only Уроки the child has finished: «Слова» is the theory-card titles, «Уроки» opens those cards. An open but unfinished урок is absent. (ROADMAP §2.5, §4.2; ADR-0004)

## 12. Adult Section
- Entry barrier: simple adult gate (doc's examples: hold a button, solve an arithmetic problem)
- Shows completed topics + overall progress; no negative evaluations of the child
- Optional: parent-awarded bonus points
- Profile reset/delete lives here
- **Resolved:** entry is Настройки → «Взрослый раздел» in every build (the gear is on the strip; there is no hub tile and no delete button on Настройки). Gate = random two-digit × one-digit multiplication (e.g., 14 × 7); wrong answer → new question; asked on every entry. Contents: learning progress (topics in positive wording, share of fully right first answers, Уроки by real calendar date), Демо-режим toggle, «Сбросить демо», profile reset/delete with extra confirmations. Родительский бонус (+5/+10/+20 once per day, optional reason) is a stretch item. (ROADMAP §2.4, §4.2; ADR-0004)

## 13. Persistence & Demo Mode
- Survive close/relaunch: profile, balance, purchases, savings, selected goal, learning progress
- Demo mode: test profile that plays the mandatory game-cycle stages sequentially **without waiting for calendar deadlines**, resettable to initial state
- Minimum **5 consecutive game periods** playable in demo mode without real-time waits
- **Resolved:** storage = SQLite via Drizzle ORM; schema in ROADMAP §3.2 (profiles, days, plans, transactions, purchases, savingsTransfers, goals, petState, meterEvents, dayScores, taskProgress, meta); every mutation writes through immediately. Демо-режим: toggled in Взрослый раздел; creates/switches to a dedicated demo profile driven by a manual clock (day advance anytime), pre-onboarded, all tasks open; «Сбросить демо» restores its initial state; exit returns to the normal profile untouched. Sustains ≥5 consecutive days back-to-back. (ROADMAP §2.4, §3.2; ADR-0002)

## 14. End-to-End Game Loop (acceptance flow — Appendix A)
Steps 1–10 form the loop; 11–12 verify persistence and the adult section:
1. First launch + customize pet → 2. Name the Питомец on «Имя», creating the local profile → 3. Main and the ordinary Пособие card → 4. Current goal, available tasks → 5. Distribute funds (mandatory/optional/savings) → 6. Complete a task, earn currency (with result explanation) → 7. Make ≥1 mandatory + ≥1 optional purchase (must include an attempted insufficient-funds purchase) → 8. Select a goal, replenish savings → 9. Feedback on balance, plan completion, pet status → 10. Transition to next period; progress/stage changes after a series of decisions → 11. Close & relaunch (progress confirmed saved) → 12. Enter adult section, reset/delete test profile
- **Resolved:** the concrete sequence is specified screen-by-screen in ROADMAP §4 (design flow: screen map, per-screen specs, and the key flows including the day loop, insufficient-funds staging, correction path, demo walkthrough, and relaunch persistence). Appendix A step 1 starts with the three opening cards, then pet and name. Step 2 writes the profile on «Дальше». Step 3 is Main with Finny’s tour, then the ordinary hub. There is no separate «Как играть» replay. Acceptance = milestone ACs (ROADMAP §7) + the scripted manual cases (ROADMAP §8). (ROADMAP §4, §7, §8; ADR-0003)

---

## Technical Constraints
- Android 8.0+; portrait orientation; works at ≥360 dp width (tablet/landscape optional)
- Launch to main/start screen ≤ 5 s; visual response to actions ≤ 1 s
- Main gameplay loop fully offline; any network-dependent feature must report no-connection without losing progress
- No hardware permissions (camera, mic, geolocation, contacts, Bluetooth, etc.)
- Storage: Room/SQLite/file or equivalent, local; educational content separated from interface code
- No server required (if used anyway: OpenAPI spec + single local launch procedure, preferably Docker Compose)
- Signed release APK (or AAB), unique package name, version + build number in docs
- Automated tests (or documented test cases) for budgeting, debiting, savings, and progress logic
- No crashes, blocking errors, progress loss, or dead ends during the mandatory demo scenario
- No secrets in the repo; only justified Android permissions
- Stack: Kotlin/Java native, or Flutter/React Native/cross-platform — choice is yours, evaluated on stability and reproducibility

## UX Constraints
- Short phrases, simple words; complex terms explained
- Touch targets ≥ 48×48 dp; main text ≥ 16 sp (legible under system font enlargement)
- Color is never the sole channel for error/success/category/pet status
- Sounds/animations disableable; critical info never audio-only
- Destructive actions (data deletion, etc.) require confirmation

## Hard Prohibitions (must not exist in the prototype)
- Real bank accounts/cards/payments, real-money transactions, paid subscriptions, in-game purchases, ads, rewards with real value
- Public chats, child-to-child messaging, ratings with personal data, social features
- Personal data collection / mandatory accounts in the mandatory scenario
- External links accessible to children outside the adult section
- Texts/visuals that intimidate, shame, or imply care depends on real payment
- Mandatory AI/ML/big-data/cloud use; comprehensive remote parental control or web dashboard

## Non-Code Deliverables (brief)
- Presentation (PPTX/PDF, ~8–12 slides) + live demo with a ≤3-min backup video
- Accompanying docs: README, build/run instructions, architecture, data structures, requirements-compliance matrix, economy/progress formulas, educational content map, UX rationale, permissions/data description, test cases/report, limitations, third-party license list
- RuStore card draft: name, category, descriptions, 512×512 icon, ≥3 screenshots, age-rating justification

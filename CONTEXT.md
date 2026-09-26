# finni (Финни)

A single-context project: an offline Android game that teaches kids 7–11 basic money skills by caring for a virtual pet. The UI language is Russian; canonical terms below are the Russian strings used in the app, with English glosses.

## Language

### Profiles & modes

**Первый запуск (First run)**:
The one-time journey in which a child creates a Профиль ребёнка. It opens with six static explanation cards, then the child chooses the Питомец.
_Avoid_: онбординг, туториал, обучение

**Профиль ребёнка (Child profile)**:
A local game identity: the child's Питомец (its name and appearance). No account, no personal data.
_Avoid_: аккаунт, регистрация, пользователь, имя игрока, game name

**Демо-режим (Demo mode)**:
An isolated test profile, resettable to its initial state. Its Игровые дни advance the same way as a normal profile, and its Карта follows the same chain.
_Avoid_: тестовый аккаунт, отладка

**Взрослый раздел (Adult section)**:
The area for adults, protected by an arithmetic gate: learning progress, Parent bonus, Demo mode toggle, Удалить профиль. Progress includes topics, the share of fully right first answers, and how many Уроки were first finished on each real calendar date. That date is not an Игровой день. A replay counts in the answer share and in «последний урок», and does not add another урок or move its calendar date.
_Avoid_: родительский контроль (a prohibited feature), родительские настройки

**Удалить профиль (Delete profile)**:
A Профиль ребёнка taken off the device — that pet, its Игровые дни, and its money are gone. Первый запуск starts again.
_Avoid_: clear storage, wipe, reset app, сброс приложения, сбросить демо

**Родительский бонус (Parent bonus)**:
Extra coins a parent awards at most once per Game Day from the Adult section, with an optional reason.
_Avoid_: награда, подарок

### Economy

**Игровой день (Game Day)**:
One numbered cycle of the game economy, starting at 1. A profile begins on day 1, already open. The first completion of a pinned Урок ends the open day and pays that урок's coins. The next day begins when the child leaves Итоги дня. The calendar does not start one.
_Avoid_: период, уровень, сессия, календарный день

**Ежедневный подарок (Daily gift)**:
The next coin gift on a fixed track, offered once on each real calendar day. A missed day leaves the place where it is. The short name on Дом is Подарок. It is not an Игровой день.
_Avoid_: Пособие, серия, стрик, Родительский бонус

**Баланс (Balance)**:
Coins available to spend right now.
_Avoid_: кошелёк, счёт

**Стартовый бюджет (Starting budget)**:
The coins granted once when a Child profile is created.
_Avoid_: приветственный подарок

**План (Plan)**:
The day's promised split of available coins into Обязательные, Желаемые, and Копилка — a promise, not a coin movement. It stays Закрыто until the Урок «Планирование бюджета» is completed; a closed one lets the Игровой день end with no promise, and an open one still waits for confirmation. An open one left unconfirmed drops Счастье when the day ends. When the shelf has no Желаемые, that bucket stays at 0 and is not offered.
_Avoid_: бюджет, бронь, список покупок

**Итоги дня (Day summary)**:
The screen shown when an Игровой день ends: that day's Разбор дня, plan versus actual, and meter changes with explanations — the same report Итоги shows for that day. The result of the Урок that ended the day leads here. Leaving it begins the next Игровой день, and until then this is the only screen.
_Avoid_: отчёт, дневник, прогресс, очки

**Итоги (Results)**:
The reopenable record of the last closed Игровой день — its Разбор дня, plan versus actual, and meter changes — plus the counts of days played, Задания done, and Цели bought.
_Avoid_: Прогресс, отчёт, итоги дня, очки

**Разбор дня (Day review)**:
The automatic analysis of a closed Игровой день: what the child's actions led to and what could have gone better. At most three lines, praise first, then one tip; built only from that day's План, purchases, Счета, Копилка deposits, meter drops, and finished Уроки. Kind and specific — it never scolds.
_Avoid_: оценка, ошибки, рейтинг

**Обязательные расходы (Mandatory expenses)**:
Purchases the pet needs (food, school supplies, transport, medicine). Every Игровой день takes 15 from Сытость and 15 from Счастье. A purchase adds its meter gain on top of that drop.

**Счета (Day bills)**:
The mandatory items due on a given Game Day, from a fixed content cycle. The План's Обязательные cannot be set below them, unless Магазин is Закрыто.
_Avoid_: список обязательных, долги, нужное, необходимое

**Желаемые расходы (Optional expenses)**:
Non-essential purchases that lift Счастье. The shelf is Конфета and Мороженое. Spending more than the План promised drops Счастье once. A Цель is not a Желаемое.
_Avoid_: приятное, хотелки

**Три решения (The three decision types)**:
What the game teaches to weigh before any purchase: spend on mandatory, spend on optional, or postpone.
_Avoid_: выбор ответа

**Магазин (Shop)**:
The catalog of Обязательные and Желаемые the child can buy this Игровой день.
_Avoid_: витрина, инвентарь

**Копилка (Savings)**:
The pot of coins set aside from Баланс toward the Цель. It stays Закрыто until the Урок «Что такое сбережения» is completed. Coins leave it only by confirmed withdrawal or by buying that Цель, and while it is closed a План's deposit stays at 0.
_Avoid_: накопления, депозит, вклад

**Банк (Bank)** / **Вклад (Deposit)**:
Separate from Копилка and opened after the lesson «Где живут накопления?»: a вклад takes coins out of Баланс for a fixed number of Игровые дни and returns them with interest when the term ends. No early withdrawal.
_Avoid_: депозит, счёт, копилка (for the bank)

**Цель (Goal)**:
The one thing Копилка is accumulating toward. The child picks one of the three options of the current Этап — Новичок: Конструктор, Смарт-часы, Скейтборд; Про: Набор для рисования, Самокат, Телефон; Миллионер: Гитара, Велосипед, Компьютер — or writes a Своя цель. It is not sold in Магазин; there is at most one at a time. Buying a preset Цель, or a Своя цель that is not cheaper than the Порог этапа, advances Этап.
_Avoid_: ачивка, мечта, Желаемое

**Своя цель (Custom goal)**:
A Цель the child writes on the current Этап: a name, an emoji значок, and a price. One at a time, beside the three presets, bought from Копилка the same way.
_Avoid_: произвольная цель, мечта

**Порог этапа (Stage threshold)**:
The price of the cheapest preset Цель on the current Этап. Shown only while the active Цель is a Своя цель cheaper than it. Bought cheaper Свои цели add their prices until the sum reaches it, and that crossing advances Этап.
_Avoid_: минимум, лимит, прогресс этапа

### Pet

**Дом (Home)**:
The child's home view: their Питомец, the current Игровой день number under it, their current Цель, the way into Магазин, the way into Итоги, and Подарок while an Ежедневный подарок is waiting.
_Avoid_: главная, хаб

**Питомец (Pet)**:
The virtual creature whose state reflects the child's financial decisions. It may speak fixed, scripted guidance but does not answer questions.
_Avoid_: герой, аватар

**Вид (Species)**:
One of the three pet species from the designer's art; appearance = Вид + Окрас + Аксессуар.
_Avoid_: порода, тип

**Окрас (Color)**:
The pet's color variant — one of the three designer colors.
_Avoid_: цвет, окрас кожи, skin

**Аксессуар (Accessory)**:
The extra item the pet wears — one of the three designer accessories.
_Avoid_: украшение, шапка, hat

**Сытость (Satiety)**:
The pet meter fed by buying Обед. Every Игровой день it falls by 15. Buying Обед adds its gain on top of that drop.
_Avoid_: здоровье, забота, голод

**Счастье (Mood)**:
The pet meter fed by Желаемые расходы, by Обязательные other than Обед, by Обед, and by buying the Цель. Every Игровой день it falls by 15, and a purchase adds its gain on top of that drop. Spending more than the План promised for Желаемые drops it once more. An open План left unconfirmed drops it once more; a closed План does not.
_Avoid_: настроение, радость

**Этап (Stage)**:
The pet's development level — Новичок, then Про, then Миллионер. It advances one step when the child buys a Цель that meets the Порог этапа, and in no other way.
_Avoid_: уровень, эволюция, Друг, Мастер, очки

### Learning

**Закрыто (Locked)**:
План, Магазин, Копилка, or Задания withheld on the child's profile until later play opens it. Withholding covers every entrance and creates no obligation; Демо-режим never withholds them, and opening Итоги does not open them.
_Avoid_: уровень, туториал, квест

**Помощник (Helper)**:
An optional, kid-visible chat assistant on Дом that answers money questions in kid language. Never required for the game loop.
_Avoid_: чат-бот, ИИ-друг

**Урок (Lesson)**:
A pinned Задание made of unscored theory cards followed by scored questions. Once the child has finished it, those cards can be read in Словарик. A mini-game may belong to it. The child plays that game from Мини-игры on Карта, and also from the pin, once the Урок is done.
_Avoid_: теория, лекция, тест

**Задание (Task)**:
A financial-literacy mission — an Урок, a mini-game that belongs to an Урок, or a follow-up spawned to correct a mistake — where every answer gets a short explanation. Coins scale with first-try answers; a replay pays only the improvement.
_Avoid_: квест, тест

**Текущая задача (Current task)**:
The single next action suggested under the meters. It points at a Задание, at today's Счета, at confirming the План, at choosing a Цель, or at buying the Цель once Копилка covers its price. That last one also opens a buy modal.
_Avoid_: Задание, квест, подсказка, туториал

**Карта заданий (Mission map)**:
The map of Moscow districts where each Урок is a pin. The short name is Карта. Мини-игры on Карта lists every mini-game. «Что такое бюджет?», «Что такое сбережения», and «Планирование бюджета» are open at first; finishing «Что такое бюджет?» opens the first Урок of every topic that is still closed; after that each topic goes in order. The Игровой день never locks a pin. A replay, a mini-game, or a correction does not end the day.
_Avoid_: список заданий, уровни

**Журнал (History)**:
The in-app record of income, purchases and savings transfers for the current Game Day plus results of past days.
_Avoid_: лог, отчёт

**Словарик (Glossary)**:
The handbook of the words and theory cards from Уроки the child has finished. An Урок that is only open is absent. Reading it pays nothing and does not replay Первый запуск.
_Avoid_: справка, FAQ, Как играть

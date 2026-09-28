import { loadContent } from "../content";
import { METERS } from "../../core/config";
import { itemMeterEffects } from "../../core/economy";

describe("loadContent", () => {
  const content = loadContent();

  it("accepts contentVersion 1 across every file", () => {
    expect(content.contentVersion).toBe(1);
  });

  it("ships three opening cards in Первый запуск order", () => {
    expect(content.intro.map((card) => [card.id, card.button, card.title, card.body])).toEqual([
      [
        "welcome",
        "Начать",
        "Добро пожаловать в “Финни”!",
        "Привет! Я Финни. Вместе мы будем учиться обращаться с деньгами, выполнять задания, делать покупки и копить на свои цели.",
      ],
      [
        "task",
        "Понятно",
        "Твоя задача — накопить на финансовую цель",
        "В игре у тебя будет своя финансовая цель — вещь, которую ты хочешь купить. Чтобы её получить, тебе нужно научиться планировать деньги, выполнять задания, делать покупки и откладывать монеты.",
      ],
      [
        "decisions",
        "Дальше",
        "В игре тебе часто придётся принимать решения",
        "У тебя будет три варианта:\n• потратить деньги на обязательное;\n• потратить деньги на то, что хочется;\n• отложить деньги и продолжить копить.\nОт твоих решений будет зависеть, как быстро ты сможешь прийти к своей цели.",
      ],
    ]);
  });

  it("ships the shelf and nine Цели that are not sold there", () => {
    const byId = Object.fromEntries(content.catalog.map((item) => [item.id, item]));

    expect(content.catalog.map((item) => item.id)).toEqual([
      "lunch",
      "school",
      "transport",
      "medicine",
      "candy",
      "ice-cream",
    ]);
    expect(byId.lunch).toMatchObject({
      name: "Обед",
      kind: "mandatory",
      price: 12,
      effect: { meter: "care", delta: 10 },
      also: { meter: "mood", delta: 5 },
    });
    expect(byId.candy).toMatchObject({
      kind: "optional",
      price: 5,
      effect: { meter: "mood", delta: 5 },
    });
    expect(byId["ice-cream"]).toMatchObject({
      name: "Мороженое",
      kind: "optional",
      price: 8,
      effect: { meter: "mood", delta: 6 },
    });
    expect(content.goals.map((goal) => [goal.stage, goal.name, goal.price])).toEqual([
      ["novice", "Конструктор", 60],
      ["novice", "Смарт-часы", 75],
      ["novice", "Скейтборд", 90],
      ["pro", "Набор для рисования", 120],
      ["pro", "Самокат", 160],
      ["pro", "Телефон", 200],
      ["millionaire", "Гитара", 220],
      ["millionaire", "Велосипед", 240],
      ["millionaire", "Компьютер", 360],
    ]);
    const shopIds = new Set(content.catalog.map((item) => item.id));
    for (const goal of content.goals) expect(shopIds.has(goal.id)).toBe(false);
  });

  it("makes every Цель lift Счастье more the more it costs", () => {
    const byPrice = [...content.goals].sort((a, b) => a.price - b.price);
    for (const goal of content.goals) expect(goal.effect.meter).toBe("mood");
    for (let index = 1; index < byPrice.length; index += 1) {
      expect(byPrice[index].effect.delta).toBeGreaterThan(byPrice[index - 1].effect.delta);
    }
    for (const stage of ["novice", "pro", "millionaire"] as const) {
      const deltas = content.goals.filter((goal) => goal.stage === stage).map((goal) => goal.effect.delta);
      expect(deltas).toEqual([...deltas].sort((a, b) => a - b));
      expect(new Set(deltas).size).toBe(deltas.length);
    }
    const smartwatch = content.goals.find((goal) => goal.id === "smartwatch")!;
    expect(smartwatch.effect.delta).toBeGreaterThan(content.goals.find((goal) => goal.id === "lego")!.effect.delta);
    expect(smartwatch.effect.delta).toBeLessThan(content.goals.find((goal) => goal.id === "skateboard")!.effect.delta);
  });

  it("makes a Цель worth more Счастье than the same coins spent on Желаемое", () => {
    const wants = content.catalog.filter((item) => item.kind === "optional");
    const bestPerCoin = Math.max(
      ...wants.map((item) => itemMeterEffects(item).find((effect) => effect.meter === "mood")!.delta / item.price),
    );
    for (const goal of content.goals) {
      expect(goal.effect.delta).toBeLessThanOrEqual(METERS.max);
      // Счастье stops at METERS.max, so no pile of sweets adds more than that. Where the price
      // outruns the meter, the Цель still fills at least nine tenths of it in one purchase.
      const sweets = Math.min(goal.price * bestPerCoin, METERS.max * 0.9);
      expect(goal.effect.delta).toBeGreaterThan(sweets);
    }
    for (const goal of content.goals.filter((row) => row.price * bestPerCoin < METERS.max)) {
      expect(goal.effect.delta / goal.price).toBeGreaterThan(bestPerCoin);
    }
  });

  it("ships a Счета cycle of mandatory items with a medicine day", () => {
    const mandatory = new Set(content.catalog.filter((item) => item.kind === "mandatory").map((item) => item.id));
    expect(content.bills.length).toBeGreaterThanOrEqual(5);
    for (const day of content.bills) {
      for (const id of day.items) expect(mandatory.has(id)).toBe(true);
    }
    expect(content.bills[0].items).toEqual(["lunch", "transport"]);
    expect(content.bills.some((day) => day.items.includes("medicine") && day.note)).toBe(true);
  });

  it("ships the Словарик terms including План", () => {
    expect(content.terms.map((t) => t.term)).toEqual([
      "Баланс",
      "Копилка",
      "Цель",
      "План",
      "Обязательные расходы",
      "Желаемые расходы",
      "Сытость",
      "Счастье",
      "Этап",
      "Игровой день",
    ]);
    expect(content.terms).toHaveLength(10);
    expect(content.terms.find((t) => t.id === "plan")).toEqual({
      id: "plan",
      term: "План",
      definition:
        "Обещание, как разделить сегодняшние монеты: необходимое, желаемое и копилка. Подтвердить план монеты не тратит.",
    });
    expect(content.terms.find((t) => t.id === "savings")).toEqual({
      id: "savings",
      term: "Копилка",
      definition:
        "Горшочек монет на Цель. Они уходят оттуда «Забрать» или когда покупаешь эту Цель.",
    });
    expect(content.terms.find((t) => t.id === "goal")).toEqual({
      id: "goal",
      term: "Цель",
      definition:
        "Одна вещь, на которую копилка копит. Можно выбрать из трёх или придумать свою. В магазине её нет.",
    });
    expect(content.terms.find((t) => t.id === "optional")).toEqual({
      id: "optional",
      term: "Желаемые расходы",
      definition:
        "Покупки не из обязательных: они поднимают счастье. Сейчас это конфета и мороженое.",
    });
    expect(content.terms.find((t) => t.id === "mood")).toEqual({
      id: "mood",
      term: "Счастье",
      definition:
        "Как радуется питомец. Растёт от покупок в магазине и когда покупаешь цель. Каждый день падает на 15. Покупка это компенсирует.",
    });
  });

  it("ships Савва's nine lessons as pins and three mini-games inside «Покупки», every answer explained", () => {
    const pins = content.tasks.filter((t) => !t.correction && !t.parent);
    expect(pins.map((t) => t.id)).toEqual([
      "budget_what",
      "budget_plan",
      "budget_change",
      "savings_what",
      "savings_steps",
      "savings_where",
      "payments_pay",
      "payments_shop",
      "payments_later",
    ]);
    for (const task of pins) {
      expect(task.pin).toBeDefined();
      expect(task.order).toBeGreaterThan(0);
      expect(task.words?.length).toBeGreaterThan(0);
      for (const word of task.words ?? []) {
        expect(word.term).not.toMatch(/[?!]/);
      }
    }
    expect(content.tasks.filter((t) => t.parent || t.correction).every((t) => t.words == null)).toBe(true);
    // Все девять уроков написаны: «скоро» не осталось.
    expect(pins.filter((t) => t.comingSoon)).toEqual([]);
    for (const topic of ["budget", "savings", "payments"] as const) {
      expect(pins.filter((t) => t.topic === topic).map((t) => t.order)).toEqual([1, 2, 3]);
    }
    const playable = content.tasks.filter((t) => !t.correction && !t.comingSoon);
    expect(content.tasks.filter((t) => t.parent === "payments_shop").map((t) => t.title)).toEqual([
      "Скидка или ловушка",
      "Что дешевле?",
      "Охота за ценником",
    ]);
    for (const id of ["payments_sale_trap", "payments_cheaper", "payments_price_hunt"]) {
      const game = content.tasks.find((task) => task.id === id);
      const choices = game?.nodes.filter((node) => (node.kind ?? "choice") === "choice") ?? [];
      expect(game?.deal).toBe(3);
      expect(choices.length).toBeGreaterThan(3);
      expect(choices.every((node) => node.text.includes("{pet}"))).toBe(true);
    }
    const trap = content.tasks.find((task) => task.id === "payments_sale_trap");
    for (const node of trap?.nodes.filter((item) => (item.kind ?? "choice") === "choice") ?? []) {
      expect(node.options?.map((option) => option.label)).toEqual(["Купить", "Пройти мимо"]);
      expect(node.options?.some((option) => (option.kept ?? 0) > 0)).toBe(true);
    }
    expect(content.tasks.some((t) => t.id === "budget_fix_backpack" && t.correction)).toBe(true);
    const spawn = content.tasks
      .find((t) => t.id === "budget_plan")
      ?.nodes.flatMap((n) => n.options ?? [])
      .find((o) => o.spawnTask === "budget_fix_backpack");
    expect(spawn?.effects).toBeUndefined();
    expect(spawn?.effect).toBeUndefined();

    // Т/З: ≥6 Заданий over 3 topics, each with a right and a wrong answer.
    for (const topic of ["budget", "savings", "payments"] as const) {
      expect(playable.filter((t) => t.topic === topic).length).toBeGreaterThanOrEqual(2);
    }
    for (const task of content.tasks) {
      const verdicts = new Set<string>();
      for (const node of task.nodes) {
        for (const option of node.options ?? []) {
          expect(option.explanation.length).toBeGreaterThan(0);
          verdicts.add(option.verdict);
        }
        for (const item of node.items ?? []) {
          expect(item.explanation.length).toBeGreaterThan(0);
          expect(item.bin).toBeLessThan(node.bins?.length ?? 0);
        }
        // Every sort item has a right basket and at least one wrong one.
        if (node.kind === "sort") ["good", "bad"].forEach((v) => verdicts.add(v));
        // Planning and saving games show consequences instead of right/wrong.
        if (["allocate", "replan", "steps", "dream"].includes(node.kind ?? "")) ["good", "warn"].forEach((v) => verdicts.add(v));
      }
      if (!task.correction && !task.comingSoon) expect(verdicts.size).toBeGreaterThan(1);
    }
  });

  it("reaches every node of every Задание from its start, and every Задание can end", () => {
    for (const task of content.tasks) {
      const byId = new Map(task.nodes.map((node) => [node.id, node]));
      const seen = new Set<string>();
      const stack = [task.nodes[0]!.id];
      let canExit = false;
      while (stack.length > 0) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const node = byId.get(id)!;
        const targets = (node.kind ?? "choice") !== "choice" ? [node.next!] : (node.options ?? []).map((o) => o.next);
        for (const next of targets) {
          if (next === "exit") canExit = true;
          else if (next !== "retry") stack.push(next);
        }
      }
      expect({ task: task.id, reached: seen.size }).toEqual({ task: task.id, reached: task.nodes.length });
      expect({ task: task.id, canExit }).toEqual({ task: task.id, canExit: true });
    }
  });

  it("keeps the savings test and the Нужно или хочется? game from the scenario", () => {
    const savings = content.tasks.find((t) => t.id === "savings_what");
    expect(savings?.nodes.filter((n) => (n.kind ?? "choice") === "choice")).toHaveLength(4);
    const sort = content.tasks.find((t) => t.id === "budget_what")?.nodes.find((n) => n.kind === "sort");
    expect(sort?.bins).toEqual(["Нужно", "Хочется"]);
    expect(sort?.items?.length).toBeGreaterThanOrEqual(6);
  });

  it("gives each new lesson its interactive game from the updated scenario", () => {
    const kinds = (id: string) => content.tasks.find((t) => t.id === id)?.nodes.map((n) => n.kind ?? "choice") ?? [];
    expect(kinds("budget_plan")).toEqual(expect.arrayContaining(["allocate", "compare"]));
    expect(kinds("budget_change").filter((k) => k === "replan")).toHaveLength(3);
    expect(kinds("savings_steps")).toContain("steps");
    expect(kinds("savings_where")).toContain("dream");
    // Every lesson opens with Савва's three cards.
    for (const task of content.tasks.filter((t) => t.pin)) {
      expect(task.nodes.slice(0, 3).map((n) => n.kind)).toEqual(["card", "card", "card"]);
    }
  });

});

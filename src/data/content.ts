import { z } from "zod";
import type { Stage } from "../core/stages";
import catalogJson from "../../assets/content/catalog.json";
import introJson from "../../assets/content/intro.json";
import tasksJson from "../../assets/content/tasks.json";
import termsJson from "../../assets/content/terms.json";

const CONTENT_VERSION = 1;

const meterEffectSchema = z.object({
  meter: z.enum(["care", "mood"]),
  delta: z.number().int(),
});

const catalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Emoji shown beside the name in Магазин. Hidden from TalkBack. */
  icon: z.string().min(1),
  kind: z.enum(["mandatory", "optional"]),
  price: z.number().int().nonnegative(),
  effect: meterEffectSchema,
  /** Обед also raises Счастье. */
  also: meterEffectSchema.optional(),
  description: z.string().min(1),
  once: z.boolean().optional().default(false),
});

const goalItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  stage: z.enum(["novice", "pro", "millionaire"]),
  price: z.number().int().positive(),
  effect: meterEffectSchema,
  description: z.string().min(1),
});

const dayBillsSchema = z.object({
  items: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).optional(),
});

const catalogFileSchema = z
  .object({
    contentVersion: z.literal(CONTENT_VERSION),
    items: z.array(catalogItemSchema).min(1),
    goals: z.array(goalItemSchema).length(9),
    /** Счета cycle: day n uses bills[(n - 1) % length]. */
    bills: z.array(dayBillsSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const mandatory = new Set(file.items.filter((item) => item.kind === "mandatory").map((item) => item.id));
    const shopIds = new Set(file.items.map((item) => item.id));
    file.bills.forEach((day, dayIndex) => {
      day.items.forEach((id, itemIndex) => {
        if (!mandatory.has(id)) {
          ctx.addIssue({
            code: "custom",
            path: ["bills", dayIndex, "items", itemIndex],
            message: `Счёт «${id}» должен быть обязательным товаром каталога`,
          });
        }
      });
    });
    for (const stage of ["novice", "pro", "millionaire"] as const) {
      const count = file.goals.filter((goal) => goal.stage === stage).length;
      if (count !== 3) {
        ctx.addIssue({
          code: "custom",
          message: `У Этапа ${stage} должно быть 3 Цели, сейчас ${count}`,
        });
      }
    }
    for (const goal of file.goals) {
      if (shopIds.has(goal.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Цель «${goal.id}» не продаётся в Магазине`,
        });
      }
    }
  });

const termSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  definition: z.string().min(1),
});

const termsFileSchema = z.object({
  contentVersion: z.literal(CONTENT_VERSION),
  terms: z.array(termSchema).length(10),
});

const INTRO_IDS = ["welcome", "task", "decisions"] as const;

const introCardSchema = z.object({
  id: z.enum(INTRO_IDS),
  title: z.string().min(1),
  body: z.string().min(1),
  button: z.string().min(1),
});

/** Three static cards that open Первый запуск, before the pet is created. Order is fixed. */
const introFileSchema = z
  .object({
    contentVersion: z.literal(CONTENT_VERSION),
    cards: z.array(introCardSchema).length(INTRO_IDS.length),
  })
  .superRefine((file, ctx) => {
    INTRO_IDS.forEach((id, index) => {
      if (file.cards[index]?.id !== id) {
        ctx.addIssue({
          code: "custom",
          path: ["cards", index, "id"],
          message: `Карточка ${index + 1} должна быть «${id}»`,
        });
      }
    });
  });

const taskEffectObjectSchema = z.object({
  meter: z.enum(["care", "mood"]).optional(),
  delta: z.number().int().optional(),
  coins: z.number().int().optional(),
});

const bucketSchema = z.enum(["mandatory", "wants", "savings"]);
const splitSchema = z.object({
  mandatory: z.number().int().nonnegative(),
  wants: z.number().int().nonnegative(),
  savings: z.number().int().nonnegative(),
});

const sceneTileSchema = z.object({
  icon: z.string().min(1).optional(),
  label: z.string().min(1),
  value: z.string().min(1).optional(),
  was: z.string().min(1).optional(),
  sticker: z.string().min(1).optional(),
  tone: z.enum(["plain", "warn", "good"]).optional(),
  pick: z.boolean().optional(),
});

const savingGoalSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  price: z.number().int().positive(),
});

const taskOptionSchema = z.object({
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  hint: z.string().min(1).optional(),
  spend: z.object({ bucket: bucketSchema, amount: z.number().int().nonnegative() }).optional(),
  /** Scene labels the child taps for this answer («Что купить в первую очередь»). */
  picks: z.array(z.string().min(1)).min(1).optional(),
  /** Any other combination of those cards. */
  fallback: z.boolean().optional(),
  next: z.string().min(1),
  verdict: z.enum(["good", "warn", "bad"]),
  explanation: z.string().min(1),
  /** In-game purse only («Сэкономлено»), never Баланс. */
  kept: z.number().int().nonnegative().optional(),
  effect: taskEffectObjectSchema.optional(),
  effects: z.array(taskEffectObjectSchema).optional(),
  spawnTask: z.string().nullable().optional(),
});

const sortItemSchema = z.object({
  label: z.string().min(1),
  icon: z.string().min(1).optional(),
  bin: z.number().int().nonnegative(),
  explanation: z.string().min(1),
  hint: z.string().min(1).optional(),
});

/** choice (default) asks; card teaches; sort is the «Нужно или хочется?» style mini-game. */
const taskNodeSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["choice", "card", "sort", "allocate", "compare", "replan", "steps", "dream"]).optional(),
    title: z.string().min(1).optional(),
    text: z.string().min(1),
    options: z.array(taskOptionSchema).min(1).optional(),
    next: z.string().min(1).optional(),
    button: z.string().min(1).optional(),
    bins: z.array(z.string().min(1)).min(2).optional(),
    items: z.array(sortItemSchema).min(1).optional(),
    scene: z.array(sceneTileSchema).min(1).optional(),
    total: z.number().int().positive().optional(),
    plan: splitSchema.optional(),
    event: z.object({ bucket: bucketSchema, delta: z.number().int().positive() }).optional(),
    outcomes: z.partialRecord(bucketSchema, z.string().min(1)).optional(),
    goal: savingGoalSchema.optional(),
    goals: z.array(savingGoalSchema).min(2).optional(),
    saved: z.number().int().nonnegative().optional(),
    amounts: z.array(z.number().int().positive()).min(1).optional(),
    income: z.number().int().positive().optional(),
    temptations: z
      .array(
        z.object({
          round: z.number().int().positive(),
          name: z.string().min(1),
          icon: z.string().min(1),
          price: z.number().int().positive(),
        }),
      )
      .optional(),
    days: z.number().int().positive().optional(),
  })
  .superRefine((node, ctx) => {
    const kind = node.kind ?? "choice";
    if (kind === "choice" && !node.options) {
      ctx.addIssue({ code: "custom", message: `Узел ${node.id}: у вопроса нет вариантов` });
    }
    const picking = node.options?.some((option) => option.fallback || option.picks) ?? false;
    if (picking) {
      const cards = new Set(node.scene?.filter((tile) => tile.pick).map((tile) => tile.label) ?? []);
      if (cards.size === 0) {
        ctx.addIssue({ code: "custom", message: `Узел ${node.id}: выбор карточками требует scene с pick` });
      }
      const fallbacks = node.options?.filter((option) => option.fallback) ?? [];
      if (fallbacks.length !== 1) {
        ctx.addIssue({ code: "custom", message: `Узел ${node.id}: нужен один вариант fallback` });
      }
      const seen = new Set<string>();
      for (const option of node.options ?? []) {
        if (option.fallback && option.picks) {
          ctx.addIssue({ code: "custom", message: `Узел ${node.id}: у fallback не бывает picks` });
        }
        if (!option.fallback && !option.picks) {
          ctx.addIssue({ code: "custom", message: `Узел ${node.id}: у «${option.label}» нет карточек` });
        }
        const key = [...(option.picks ?? [])].sort().join("\0");
        if (option.picks && seen.has(key)) {
          ctx.addIssue({ code: "custom", message: `Узел ${node.id}: набор «${option.label}» повторяется` });
        }
        if (option.picks) seen.add(key);
        for (const label of option.picks ?? []) {
          if (!cards.has(label)) {
            ctx.addIssue({ code: "custom", message: `Узел ${node.id}: «${label}» не карточка для выбора` });
          }
        }
      }
    }
    if (kind !== "choice" && !node.next) {
      ctx.addIssue({ code: "custom", message: `Узел ${node.id}: нет next` });
    }
    if (kind === "sort") {
      const bins = node.bins?.length ?? 0;
      if (bins < 2 || !node.items) {
        ctx.addIssue({ code: "custom", message: `Узел ${node.id}: игре-сортировке нужны корзины и предметы` });
      }
      node.items?.forEach((item) => {
        if (item.bin >= bins) ctx.addIssue({ code: "custom", message: `Узел ${node.id}: «${item.label}» в несуществующей корзине` });
      });
    }
    const need = (ok: boolean, what: string) => {
      if (!ok) ctx.addIssue({ code: "custom", message: `Узел ${node.id} (${kind}): ${what}` });
    };
    if (kind === "allocate") need(node.total != null, "нужна сумма total");
    if (kind === "replan") {
      need(node.total != null && node.plan != null && node.event != null, "нужны total, plan и event");
      if (node.total != null && node.plan) {
        const sum = node.plan.mandatory + node.plan.wants + node.plan.savings;
        need(sum === node.total, `план ${sum} не равен total ${node.total}`);
      }
    }
    if (kind === "steps") need(node.goal != null && node.amounts != null && node.income != null, "нужны goal, amounts и income");
    if (kind === "dream") need((node.goals?.length ?? 0) >= 2 && node.amounts != null, "нужны goals и amounts");
  });

const pinSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  district: z.string().min(1),
});

const taskSchema = z.object({
  id: z.string().min(1),
  topic: z.enum(["budget", "savings", "payments"]),
  title: z.string().min(1),
  reward: z.number().int().nonnegative(),
  intro: z.string().min(1),
  correction: z.boolean().optional(),
  order: z.number().int().positive().optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
  description: z.string().min(1).optional(),
  pin: pinSchema.optional(),
  requires: z.string().min(1).optional(),
  parent: z.string().min(1).optional(),
  comingSoon: z.boolean().optional(),
  /** Each visit deals this many choice rounds from the pool. */
  deal: z.number().int().positive().optional(),
  nodes: z.array(taskNodeSchema).min(1),
});

/**
 * Map missions need order + pin + description; correction tasks need none.
 * Every `next`, `spawnTask` and `requires` must point at something real.
 */
const tasksFileSchema = z
  .object({
    contentVersion: z.literal(CONTENT_VERSION),
    tasks: z.array(taskSchema).min(6),
  })
  .superRefine((file, ctx) => {
    const ids = new Set(file.tasks.map((task) => task.id));
    for (const task of file.tasks) {
      const onMap = !task.correction && !task.parent;
      if (onMap && (!task.order || !task.pin || !task.description || !task.difficulty)) {
        ctx.addIssue({ code: "custom", message: `Задание ${task.id}: на карте нужны order, pin, description, difficulty` });
      }
      if (task.parent && !ids.has(task.parent)) {
        ctx.addIssue({ code: "custom", message: `Задание ${task.id}: parent «${task.parent}» не найдено` });
      }
      if (task.requires && !ids.has(task.requires)) {
        ctx.addIssue({ code: "custom", message: `Задание ${task.id}: requires «${task.requires}» не найдено` });
      }
      const nodeIds = new Set(task.nodes.map((node) => node.id));
      const targetOk = (next: string) => next === "exit" || next === "retry" || nodeIds.has(next);
      for (const node of task.nodes) {
        if (node.next && !targetOk(node.next)) {
          ctx.addIssue({ code: "custom", message: `Задание ${task.id}: узел ${node.id} ведёт в «${node.next}»` });
        }
        for (const option of node.options ?? []) {
          if (!targetOk(option.next)) {
            ctx.addIssue({ code: "custom", message: `Задание ${task.id}: вариант «${option.label}» ведёт в «${option.next}»` });
          }
          if (option.spawnTask && !ids.has(option.spawnTask)) {
            ctx.addIssue({ code: "custom", message: `Задание ${task.id}: spawnTask «${option.spawnTask}» не найдено` });
          }
        }
      }
    }
  });

export type CatalogItemContent = z.infer<typeof catalogItemSchema>;
export type DayBillsContent = z.infer<typeof dayBillsSchema>;
export type GoalContent = z.infer<typeof goalItemSchema> & { stage: Stage };
export type TermContent = z.infer<typeof termSchema>;
export type IntroCardContent = z.infer<typeof introCardSchema>;
export type TaskFileContent = z.infer<typeof taskSchema>;

export interface GameContent {
  contentVersion: typeof CONTENT_VERSION;
  catalog: CatalogItemContent[];
  /** Счета cycle — which mandatory items are due on each Игровой день. */
  bills: DayBillsContent[];
  goals: GoalContent[];
  terms: TermContent[];
  /** Opening cards of Первый запуск, before the pet is created. */
  intro: IntroCardContent[];
  tasks: TaskFileContent[];
}

/** Loads and validates catalog, terms, opening cards, and tasks. Цели are not Магазин rows. */
export function loadContent(): GameContent {
  const catalog = catalogFileSchema.parse(catalogJson);
  const terms = termsFileSchema.parse(termsJson);
  const intro = introFileSchema.parse(introJson);
  const tasks = tasksFileSchema.parse(tasksJson);

  return {
    contentVersion: CONTENT_VERSION,
    catalog: catalog.items,
    bills: catalog.bills,
    goals: catalog.goals,
    terms: terms.terms,
    intro: intro.cards,
    tasks: tasks.tasks,
  };
}

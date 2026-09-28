import { ECONOMY, FEATURES } from "./config";
import type { MeterKind } from "./economy";

/** Задание node graph as shipped in assets/content/tasks.json (§5.3). */
export type Verdict = "good" | "warn" | "bad";
export type NextRef = string | "retry" | "exit";

export interface TaskEffect {
  meter?: MeterKind;
  delta?: number;
  /** Coin delta from the scene itself (e.g. a refund); distinct from the +10 first-completion reward. */
  coins?: number;
}

/** A money bucket in the planning games (План и факт, Пересобери план). */
export type BudgetBucket = "mandatory" | "wants" | "savings";

/** Coins in each bucket. */
export type BudgetSplit = Record<BudgetBucket, number>;

/**
 * A picture tile above a question: a product with its price tag, a cash-desk
 * screen, a balance. `was` is a crossed-out old price; `sticker` a bright
 * shop label like «СКИДКА!».
 */
export interface SceneTile {
  icon?: string;
  label: string;
  value?: string;
  was?: string;
  sticker?: string;
  tone?: "plain" | "warn" | "good";
  /** The child can tap this tile to include it in the answer («Что купить в первую очередь?»). */
  pick?: boolean;
}

export interface TaskOption {
  label: string;
  /** Option shown as a big tile (Что дешевле?, Охота за ценником) instead of a text button. */
  icon?: string;
  /** Second line on a tile option, e.g. «5 штук». */
  hint?: string;
  /**
   * Pick-from-cards: scene labels this answer stands for. The child taps those
   * cards instead of a written option. Order does not matter.
   */
  picks?: string[];
  /** Pick-from-cards: any other combination. At most one per question. */
  fallback?: boolean;
  /** План и факт: choosing this spends coins from a bucket. */
  spend?: { bucket: BudgetBucket; amount: number };
  next: NextRef;
  verdict: Verdict;
  explanation: string;
  /**
   * Coins this answer keeps inside the mini-game purse («Сэкономлено»).
   * Not Баланс — the purse is only for this run.
   */
  kept?: number;
  effect?: TaskEffect;
  effects?: TaskEffect[];
  spawnTask?: string | null;
}

/**
 * A choice node asks a question (scored on the first answer); a card node
 * teaches — text plus «Дальше», never scored (Савва's обучающие карточки).
 */
/** One thing to sort in a «sort» mini-game (e.g. Нужно или хочется?). */
export interface SortItem {
  label: string;
  /** Emoji on the chip. */
  icon?: string;
  /** Index into the node's `bins`. */
  bin: number;
  explanation: string;
  /** Nudge after a wrong basket (default: «Подумай ещё раз…»). */
  hint?: string;
}

/** A thing to save for in «Шаг за шагом» / «Финансовая мечта». */
export interface SavingGoal {
  name: string;
  icon: string;
  price: number;
}

/** «Шаг за шагом»: before round `round` (1-based) a want tempts the pet. */
export interface Temptation {
  round: number;
  name: string;
  icon: string;
  price: number;
}

export interface TaskNode {
  id: string;
  kind?: "choice" | "card" | "sort" | "allocate" | "compare" | "replan" | "steps" | "dream";
  /** Card heading; choice nodes put the question in `text`. */
  title?: string;
  text: string;
  /** Choice nodes only. */
  options?: TaskOption[];
  /** Card and sort nodes: where to go after (a node id or "exit"). */
  next?: NextRef;
  /** Card nodes: label of the «Дальше» button (e.g. «Начать игру»). */
  button?: string;
  /** Sort nodes: the two (or more) baskets, e.g. ["Нужно", "Хочется"]. */
  bins?: string[];
  /** Sort nodes: chips to put into baskets; each first answer is scored. */
  items?: SortItem[];
  /** Choice nodes: picture tiles above the question. */
  scene?: SceneTile[];
  /** allocate / replan: coins to split. */
  total?: number;
  /** replan: the plan before the surprise. */
  plan?: BudgetSplit;
  /** replan: the surprise — one bucket grows by `delta` and is locked. */
  event?: { bucket: BudgetBucket; delta: number };
  /** replan: what it means when this bucket paid for the surprise. */
  outcomes?: Partial<Record<BudgetBucket, string>>;
  /** steps / dream: the goal, or goals to pick from (dream). */
  goal?: SavingGoal;
  goals?: SavingGoal[];
  /** steps / dream: coins already saved at the start. */
  saved?: number;
  /** steps / dream: contribution choices, e.g. [2, 5, 10]. */
  amounts?: number[];
  /** steps: coins the pet gets each round (a contribution cannot exceed it). */
  income?: number;
  temptations?: Temptation[];
  /** dream: days the child wants to reach the goal in. */
  days?: number;
}

/** Where a Задание sits on the map (fractions of the map image, 0–1). */
export interface MissionPin {
  x: number;
  y: number;
  district: string;
}

/** A Словарик entry: the word itself, then its definition from the Урок. */
export interface LessonWord {
  term: string;
  text: string;
}

export interface TaskContent {
  id: string;
  topic: "budget" | "savings" | "payments";
  title: string;
  reward: number;
  intro: string;
  /** Correction tasks are spawned by safe errors (R9); hidden from the map. */
  correction?: boolean;
  /** 1-based position inside its topic — drives the unlock chain. */
  order?: number;
  /** 1 easy · 2 medium · 3 hard, shown as stars on the mission sheet. */
  difficulty?: number;
  /** One-line mission description for the map sheet. */
  description?: string;
  pin?: MissionPin;
  /** Explicit prerequisite id — overrides the topic chain. */
  requires?: string;
  /**
   * Mini-game that lives inside another Задание's map sheet instead of its own
   * pin; opens when that parent is completed.
   */
  parent?: string;
  /** Pin placeholder for a lesson still being written: visible, never playable. */
  comingSoon?: boolean;
  /**
   * Mini-game: each visit plays this many choice rounds, drawn from the pool
   * between the opening card and the closing card. A lesson omits it.
   */
  deal?: number;
  /** Words this Урок adds to Словарик. The term is the word, not a card title. */
  words?: LessonWord[];
  nodes: TaskNode[];
}

export const VERDICT_ICONS: Record<Verdict, string> = {
  good: "✅",
  warn: "🤔",
  bad: "⚠️",
};

export interface TaskStepResult {
  /** Node to show next: a node id, "retry" (same node), or "exit" (task over). */
  next: NextRef;
  verdict: Verdict;
  explanation: string;
  effects: TaskEffect[];
  spawnTask?: string | null;
}

/**
 * Generic task runner: a new task is data only (§5.3). Pure — the caller
 * applies effects/spawn/reward policy.
 */
function shuffled(size: number, count: number): number[] {
  const indexes = Array.from({ length: size }, (_, index) => index);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = indexes[i]!;
    indexes[i] = indexes[j]!;
    indexes[j] = swap;
  }
  return indexes.slice(0, count);
}

/**
 * A mini-game with `deal` plays that many rounds, in an order chosen for this
 * visit, then the closing card. Success links are rewired along the deal;
 * «retry» stays. The coin score uses only the dealt rounds, so 3 of 3 is a
 * full reward. `order` pins the draw (tests); otherwise the pool is shuffled.
 * A lesson, or a pool no bigger than `deal`, is returned as-is.
 */
export function dealTask(task: TaskContent, order?: readonly number[]): TaskContent {
  const count = task.deal;
  if (count == null || count < 1) return task;
  const choices = task.nodes.filter((node) => (node.kind ?? "choice") === "choice");
  const opener = task.nodes[0];
  const closer = [...task.nodes].reverse().find((node) => node.kind === "card");
  if (!opener || opener.kind !== "card" || !closer || closer.id === opener.id || choices.length <= count) {
    return task;
  }
  const picked =
    order &&
    order.length >= count &&
    new Set(order.slice(0, count)).size === count &&
    order.slice(0, count).every((index) => index >= 0 && index < choices.length)
      ? order.slice(0, count)
      : shuffled(choices.length, count);
  const dealt = picked.map((index) => choices[index]!);
  const rewired = dealt.map((node, index) => {
    const nextId = index + 1 < dealt.length ? dealt[index + 1]!.id : closer.id;
    return {
      ...node,
      options: node.options?.map((option) => ({
        ...option,
        next: option.next === "retry" || option.next === "exit" ? option.next : nextId,
      })),
    };
  });
  return {
    ...task,
    nodes: [{ ...opener, next: rewired[0]!.id }, ...rewired, closer],
  };
}

export function startTask(task: TaskContent): { nodeId: string; text: string; options: TaskOption[] } {
  const first = task.nodes[0];
  if (!first) throw new Error(`Задание ${task.id} без узлов`);
  return { nodeId: first.id, text: first.text, options: first.options ?? [] };
}

export function chooseOption(
  task: TaskContent,
  nodeId: string,
  optionIndex: number,
): TaskStepResult {
  const node = task.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Узел ${nodeId} не найден в задании ${task.id}`);
  const option = node.options?.[optionIndex];
  if (!option) throw new Error(`Вариант ${optionIndex} не найден в узле ${nodeId}`);
  const effects = [...(option.effect ? [option.effect] : []), ...(option.effects ?? [])];
  return {
    next: option.next,
    verdict: option.verdict,
    explanation: option.explanation,
    effects,
    spawnTask: option.spawnTask ?? null,
  };
}

const TOPIC_ORDER = { budget: 0, savings: 1, payments: 2 } as const;

/** Map pins: non-correction Задания without a parent, topic order then `order`. */
export function taskUnlockOrder(tasks: readonly TaskContent[]): TaskContent[] {
  return tasks
    .filter((t) => !t.correction && !t.parent)
    .slice()
    .sort((a, b) => TOPIC_ORDER[a.topic] - TOPIC_ORDER[b.topic] || (a.order ?? 0) - (b.order ?? 0));
}

/** Mini-games shown inside `parent`'s sheet, in file order. */
export function childGames(parent: TaskContent, tasks: readonly TaskContent[]): TaskContent[] {
  return tasks.filter((t) => t.parent === parent.id && !t.correction);
}

/** Every mini-game, in file order. Each belongs to one Урок and stays off the map. */
export function miniGames(tasks: readonly TaskContent[]): TaskContent[] {
  return tasks.filter((t) => t.parent != null && !t.correction);
}

/** Everything a child can finish: pins that are ready plus their mini-games. */
export function playableTasks(tasks: readonly TaskContent[]): TaskContent[] {
  const pins = taskUnlockOrder(tasks).filter((t) => !t.comingSoon);
  return [...pins, ...pins.flatMap((pin) => childGames(pin, tasks))];
}

/**
 * The Задание that must be completed before `task` opens, or null if it is
 * open from the start. «Что такое бюджет?», «Что такое сбережения», and
 * «Планирование бюджета» are open at first. Finishing «Что такое бюджет?»
 * opens the first Урок of every topic that is still closed; after that each
 * topic goes in order.
 */
export function missionPrerequisite(task: TaskContent, tasks: readonly TaskContent[]): TaskContent | null {
  if (task.correction) return null;
  if (task.parent) return tasks.find((t) => t.id === task.parent) ?? null;
  if (task.id === FEATURES.savingsTaskId || task.id === FEATURES.planTaskId) return null;
  const ordered = taskUnlockOrder(tasks);
  if (task.requires) return ordered.find((t) => t.id === task.requires) ?? null;
  const order = task.order ?? 1;
  if (order > 1) {
    return ordered.find((t) => t.topic === task.topic && (t.order ?? 1) === order - 1) ?? null;
  }
  if (task.topic === "budget") return null;
  return ordered.find((t) => t.topic === "budget" && (t.order ?? 1) === 1) ?? null;
}

/** A pinned Урок (not a mini-game, correction, or «скоро» pin) ends the Игровой день on its first completion. */
export function endsGameDay(
  task: Pick<TaskContent, "pin" | "correction" | "parent" | "comingSoon">,
): boolean {
  return task.pin != null && !task.correction && !task.parent && !task.comingSoon;
}

/**
 * Open missions: those whose prerequisite is completed. Демо-режим opens
 * every map pin and every mini-game from the start.
 * The Игровой день never locks a pin.
 */
export function unlockedTasks(
  tasks: readonly TaskContent[],
  completedIds: ReadonlySet<string>,
  isDemo = false,
): TaskContent[] {
  return playableTasks(tasks).filter((task) => {
    if (isDemo) return true;
    const before = missionPrerequisite(task, tasks);
    return before === null || completedIds.has(before.id);
  });
}

/** First answers on one run: fully right, and how many were scored at all. */
export interface AnswerTally {
  /** Verdict `good` only. «С ценой» is scored, but not fully right. */
  correct: number;
  scored: number;
}

/** Count first answers. A retry of the same question is not included. */
export function tallyVerdicts(verdicts: readonly Verdict[]): AnswerTally {
  return {
    correct: verdicts.filter((verdict) => verdict === "good").length,
    scored: verdicts.length,
  };
}

/** Accept a run's tally, or zeros when the caller did not record one. */
export function checkedTally(tally: AnswerTally | undefined): AnswerTally {
  const correct = tally?.correct ?? 0;
  const scored = tally?.scored ?? 0;
  if (!Number.isInteger(correct) || !Number.isInteger(scored) || correct < 0 || scored < 0 || correct > scored) {
    throw new Error("Неверная статистика ответов");
  }
  return { correct, scored };
}

/** Points for the first answer to a question: right 1, «с ценой» ½, wrong 0. */
export function verdictPoints(verdict: Verdict): number {
  if (verdict === "good") return 1;
  if (verdict === "warn") return 0.5;
  return 0;
}

/**
 * Scored answers in a Задание: one per choice node, one per sort item. Card
 * nodes teach and the planning/saving games (allocate, compare, replan,
 * steps, dream) show consequences instead of right/wrong — not counted.
 */
export function scoredUnits(task: TaskContent): number {
  return task.nodes.reduce((sum, node) => {
    const kind = node.kind ?? "choice";
    if (kind === "choice") return sum + 1;
    if (kind === "sort") return sum + (node.items?.length ?? 0);
    return sum;
  }, 0);
}

/**
 * Coins a run earns: the mission's max (`reward`) × share of points from
 * first answers. Rounded, never above the max.
 */
export function earnedReward(task: TaskContent, firstVerdicts: readonly Verdict[]): number {
  const total = scoredUnits(task);
  if (total === 0) return task.reward;
  const points = firstVerdicts.reduce((sum, verdict) => sum + verdictPoints(verdict), 0);
  return Math.min(task.reward, Math.round((task.reward * points) / total));
}

/** Sorting one item is right or wrong — no «с ценой» middle. */
export function sortVerdict(item: SortItem, chosenBin: number): Verdict {
  return item.bin === chosenBin ? "good" : "bad";
}

/** A choice the child answers by tapping scene cards, not option buttons. */
export function isPickChoice(node: Pick<TaskNode, "options">): boolean {
  return (node.options ?? []).some((option) => Boolean(option.fallback) || (option.picks?.length ?? 0) > 0);
}

/** Coins printed on a tile (`"10"`). Anything else counts as zero. */
export function tileCoins(tile: SceneTile): number {
  return tile.value != null && /^\d+$/.test(tile.value) ? Number(tile.value) : 0;
}

/** The wallet tile: a non-pick scene card with a coin amount, e.g. «Есть 20». */
export function pickBudget(tiles: readonly SceneTile[]): number | null {
  const purse = tiles.find((tile) => !tile.pick && tile.value != null && /^\d+$/.test(tile.value));
  return purse ? Number(purse.value) : null;
}

/**
 * Which option the tapped cards mean. Exact `picks` win (order ignored);
 * otherwise the `fallback` option. -1 when nothing matches.
 */
export function matchPick(options: readonly TaskOption[], selected: readonly string[]): number {
  const key = (labels: readonly string[]) => [...labels].sort().join("\0");
  const want = key(selected);
  const exact = options.findIndex((option) => option.picks != null && key(option.picks) === want);
  if (exact >= 0) return exact;
  return options.findIndex((option) => option.fallback);
}

/**
 * Only the improvement over the best earlier run is paid, so replays cannot
 * farm coins but a better answer is still worth coming back for.
 */
export function rewardTopUp(bestSoFar: number, earned: number): number {
  return Math.max(0, earned - bestSoFar);
}

/** «Можно получить ещё N» on the map sheet. */
export function rewardLeft(task: TaskContent, bestSoFar: number): number {
  return Math.max(0, task.reward - bestSoFar);
}

/** Legacy +10-once rule, kept for correction Задания without a score. */
export function taskRewardDue(alreadyPaid: boolean): number {
  return alreadyPaid ? 0 : ECONOMY.taskReward;
}

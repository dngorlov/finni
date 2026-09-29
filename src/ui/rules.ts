import { BANK, ECONOMY, METERS, SAVINGS } from "../core/config";
import { ACCESSORY_KEYS, ACCESSORY_STAGE } from "../core/accessories";
import { depositPayout } from "../core/bank";
import { DAILY_REWARD_COINS } from "../core/dailyReward";
import { billsTotal } from "../core/economy";
import { estimateDaysToGoal } from "../core/savings";
import { nextStage, STAGE_NAMES, stageGoalFloor, type Stage } from "../core/stages";
import { earnedReward, endsGameDay, rewardTopUp, verdictPoints, type TaskContent, type Verdict } from "../core/tasks";
import type { GameContent } from "../data/content";
import { POSE_THRESHOLDS } from "./pet/keys";
import { petStrings } from "./stringsPet";
import { rulesStrings as s } from "./stringsRules";

/** A plain sentence, a formula shown in its own box, or a worked example. */
export type RuleLine = { kind: "text" | "formula" | "example" | "item"; text: string };

export type RuleSection = { title: string; lines: RuleLine[] };

type RulesContent = Pick<GameContent, "catalog" | "bills" | "goals" | "tasks">;

const STAGES: readonly Stage[] = ["novice", "pro", "millionaire"];

const text = (value: string): RuleLine => ({ kind: "text", text: value });
const formula = (value: string): RuleLine => ({ kind: "formula", text: value });
const example = (value: string): RuleLine => ({ kind: "example", text: value });
const item = (value: string): RuleLine => ({ kind: "item", text: value });

function rewardRange(tasks: readonly { reward: number }[]): { min: number; max: number } | null {
  if (tasks.length === 0) return null;
  const rewards = tasks.map((task) => task.reward);
  return { min: Math.min(...rewards), max: Math.max(...rewards) };
}

/** Worked lesson example run through the real reward code: four questions, first answers ✓ ✓ «с ценой» ✗. */
function lessonExample(reward: number): string {
  const verdicts: Verdict[] = ["good", "good", "warn", "bad"];
  const task: TaskContent = {
    id: "rules_example",
    topic: "budget",
    title: "",
    reward,
    intro: "",
    nodes: verdicts.map((_, index) => ({ id: `q${index}`, text: "", options: [] })),
  };
  const total = verdicts.reduce((sum, verdict) => sum + verdictPoints(verdict), 0);
  const count = (verdict: Verdict) => verdicts.filter((v) => v === verdict).length;
  return s.lessonExample(reward, verdicts.length, count("good"), count("warn"), count("bad"), total, earnedReward(task, verdicts));
}

function coinsSection(content: RulesContent): RuleSection {
  const tasks = content.tasks as readonly TaskContent[];
  const lessons = tasks.filter((task) => endsGameDay(task));
  const minis = tasks.filter((task) => task.parent != null && !task.correction && !task.comingSoon);
  const corrections = tasks.filter((task) => task.correction);
  const lessonRange = rewardRange(lessons);
  const miniRange = rewardRange(minis);
  const exampleReward = lessonRange?.min ?? ECONOMY.taskReward;
  const repeatBest = Math.round(exampleReward / 2);
  const repeatNow = exampleReward;
  const lines: RuleLine[] = [text(s.startBudget(ECONOMY.startingBudget))];
  if (lessonRange) lines.push(text(s.lessonReward(lessonRange.min, lessonRange.max)));
  lines.push(
    formula(s.lessonFormula),
    text(s.lessonPoints(verdictPoints("good"), verdictPoints("warn"), verdictPoints("bad"))),
    example(lessonExample(exampleReward)),
    text(s.lessonUnscored),
  );
  if (miniRange) lines.push(text(s.miniReward(miniRange.min, miniRange.max)));
  for (const task of corrections) lines.push(text(s.correctionReward(task.title, task.reward)));
  lines.push(
    formula(s.repeatFormula),
    example(s.repeatExample(repeatBest, repeatNow, rewardTopUp(repeatBest, repeatNow))),
    text(s.dailyGift(DAILY_REWARD_COINS)),
    formula(s.depositReturnFormula),
  );
  return { title: s.coinsTitle, lines };
}

function planSection(content: RulesContent): RuleSection {
  const lines: RuleLine[] = [
    text(s.planPromise),
    formula(s.planFormula),
    text(s.planFloor),
    text(s.billsIntro(content.bills.length)),
  ];
  content.bills.forEach((day, index) => {
    lines.push(item(s.billsDay(index + 1, billsTotal(day), day.note)));
  });
  lines.push(text(s.billsRepeat(content.bills.length + 1)));
  return { title: s.planTitle, lines };
}

function shopSection(content: RulesContent): RuleSection {
  const lines: RuleLine[] = [text(s.shopRule)];
  for (const entry of content.catalog) {
    const effects = [entry.effect, ...(entry.also ? [entry.also] : [])]
      .map((effect) => (effect.meter === "care" ? s.careEffect(effect.delta) : s.moodEffect(effect.delta)))
      .join(", ");
    lines.push(item(s.itemLine(entry.name, entry.price, effects, entry.kind === "mandatory")));
  }
  lines.push(
    text(s.meterStart(METERS.initialCare, METERS.initialMood)),
    text(s.dayEnd(METERS.dailyCareDrop, METERS.dailyMoodDrop)),
    text(s.overspend(METERS.overspendMoodPenalty)),
    text(s.noPlan(METERS.noPlanMoodPenalty)),
    text(s.clamp(METERS.min, METERS.max)),
    text(s.pose(POSE_THRESHOLDS.sadBelow, POSE_THRESHOLDS.happyFrom)),
  );
  return { title: s.shopTitle, lines };
}

function savingsSection(content: RulesContent): RuleSection {
  const deposits = [5, 10, 15];
  const remaining = 40;
  const days = estimateDaysToGoal(remaining, deposits);
  const lines: RuleLine[] = [formula(s.forecastFormula), text(s.forecastWindow(SAVINGS.estimateWindow))];
  if (days !== null) lines.push(example(s.forecastExample(remaining, deposits, days)));
  lines.push(text(s.goalsRule));
  for (const stage of STAGES) {
    const goals = content.goals.filter((goal) => goal.stage === stage);
    if (goals.length === 0) continue;
    const list = goals.map((goal) => s.goalItem(goal.name, goal.price, goal.effect.delta)).join(", ");
    lines.push(item(s.goalsStage(STAGE_NAMES[stage], list)));
  }
  return { title: s.savingsTitle, lines };
}

function bankSection(content: RulesContent): RuleSection {
  const unlock = content.tasks.find((task) => task.id === BANK.unlockTaskId);
  const lines: RuleLine[] = [];
  if (unlock) lines.push(text(s.bankUnlock(unlock.title)));
  lines.push(text(s.bankMin(BANK.minDeposit)));
  for (const offer of BANK.offers) lines.push(item(s.bankOffer(offer.days, offer.ratePercent)));
  lines.push(text(s.bankReturn));
  const first = BANK.offers[0];
  const amount = 100;
  lines.push(example(s.bankExample(amount, first.days, first.ratePercent, depositPayout(amount, first.ratePercent))));
  return { title: s.bankTitle, lines };
}

function stagesSection(content: RulesContent): RuleSection {
  const lines: RuleLine[] = [text(s.stagesOrder(STAGES.map((stage) => STAGE_NAMES[stage])))];
  for (const stage of STAGES) {
    if (nextStage(stage) === stage) {
      lines.push(item(s.stageLast(STAGE_NAMES[stage])));
      continue;
    }
    const prices = content.goals.filter((goal) => goal.stage === stage).map((goal) => goal.price);
    if (prices.length > 0) lines.push(item(s.stageFloor(STAGE_NAMES[stage], stageGoalFloor(prices))));
  }
  lines.push(text(s.accessoryIntro));
  for (const key of ACCESSORY_KEYS) {
    lines.push(item(s.accessory(STAGE_NAMES[ACCESSORY_STAGE[key]], petStrings.accessoryName(key))));
  }
  return { title: s.stagesTitle, lines };
}

/** Every rule section, numbers read from config, catalog, and core helpers. */
export function buildRuleSections(content: RulesContent): RuleSection[] {
  return [
    coinsSection(content),
    planSection(content),
    shopSection(content),
    savingsSection(content),
    bankSection(content),
    stagesSection(content),
  ];
}

import {
  checkedTally,
  chooseOption,
  dealTask,
  earnedReward,
  matchPick,
  miniGames,
  missionPrerequisite,
  pickBudget,
  rewardLeft,
  rewardTopUp,
  scoredUnits,
  sortVerdict,
  startTask,
  tallyVerdicts,
  taskRewardDue,
  unlockedTasks,
  type TaskContent,
} from "../tasks";

function fixture(overrides: Partial<TaskContent> & Pick<TaskContent, "id" | "topic">): TaskContent {
  return {
    title: overrides.title ?? overrides.id,
    reward: 10,
    intro: "intro",
    nodes: [
      {
        id: "n1",
        text: "С чего начнёшь?",
        options: [
          {
            label: "Купить обед",
            next: "n2",
            verdict: "good",
            explanation: "Сначала нужды.",
            effect: { meter: "care", delta: 5 },
          },
          {
            label: "Мороженое",
            next: "retry",
            verdict: "bad",
            explanation: "На обед не хватает.",
          },
        ],
      },
      {
        id: "n2",
        text: "Сколько в копилку?",
        options: [
          {
            label: "5 монет",
            next: "exit",
            verdict: "good",
            explanation: "Копилка растёт.",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("task runner", () => {
  const task = fixture({ id: "budget_first_plan", topic: "budget" });

  it("starts on the first node and returns every option with its verdict and explanation", () => {
    const start = startTask(task);

    expect(start.nodeId).toBe("n1");
    expect(start.options).toHaveLength(2);
    expect(start.options[0]?.explanation).toBe("Сначала нужды.");
  });

  it("moves to the next node on a good choice and retries the same node on a bad one", () => {
    expect(chooseOption(task, "n1", 0)).toMatchObject({
      next: "n2",
      verdict: "good",
      explanation: "Сначала нужды.",
      effects: [{ meter: "care", delta: 5 }],
    });
    expect(chooseOption(task, "n1", 1)).toMatchObject({
      next: "retry",
      verdict: "bad",
      explanation: "На обед не хватает.",
    });
  });

  it("pays the reward only on the first correct completion", () => {
    expect(taskRewardDue(false)).toBe(10);
    expect(taskRewardDue(true)).toBe(0);
  });
});

describe("mission unlock chain", () => {
  const tasks: TaskContent[] = [
    fixture({ id: "payments_2", topic: "payments", order: 2 }),
    fixture({ id: "budget_1", topic: "budget", order: 1 }),
    fixture({ id: "savings_1", topic: "savings", order: 1 }),
    fixture({ id: "budget_2", topic: "budget", order: 2 }),
    fixture({ id: "payments_1", topic: "payments", order: 1 }),
    fixture({ id: "bonus", topic: "payments", order: 3, requires: "payments_2" }),
    fixture({ id: "budget_fix_backpack", topic: "budget", correction: true }),
  ];
  const open = (done: string[]) => unlockedTasks(tasks, new Set(done)).map((t) => t.id);

  it("opens only budget #1 at first and hides correction tasks", () => {
    expect(open([])).toEqual(["budget_1"]);
  });

  it("after budget #1 opens #1 of every topic and budget #2", () => {
    expect(open(["budget_1"])).toEqual(["budget_1", "budget_2", "savings_1", "payments_1"]);
  });

  it("then goes strictly in order inside a topic, and `requires` overrides the chain", () => {
    expect(open(["budget_1", "payments_1"])).toContain("payments_2");
    expect(open(["budget_1", "payments_1"])).not.toContain("bonus");
    expect(open(["budget_1", "payments_1", "payments_2"])).toContain("bonus");
    expect(missionPrerequisite(tasks[5]!, tasks)?.id).toBe("payments_2");
    expect(missionPrerequisite(tasks[1]!, tasks)).toBeNull();
  });

  it("opens every map pin and its mini-games in Демо-режим", () => {
    const withGame: TaskContent[] = [
      ...tasks,
      fixture({ id: "game", topic: "budget", parent: "budget_1" }),
    ];
    expect(unlockedTasks(withGame, new Set(), true).map((task) => task.id)).toEqual([
      "budget_1",
      "budget_2",
      "savings_1",
      "payments_1",
      "payments_2",
      "bonus",
      "game",
    ]);
    expect(unlockedTasks(withGame, new Set(), false).map((task) => task.id)).not.toContain("game");
  });

  it("keeps the Копилка and План lessons closed until «Что такое бюджет?», like every other topic", () => {
    const real = [
      fixture({ id: "budget_what", topic: "budget", order: 1 }),
      fixture({ id: "budget_plan", topic: "budget", order: 2 }),
      fixture({ id: "budget_change", topic: "budget", order: 3 }),
      fixture({ id: "savings_what", topic: "savings", order: 1 }),
      fixture({ id: "payments_pay", topic: "payments", order: 1 }),
    ];
    const ids = (done: string[]) => unlockedTasks(real, new Set(done)).map((task) => task.id);
    expect(ids([])).toEqual(["budget_what"]);
    expect(ids(["budget_what"])).toEqual(["budget_what", "budget_plan", "savings_what", "payments_pay"]);
    expect(ids(["budget_what", "budget_plan"])).toContain("budget_change");
  });
});

describe("mini-games inside a lesson sheet and «скоро» pins", () => {
  const tasks: TaskContent[] = [
    fixture({ id: "budget_1", topic: "budget", order: 1 }),
    fixture({ id: "budget_2", topic: "budget", order: 2, comingSoon: true }),
    fixture({ id: "game", topic: "budget", parent: "budget_1" }),
  ];

  it("keeps games off the chain, opens them after the parent, and never opens a «скоро» pin", () => {
    expect(missionPrerequisite(tasks[2]!, tasks)?.id).toBe("budget_1");
    expect(miniGames(tasks).map((t) => t.id)).toEqual(["game"]);
    expect(unlockedTasks(tasks, new Set()).map((t) => t.id)).toEqual(["budget_1"]);
    expect(unlockedTasks(tasks, new Set(["budget_1"])).map((t) => t.id)).toEqual(["budget_1", "game"]);
  });
});

describe("score-based reward", () => {
  const quiz = fixture({ id: "q", topic: "budget", reward: 15 });

  it("counts fully right first answers and rejects a tally that cannot exist", () => {
    expect(tallyVerdicts(["good", "warn", "bad"])).toEqual({ correct: 1, scored: 3 });
    expect(checkedTally(undefined)).toEqual({ correct: 0, scored: 0 });
    expect(() => checkedTally({ correct: 2, scored: 1 })).toThrow(/статистика ответов/);
  });

  it("pays the share of first-try points: right 1, «с ценой» ½, wrong 0", () => {
    expect(scoredUnits(quiz)).toBe(2);
    expect(earnedReward(quiz, ["good", "good"])).toBe(15);
    expect(earnedReward(quiz, ["good", "warn"])).toBe(11);
    expect(earnedReward(quiz, ["bad", "bad"])).toBe(0);
  });

  it("counts sort items and skips cards", () => {
    const game: TaskContent = {
      ...fixture({ id: "g", topic: "budget", reward: 10 }),
      nodes: [
        { id: "c", kind: "card", text: "Бюджет — это план.", next: "s" },
        {
          id: "s",
          kind: "sort",
          text: "Нужно или хочется?",
          bins: ["Нужно", "Хочется"],
          next: "exit",
          items: [
            { label: "Обед", bin: 0, explanation: "Еда нужна." },
            { label: "Кино", bin: 1, explanation: "Можно отложить." },
          ],
        },
      ],
    };
    expect(scoredUnits(game)).toBe(2);
    expect(sortVerdict(game.nodes[1]!.items![0]!, 0)).toBe("good");
    expect(sortVerdict(game.nodes[1]!.items![1]!, 0)).toBe("bad");
    expect(earnedReward(game, ["good", "bad"])).toBe(5);
  });

  it("matches tapped cards to an answer and reads the wallet as the budget", () => {
    const options = [
      { label: "Обед и шампунь", picks: ["Обед", "Шампунь"], next: "g3", verdict: "good" as const, explanation: "ok" },
      { label: "Только мячик", picks: ["Мячик"], next: "retry", verdict: "bad" as const, explanation: "no" },
      { label: "Другой набор", fallback: true, next: "retry", verdict: "bad" as const, explanation: "else" },
    ];
    expect(matchPick(options, ["Шампунь", "Обед"])).toBe(0);
    expect(matchPick(options, ["Мячик"])).toBe(1);
    expect(matchPick(options, ["Обед"])).toBe(2);
    expect(pickBudget([{ label: "Обед", value: "10", pick: true }, { label: "Есть", value: "20", tone: "good" }])).toBe(20);
  });

  it("deals a short chain from the pool so the next visit can be a different set of rounds", () => {
    const game = fixture({
      id: "sale",
      topic: "payments",
      parent: "shop",
      reward: 10,
      deal: 2,
      nodes: [
        { id: "g0", kind: "card", text: "Начни", next: "q1", button: "Начать" },
        ...["q1", "q2", "q3", "q4"].map((id, index, ids) => ({
          id,
          text: id,
          options: [
            {
              label: "Купить",
              next: ids[index + 1] ?? "fin",
              verdict: "good" as const,
              explanation: "да",
              kept: 10,
            },
            { label: "Пройти мимо", next: "retry", verdict: "bad" as const, explanation: "нет" },
          ],
        })),
        { id: "fin", kind: "card" as const, text: "Конец", next: "exit", button: "Продолжить" },
      ],
    });

    const dealt = dealTask(game, [2, 0]);

    expect(dealt.nodes.map((node) => node.id)).toEqual(["g0", "q3", "q1", "fin"]);
    expect(dealt.nodes[0]?.next).toBe("q3");
    expect(dealt.nodes[1]?.options?.[0]?.next).toBe("q1");
    expect(dealt.nodes[1]?.options?.[1]?.next).toBe("retry");
    expect(dealt.nodes[1]?.options?.[0]?.kept).toBe(10);
    expect(dealt.nodes[2]?.options?.[0]?.next).toBe("fin");
    expect(scoredUnits(game)).toBe(4);
    expect(scoredUnits(dealt)).toBe(2);
    expect(earnedReward(dealt, ["good", "good"])).toBe(10);
    expect(dealTask(game, [1, 3]).nodes.map((node) => node.id)).toEqual(["g0", "q2", "q4", "fin"]);
  });

  it("leaves a lesson without a deal untouched", () => {
    const lesson = fixture({ id: "lesson", topic: "budget" });
    expect(dealTask(lesson)).toBe(lesson);
  });

  it("pays only the improvement over the best run and reports what is left", () => {
    expect(rewardTopUp(0, 11)).toBe(11);
    expect(rewardTopUp(11, 15)).toBe(4);
    expect(rewardTopUp(15, 8)).toBe(0);
    expect(rewardLeft(quiz, 11)).toBe(4);
    expect(rewardLeft(quiz, 15)).toBe(0);
  });
});

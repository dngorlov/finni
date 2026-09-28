import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import type { CatalogItem } from "../../core/economy";
import { META_KEYS } from "../../data/metaKeys";
import { FinPetApp } from "../FinPetApp";
import { PET_FRAME_MS } from "../pet/petLife";
import { HomeScene, type HomePet } from "../screens/HomeScene";
import { SessionProvider } from "../session/SessionProvider";
import { achievementStrings } from "../stringsAchievements";
import { homeStrings } from "../stringsHome";
import { petStrings } from "../stringsPet";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

const goal = (id: string, price: number): CatalogItem => ({
  id,
  kind: "optional",
  price,
  effect: { meter: "mood", delta: 12 },
  once: true,
});

/** Earn the coins, save them, and buy the Цель from Копилка — the step that moves Этап. */
function buyGoal(ports: ReturnType<typeof createFakePorts>, item: CatalogItem) {
  const profileId = ports.meta.get(META_KEYS.activeProfileId)!;
  const day = ports.game.dayState(profileId);
  ports.game.applyTaskStep(profileId, day.dayId, {
    next: "exit",
    verdict: "good",
    explanation: "чек",
    effects: [{ coins: item.price }],
  });
  ports.game.setActiveGoal(profileId, item);
  const moved = ports.game.transferToSavings(profileId, day.dayId, item.price);
  if (moved.status !== "ok") throw new Error("Копилка не приняла сумму");
  const bought = ports.game.purchaseFromSavings(profileId, day.dayId, item);
  if (bought.status !== "ok") throw new Error("Цель не купилась");
}

async function dismissAchievements(user: ReturnType<typeof userEvent.setup>) {
  while (screen.queryByText(achievementStrings.modalCaption)) {
    await user.press(screen.getByRole("button", { name: achievementStrings.celebrate }));
  }
}

describe("Аксессуар opens with Этап", () => {
  it("shows «Новый аксессуар: очки!» after the Цель moves Этап to Про, puts them on, and does not repeat", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);
    expect(screen.queryByText(petStrings.unlockCaption)).not.toBeOnTheScreen();
    expect(screen.getByRole("img", { name: /Питомец Пух.*без аксессуара/ })).toBeOnTheScreen();

    await act(async () => buyGoal(ports, goal("skateboard", 90)));
    await dismissAchievements(user);

    expect(await screen.findByText("Новый аксессуар: очки!")).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: /Питомец Пух.*очки, весёлый/ })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: petStrings.unlockDone }));

    expect(screen.queryByText("Новый аксессуар: очки!")).not.toBeOnTheScreen();
    expect(ports.game.getProfile(profileId)).toMatchObject({ stage: "pro", accessory: "a2" });
    expect(screen.getByRole("img", { name: /Питомец Пух.*очки/ })).toBeOnTheScreen();
    expect(ports.game.accessoryUnlock(profileId)).toBeNull();
  });

  it("opens the шапочка at Миллионер and waits for the Дом tab", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    buyGoal(ports, goal("skateboard", 90));
    ports.game.celebrateAccessoryUnlock(profileId);
    const { user } = await renderApp(ports);
    await dismissAchievements(user);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await act(async () => buyGoal(ports, goal("scooter", 160)));
    await dismissAchievements(user);
    expect(screen.queryByText(petStrings.finaleTitle)).not.toBeOnTheScreen();
    expect(screen.queryByText("Новый аксессуар: шапочка с антенной!")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Дом" }));
    expect(await screen.findByText(petStrings.finaleBody)).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: /Питомец Пух.*весёлый/ })).toBeOnTheScreen();
    expect(screen.queryByText("Новый аксессуар: шапочка с антенной!")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: petStrings.finaleDone }));

    expect(screen.queryByText(petStrings.finaleBody)).not.toBeOnTheScreen();
    expect(await screen.findByText("Новый аксессуар: шапочка с антенной!")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: petStrings.unlockDone }));
    expect(ports.game.getProfile(profileId)).toMatchObject({ stage: "millionaire", accessory: "a3" });
    expect(ports.game.finalePending(profileId)).toBe(false);
  });

  it("changes Вид, Окрас, and an opened Аксессуар on Внешний вид and keeps them", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    buyGoal(ports, goal("skateboard", 90));
    ports.game.celebrateAccessoryUnlock(profileId);
    for (const row of ports.game.listAchievements(profileId)) ports.game.celebrateAchievement(profileId, row.id);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    await user.press(screen.getByRole("button", { name: petStrings.appearanceOpen }));
    expect(screen.getByText(petStrings.appearanceTitle)).toBeOnTheScreen();

    const hat = screen.getByRole("button", { name: "Шапочка с антенной, закрыто. Откроется на этапе «Миллионер»" });
    expect(hat).toBeDisabled();
    expect(screen.getByRole("button", { name: "Очки" })).toBeSelected();
    expect(screen.getByText("Откроется на этапе «Миллионер»")).toBeOnTheScreen();

    const beads = screen.getAllByRole("button", { name: /^(Зелёный|Оранжевый|Серый)$/ });
    ["Зелёный", "Оранжевый", "Серый"].forEach((name, index) => expect(beads[index]).toHaveAccessibleName(name));
    expect(screen.queryByText("🐣", { includeHiddenElements: true })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Вид 3" }));
    await user.press(screen.getByRole("button", { name: "Оранжевый" }));
    await user.press(screen.getByRole("button", { name: "Без аксессуара" }));
    await user.press(hat);

    expect(ports.game.getProfile(profileId)).toMatchObject({ species: "sp3", color: "c2", accessory: "a1" });
    expect(screen.getByRole("button", { name: "Без аксессуара" })).toBeSelected();
    expect(screen.getByRole("img", { name: /Питомец Пух, Вид 3, Оранжевый, без аксессуара/ })).toBeOnTheScreen();

    await user.press(screen.getAllByRole("button", { name: "Назад" })[0]!);
    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByRole("img", { name: /Питомец Пух, Вид 3, Оранжевый, без аксессуара/ })).toBeOnTheScreen();
  });
});

function homeScene(pet: Partial<HomePet> = {}, extra: { active?: boolean; random?: () => number } = {}) {
  return (
    <HomeScene
      pet={{ species: "sp1", color: "c1", accessory: "a1", petName: "Пух", care: 50, mood: 50, ...pet }}
      day={1}
      waiting={false}
      goalName=""
      accumulated={0}
      cost={0}
      onShop={() => {}}
      onResults={() => {}}
      dayTip={false}
      onDayTip={() => {}}
      active={extra.active}
      random={extra.random}
    />
  );
}

/** One finger moving from `from` to `to`, in the shape PanResponder reads from the responder system. */
function touch(from: [number, number], to: [number, number], stamp: number) {
  return {
    nativeEvent: { pageX: to[0], pageY: to[1], locationX: 10, locationY: 10, touches: [], timestamp: stamp },
    touchHistory: {
      mostRecentTimeStamp: stamp,
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      touchBank: [
        {
          touchActive: true,
          startPageX: 200,
          startPageY: 500,
          startTimeStamp: 1,
          currentTimeStamp: stamp,
          previousTimeStamp: stamp - 1,
          currentPageX: to[0],
          currentPageY: to[1],
          previousPageX: from[0],
          previousPageY: from[1],
        },
      ],
    },
  };
}

type Responder = Record<string, (event: ReturnType<typeof touch>) => boolean | void>;

async function respond(body: { props: Responder }, name: string, event: ReturnType<typeof touch>) {
  let answer: boolean | void = undefined;
  await act(async () => {
    answer = body.props[name]!(event);
  });
  return answer;
}

function petClip(): string {
  const frame = screen.getByTestId(/^living-pet-/);
  return String(frame.props.testID).replace("living-pet-", "");
}

/** Step the clock one pet frame at a time so React commits between timers, like a device. */
async function advance(ms: number) {
  for (let left = ms; left > 0; left -= PET_FRAME_MS) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(PET_FRAME_MS, left));
    });
  }
}

describe("living pet on Дом", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function measure() {
    await fireEvent(screen.getByTestId("home-scene"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 700 } },
    });
  }

  it("loops IDLE and hops on a tap, keeping the speech bubble", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(homeScene({}, { random: () => 0.99 }));
    expect(petClip()).toBe("idle");
    await advance(PET_FRAME_MS * 3);
    expect(petClip()).toBe("idle");

    expect(screen.getByText("Привет!")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Поговорить с питомцем Пух" }));
    expect(petClip()).toBe("jump");
    expect(screen.queryByText("Привет!")).not.toBeOnTheScreen();
    expect(screen.getByText(homeStrings.petLinesAny.at(-1)!)).toBeOnTheScreen();
    await advance(PET_FRAME_MS * 9);
    expect(petClip()).toBe("idle");
  });

  it("sometimes answers a tap with a one-two punch, then goes back to IDLE", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(homeScene({}, { random: () => 0.1 }));
    await user.press(screen.getByRole("button", { name: "Поговорить с питомцем Пух" }));
    expect(petClip()).toBe("attack");
    await advance(PET_FRAME_MS * 7);
    expect(petClip()).toBe("attack");
    await advance(PET_FRAME_MS * 2);
    expect(petClip()).toBe("idle");
  });

  it("does something on its own after a quiet spell, but no jumping when Счастье is low", async () => {
    const view = await render(homeScene({ mood: 10 }, { random: () => 0.5 }));
    await advance(8000);
    expect(petClip()).toBe("idle");
    await advance(1200);
    expect(petClip()).toBe("push");

    await view.rerender(homeScene({ mood: 80, care: 80 }, { random: () => 0.5 }));
    await advance(PET_FRAME_MS * 13 + 9100);
    expect(petClip()).toBe("jump");
  });

  it("strolls a few steps across the floor and back, then returns to IDLE", async () => {
    await render(homeScene({}, { random: () => 0 }));
    await measure();
    await advance(5900);
    const seen = [petClip()];
    for (let step = 0; step < 200; step += 1) {
      await act(async () => {
        jest.advanceTimersByTime(16);
      });
      if (seen[seen.length - 1] !== petClip()) seen.push(petClip());
    }
    expect(seen).toEqual(["idle", "walk", "idle"]);
  });

  it("stays on IDLE when animations are off, and still talks", async () => {
    const ports = createFakePorts();
    ports.meta.set(META_KEYS.animationsOn, "0");
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<SessionProvider ports={ports}>{homeScene({}, { random: () => 0 })}</SessionProvider>);
    await measure();

    await user.press(screen.getByRole("button", { name: "Поговорить с питомцем Пух" }));
    expect(petClip()).toBe("idle");
    expect(screen.getByText("Пойдём на карту?")).toBeOnTheScreen();
    await advance(30000);
    expect(petClip()).toBe("idle");
  });

  it("is dragged with the JUMP frame, falls to the floor, shows FALLS, then IDLE", async () => {
    await render(homeScene({}, { random: () => 0.99 }));
    await measure();
    const body = screen.getByRole("button", { name: "Поговорить с питомцем Пух" }).parent as unknown as {
      props: Responder;
    };

    await respond(body, "onStartShouldSetResponderCapture", touch([200, 500], [200, 500], 1));
    // A wobble inside the slop stays a tap for Pressable.
    expect(await respond(body, "onMoveShouldSetResponderCapture", touch([200, 500], [196, 498], 2))).toBe(false);
    expect(petClip()).toBe("idle");
    // A real move takes the touch away from Pressable and picks the pet up.
    expect(await respond(body, "onMoveShouldSetResponderCapture", touch([196, 498], [140, 300], 3))).toBe(true);
    await respond(body, "onResponderGrant", touch([196, 498], [140, 300], 3));
    expect(petClip()).toBe("held");
    await respond(body, "onResponderMove", touch([140, 300], [120, 60], 4));
    expect(petClip()).toBe("held");
    await advance(2000);
    expect(petClip()).toBe("held");

    await respond(body, "onResponderRelease", touch([120, 60], [120, 60], 5));
    // It stays in the air frame while it falls, shows FALLS on landing, then IDLE.
    const seen = [petClip()];
    for (let step = 0; step < 12; step += 1) {
      await advance(PET_FRAME_MS);
      if (seen[seen.length - 1] !== petClip()) seen.push(petClip());
    }
    expect(seen).toEqual(["held", "fall", "idle"]);
  });

  it("stops its frame clock and idle timers when Дом is left and when it unmounts", async () => {
    const started: unknown[] = [];
    const stopped = new Set<unknown>();
    const realSetInterval = global.setInterval;
    const realClearInterval = global.clearInterval;
    jest.spyOn(global, "setInterval").mockImplementation(((...args: Parameters<typeof setInterval>) => {
      const id = realSetInterval(...args);
      started.push(id);
      return id;
    }) as typeof setInterval);
    jest.spyOn(global, "clearInterval").mockImplementation(((id: Parameters<typeof clearInterval>[0]) => {
      stopped.add(id);
      realClearInterval(id);
    }) as typeof clearInterval);

    const view = await render(homeScene({}, { random: () => 0.5 }));
    expect(started).toHaveLength(1);

    await view.rerender(homeScene({}, { active: false, random: () => 0.5 }));
    expect(started.every((id) => stopped.has(id))).toBe(true);
    const paused = petClip();
    await advance(30000);
    expect(petClip()).toBe(paused);
    expect(started).toHaveLength(1);

    await view.rerender(homeScene({}, { active: true, random: () => 0.5 }));
    expect(started).toHaveLength(2);
    await view.unmount();
    expect(started.every((id) => stopped.has(id))).toBe(true);
    // Nothing left to fire into an unmounted pet.
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(errors).not.toHaveBeenCalled();
  });
});

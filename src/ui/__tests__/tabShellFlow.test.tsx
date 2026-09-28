import { act, render, screen, userEvent } from "@testing-library/react-native";
import { META_KEYS } from "../../data/metaKeys";
import { FinPetApp } from "../FinPetApp";
import { TAB_FADE_MS } from "../screens/TabPane";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

const PET = "Поговорить с питомцем Пух";

async function renderShell(animations: boolean) {
  const ports = createFakePorts();
  seedReturningChild(ports);
  if (!animations) ports.meta.set(META_KEYS.animationsOn, "0");
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return user;
}

function expectHome() {
  expect(screen.getByRole("button", { name: PET })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Мини-игры" })).not.toBeOnTheScreen();
  expect(screen.queryByText(JOURNAL)).not.toBeOnTheScreen();
}

/** Журнал body: the operations heading, or the empty line on a fresh profile. */
const JOURNAL = /^(Операции|За эти дни операций нет\.)$/;

function expectMap() {
  expect(screen.getByRole("button", { name: "Мини-игры" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: PET })).not.toBeOnTheScreen();
  expect(screen.queryByText(JOURNAL)).not.toBeOnTheScreen();
}

function expectMoney() {
  // A lone Журнал has no section pill; its list is what shows.
  expect(screen.getByText(JOURNAL)).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: PET })).not.toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Мини-игры" })).not.toBeOnTheScreen();
}

describe("Дом / Карта / Деньги tab shell", () => {
  it("switches straight to the chosen tab when «Анимация» is off", async () => {
    const user = await renderShell(false);
    expectHome();
    await user.press(screen.getByRole("button", { name: "Карта" }));
    expectMap();
    await user.press(screen.getByRole("button", { name: "Деньги" }));
    expectMoney();
    await user.press(screen.getByRole("button", { name: "Дом" }));
    expectHome();
  });

  it("cross-fades into the chosen tab and keeps Дом mounted underneath instead of rebuilding it", async () => {
    const user = await renderShell(true);
    const home = screen.getByTestId("home-scene");

    await user.press(screen.getByRole("button", { name: "Карта" }));
    // Only the open tab is reachable while the one being left fades out underneath.
    expectMap();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, TAB_FADE_MS + 100));
    });
    expectMap();
    expect(screen.getByTestId("home-scene", { includeHiddenElements: true })).toBe(home);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    expectMoney();
    await user.press(screen.getByRole("button", { name: "Дом" }));
    expectHome();
    expect(screen.getByTestId("home-scene")).toBe(home);
  });
});

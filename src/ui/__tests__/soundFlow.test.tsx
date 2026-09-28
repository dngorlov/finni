import { render, screen, userEvent } from "@testing-library/react-native";
import { META_KEYS } from "../../data/metaKeys";
import { FinPetApp } from "../FinPetApp";
import { playCue, playStoredCue } from "../sound/playCue";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

jest.mock("../sound/playCue", () => ({
  playCue: jest.fn(() => Promise.resolve()),
  playStoredCue: jest.fn(() => Promise.resolve()),
}));

const preview = jest.mocked(playCue);
const cue = jest.mocked(playStoredCue);

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("громкость в Настройках", () => {
  beforeEach(() => {
    preview.mockClear();
    cue.mockClear();
  });

  it("saves a quieter level, previews it, and keeps a mute", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByRole("heading", { name: "Звук" })).toBeOnTheScreen();
    expect(screen.getByText("Так звучат верный ответ, ошибка и конец задания.")).toBeOnTheScreen();
    expect(screen.getByText("Громко 80%")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Тише" }));
    expect(screen.getByText("Средне 70%")).toBeOnTheScreen();
    expect(ports.meta.get(META_KEYS.soundVolume)).toBe("70");
    expect(preview).toHaveBeenCalledWith("correct", 70);

    await user.press(screen.getByRole("button", { name: "Назад" }));
    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByText("Средне 70%")).toBeOnTheScreen();
  });

  it("mutes without a preview and disables Тише", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    ports.meta.set(META_KEYS.soundVolume, "10");
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByText("Тихо 10%")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Тише" }));
    expect(screen.getByText("Выключен")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Тише" })).toBeDisabled();
    expect(ports.meta.get(META_KEYS.soundVolume)).toBe("0");
    expect(preview).not.toHaveBeenCalled();
  });

  it("turns animations off beside the volume slider and keeps that choice", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByRole("switch", { name: "Анимация" })).toBeChecked();
    expect(screen.getByText("Включена")).toBeOnTheScreen();

    await user.press(screen.getByRole("switch", { name: "Анимация" }));
    expect(screen.getByRole("switch", { name: "Анимация" })).not.toBeChecked();
    expect(screen.getByText("Выключена")).toBeOnTheScreen();
    expect(ports.meta.get(META_KEYS.animationsOn)).toBe("0");

    await user.press(screen.getByRole("button", { name: "Назад" }));
    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByRole("switch", { name: "Анимация" })).not.toBeChecked();

    await user.press(screen.getByRole("switch", { name: "Анимация" }));
    expect(screen.getByText("Включена")).toBeOnTheScreen();
    expect(ports.meta.get(META_KEYS.animationsOn)).toBe("1");
  });
});

describe("звуки задания", () => {
  beforeEach(() => {
    preview.mockClear();
    cue.mockClear();
  });

  it("plays a miss, a right answer, and the end of the mission", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Что такое сбережения, открыто" }));
    await user.press(screen.getByRole("button", { name: "Начать" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Проверить себя" }));

    await user.press(screen.getByRole("button", { name: "Потратить все 50 монет" }));
    expect(cue).toHaveBeenCalledWith("wrong", expect.anything());
    await user.press(screen.getByRole("button", { name: "Попробовать ещё" }));
    await user.press(screen.getByRole("button", { name: "Отложить часть монет" }));
    expect(cue).toHaveBeenCalledWith("correct", expect.anything());

    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Накопится 50 монет" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Верно" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "30 монет" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Продолжить" }));

    expect(screen.getByText("Что такое сбережения")).toBeOnTheScreen();
    expect(cue).toHaveBeenCalledWith("complete", expect.anything());
  }, 20000);
});

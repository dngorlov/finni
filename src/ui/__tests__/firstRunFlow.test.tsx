import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { FinPetApp } from "../FinPetApp";
import { strings } from "../strings";
import { homeStrings } from "../stringsHome";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

const shellTabs = ["Дом", "Карта", "Деньги"] as const;

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  const view = await render(<FinPetApp ports={ports} />);
  return { user, ports, view };
}

async function leaveOpeningCards(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 5; step += 1) {
    await user.press(screen.getByRole("button", { name: "Дальше" }));
  }
  await user.press(screen.getByRole("button", { name: "Готово" }));
}

async function reachName(user: ReturnType<typeof userEvent.setup>) {
  await leaveOpeningCards(user);
  await user.press(screen.getByRole("button", { name: "Дальше" }));
}

async function finishName(user: ReturnType<typeof userEvent.setup>) {
  await reachName(user);
  await user.type(screen.getByRole("textbox", { name: "Меня зовут" }), "Пух");
  await user.press(screen.getByRole("button", { name: "Дальше" }));
}

function nameField() {
  return screen.getByRole("textbox", { name: "Меня зовут" });
}

function expectNameChip(value: string) {
  expect(screen.getByText("Меня зовут")).toBeOnTheScreen();
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(nameField()).toHaveDisplayValue(value);
  if (value === "") {
    expect(screen.getByPlaceholderText("____")).toBeOnTheScreen();
  }
  expect(screen.queryByText("Имя")).not.toBeOnTheScreen();
  expect(screen.queryByLabelText(/Питомец .* говорит:/)).not.toBeOnTheScreen();
}

function expectSelectedAppearanceOption(name: string) {
  const option = screen.getByRole("button", { name });
  expect(option).toBeSelected();
  expect(option).toHaveAccessibleName(name);
  expect(option).not.toBeDisabled();
}

function expectMainChrome() {
  expect(screen.getByLabelText(/Этап 1 из 3, Новичок/)).toBeOnTheScreen();
  expect(screen.getByText("Новичок")).toBeOnTheScreen();
  expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
  expect(screen.getByLabelText("Сытость 50")).toBeOnTheScreen();
  expect(screen.getByLabelText("Счастье 50")).toBeOnTheScreen();
  expect(screen.queryByText("Сытость 50")).not.toBeOnTheScreen();
  expect(screen.queryByText("Счастье 50")).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Магазин" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Итоги" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Закончить день" })).not.toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Играть" })).not.toBeOnTheScreen();
  for (const name of shellTabs) {
    expect(screen.getByRole("button", { name })).toBeOnTheScreen();
  }
  expect(screen.getByRole("button", { name: "Дом" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Настройки" })).toBeOnTheScreen();
}

describe("first-run flow (Appendix A 1–4)", () => {
  it("starts Первый запуск when the runtime has no global crypto", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    try {
      await renderApp();
      expect(screen.getByText("Привет! Это ФинПет")).toBeOnTheScreen();
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "crypto", descriptor);
      } else {
        delete (globalThis as { crypto?: Crypto }).crypto;
      }
    }
  });

  it("starts Первый запуск when the runtime has no Intl.Segmenter", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter");
    Object.defineProperty(Intl, "Segmenter", { configurable: true, value: undefined });
    try {
      expect(() => {
        jest.isolateModules(() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("../FinPetApp");
        });
      }).not.toThrow();
    } finally {
      if (descriptor) {
        Object.defineProperty(Intl, "Segmenter", descriptor);
      } else {
        delete (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
      }
    }
  });

  it("walks six opening cards before Питомец", async () => {
    const ports = createFakePorts();
    const complete = jest.spyOn(ports.firstRun, "complete");
    const exit = jest.spyOn(BackHandler, "exitApp").mockImplementation(() => undefined);
    try {
      const { user } = await renderApp(ports);

      expect(screen.getByText("Привет! Это ФинПет")).toBeOnTheScreen();
      expect(screen.getByText(/Здесь будет жить твой пиксельный питомец/)).toBeOnTheScreen();
      expect(screen.getByText("1/6")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Дальше" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Готово" })).not.toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Пропустить" })).not.toBeOnTheScreen();
      expect(screen.queryByText("Питомец")).not.toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Назад" }));
      expect(exit).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Привет! Это ФинПет")).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Дальше" }));
      expect(screen.getByText("Копим на мечту")).toBeOnTheScreen();
      expect(screen.getByText("2/6")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));
      expect(exit).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Привет! Это ФинПет")).toBeOnTheScreen();

      await leaveOpeningCards(user);
      expect(screen.getByText("Питомец")).toBeOnTheScreen();
      expect(screen.queryByText("6/6")).not.toBeOnTheScreen();
      expect(complete).not.toHaveBeenCalled();
    } finally {
      exit.mockRestore();
    }
  });

  it("starts with pet customization before Имя, with Вид and Окрас only", async () => {
    const ports = createFakePorts();
    const complete = jest.spyOn(ports.firstRun, "complete");
    const { user } = await renderApp(ports);
    await leaveOpeningCards(user);

    expect(screen.getByText("Питомец")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Этап 1 из 3, Новичок/)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Настройки" })).not.toBeOnTheScreen();
    expect(screen.getByText(strings.speciesLegend)).toBeOnTheScreen();
    expect(screen.getByText(strings.colorLegend)).toBeOnTheScreen();
    // Аксессуары open with Этап, so the first run does not offer them.
    expect(screen.queryByText(strings.accessoryLegend)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Аксессуар|Очки|Шапочка/ })).not.toBeOnTheScreen();
    expect(screen.getByRole("img", { name: /Питомец.*Вид 1.*Окрас 1.*без аксессуара/ })).toBeOnTheScreen();
    expectSelectedAppearanceOption("Вид 1");
    expect(screen.getByRole("button", { name: "Вид 2" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Вид 2" })).not.toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Вид 2" }));
    expect(screen.getByRole("img", { name: /Питомец.*Вид 2.*Окрас 1.*без аксессуара/ })).toBeOnTheScreen();
    expectSelectedAppearanceOption("Вид 2");
    expect(screen.getByRole("button", { name: "Вид 1" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Вид 1" })).not.toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Окрас 2" }));
    expect(screen.getByRole("img", { name: /Питомец.*Вид 2.*Окрас 2.*без аксессуара/ })).toBeOnTheScreen();
    expectSelectedAppearanceOption("Окрас 2");
    expect(screen.getByRole("button", { name: "Окрас 1" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Окрас 1" })).not.toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Дальше" }));
    expectNameChip("");
    await user.type(nameField(), "Пух");
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ species: "sp2", color: "c2", accessory: "a1" }));
  });

  it("walks pet and Имя onto the hub", async () => {
    const ports = createFakePorts();
    const complete = jest.spyOn(ports.firstRun, "complete");
    const { user } = await renderApp(ports);
    await leaveOpeningCards(user);

    await user.press(screen.getByRole("button", { name: "Вид 2" }));
    expectSelectedAppearanceOption("Вид 2");
    await user.press(screen.getByRole("button", { name: "Дальше" }));

    expectNameChip("");
    expect(screen.getByRole("img", { name: /Питомец, Вид 2/ })).toBeOnTheScreen();
    expect(screen.queryByText("А тебя как зовут?")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Дальше" })).toBeDisabled();
    expect(complete).not.toHaveBeenCalled();

    await user.type(nameField(), "Пух");
    expectNameChip("Пух");
    expect(screen.getByRole("img", { name: /Питомец, Вид 2/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Дальше" })).toBeEnabled();
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    expect(complete).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole("button", { name: "Пропустить" })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Пособие +20 монет")).not.toBeOnTheScreen();

    expect(screen.getByText("Новичок")).toBeOnTheScreen();
    expectMainChrome();
    expect(screen.queryByText("Выбери цель")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Текущая задача: купить нужное в Магазине" })).toBeOnTheScreen();
    expect(screen.queryByText("Что такое бюджет?")).not.toBeOnTheScreen();
    expect(screen.getByLabelText(/Питомец Пух.*Вид 2.*спокойный/)).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    expect(screen.getByRole("button", { name: "Журнал" })).toBeSelected();
    expect(screen.queryByRole("button", { name: "Копилка" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "План" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Банк" })).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/Вчера: \d+/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Дом" }));

    await user.press(screen.getByRole("button", { name: "Карта" }));
    expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Что такое бюджет?, открыто" }));
    await user.press(screen.getByRole("button", { name: "Начать" }));
    expect(screen.getByText(/Бюджет — это план твоих денег/)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Баланс 100")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Назад" }));

    await user.press(screen.getByRole("button", { name: "Дом" }));
    await user.press(screen.getByRole("button", { name: "Настройки" }));
    await user.press(screen.getByRole("button", { name: "Взрослый раздел" }));
    expect(screen.getByText("Взрослый раздел")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Баланс 100")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Назад" }));
    await user.press(screen.getByRole("button", { name: "Назад" }));

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Словарик" }));
    expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
    expect(screen.getByText(homeStrings.handbookEmptyWords)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Что такое бюджет?" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Как играть" })).not.toBeOnTheScreen();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("preserves the draft when moving back through Первый запуск", async () => {
    const ports = createFakePorts();
    const complete = jest.spyOn(ports.firstRun, "complete");
    const { user } = await renderApp(ports);
    await leaveOpeningCards(user);

    await user.press(screen.getByRole("button", { name: "Вид 2" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.type(nameField(), "Пух");
    expectNameChip("Пух");
    await user.press(screen.getByRole("button", { name: "Назад" }));
    expectSelectedAppearanceOption("Вид 2");
    expect(complete).not.toHaveBeenCalled();
  });

  it("reopens the hub without a walkthrough after Имя", async () => {
    const ports = createFakePorts();
    const { user, view } = await renderApp(ports);
    await finishName(user);
    expectMainChrome();

    await view.unmount();
    await render(<FinPetApp ports={ports} />);
    expect(screen.queryByRole("button", { name: "Пропустить" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Как играть" })).not.toBeOnTheScreen();
    expectMainChrome();
  });

  it("validates the pet name after blur and restarts an abandoned draft", async () => {
    const ports = createFakePorts();
    const { user, view } = await renderApp(ports);
    await leaveOpeningCards(user);
    await user.press(screen.getByRole("button", { name: "Вид 2" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));

    const petName = nameField();
    await user.type(petName, "                     ");
    expectNameChip("");
    await fireEvent(petName, "blur");
    expect(screen.getByText("Введи от 1 до 20 символов")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Дальше" })).toBeDisabled();

    await view.unmount();
    const again = userEvent.setup();
    await render(<FinPetApp ports={ports} />);
    expect(screen.getByText("Привет! Это ФинПет")).toBeOnTheScreen();
    expect(screen.queryByText("Питомец")).not.toBeOnTheScreen();
    await leaveOpeningCards(again);
    expect(screen.getByRole("button", { name: "Вид 1" })).toBeSelected();
  });

  it("counts visible graphemes and trims the pet name before saving", async () => {
    const ports = createFakePorts();
    const { user } = await renderApp(ports);
    await reachName(user);
    const petName = nameField();
    const family = "👨‍👩‍👧‍👦";

    await fireEvent.changeText(petName, family.repeat(21));
    expect(screen.getByRole("button", { name: "Дальше" })).toBeDisabled();

    await fireEvent.changeText(petName, ` ${family.repeat(20)} `);
    expect(screen.getByRole("button", { name: "Дальше" })).toBeEnabled();
    await user.press(screen.getByRole("button", { name: "Дальше" }));

    expect(screen.getByRole("button", { name: "Магазин" })).toBeOnTheScreen();
    const profileId = ports.meta.get("activeProfileId");
    expect(profileId).not.toBeNull();
    expect(ports.game.getProfile(profileId!)).toMatchObject({
      name: family.repeat(20),
      petName: family.repeat(20),
    });
  });

  it("retains the draft and retries when profile creation fails", async () => {
    const ports = createFakePorts();
    const complete = jest
      .spyOn(ports.firstRun, "complete")
      .mockImplementationOnce(() => {
        throw new Error("write failed");
      });
    const { user } = await renderApp(ports);
    await reachName(user);
    await user.type(nameField(), "Пух");

    await user.press(screen.getByRole("button", { name: "Дальше" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Не получилось начать игру. Попробуй ещё раз.");
    expectNameChip("Пух");

    await user.press(screen.getByRole("button", { name: "Дальше" }));
    expect(screen.getByRole("button", { name: "Магазин" })).toBeOnTheScreen();
    expect(complete).toHaveBeenCalledTimes(2);
    const profileId = ports.meta.get("activeProfileId");
    expect(profileId).not.toBeNull();
    expect(ports.game.getProfile(profileId!)).toMatchObject({ name: "Пух", petName: "Пух" });
  });

  it("skips Первый запуск for a returning child and opens Settings from the hub", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    expectMainChrome();
    expect(screen.queryByLabelText("Пособие +20 монет")).not.toBeOnTheScreen();
    expect(screen.queryByText("Потому что начался новый игровой день.")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByText("Финни")).toBeOnTheScreen();
    expect(screen.getByText(/версия \d+\.\d+\.\d+ \(\d+\)/)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Баланс 100")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Настройки" })).not.toBeOnTheScreen();
  });

  it("shows Взрослый раздел on Настройки in every build, without a direct Удалить профиль", async () => {
    const held = __DEV__;
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: false });
    try {
      const ports = createFakePorts();
      seedReturningChild(ports);
      const { user } = await renderApp(ports);
      await user.press(screen.getByRole("button", { name: "Настройки" }));
      expect(screen.getByRole("button", { name: "Взрослый раздел" })).toBeOnTheScreen();
      expect(screen.queryByText("Dev")).not.toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Удалить профиль" })).not.toBeOnTheScreen();
    } finally {
      Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: held });
    }
  });
});

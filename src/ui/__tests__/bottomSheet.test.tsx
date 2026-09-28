import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheet, shouldCloseSheet } from "../components/BottomSheet";
import { SegmentedTabs } from "../screens/shopParts";

/** A single-finger touch history, the shape PanResponder reads its gesture from. */
function touch(y: number, time: number, startY = 0) {
  return {
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: time,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: startY,
          startTimeStamp: 0,
          currentPageX: 0,
          currentPageY: y,
          currentTimeStamp: time,
          previousPageX: 0,
          previousPageY: startY,
          previousTimeStamp: 0,
        },
      ],
    },
    nativeEvent: { touches: [], changedTouches: [], pageX: 0, pageY: y, timestamp: time },
  };
}

async function drag(dy: number, duration: number) {
  const grabber = screen.getByTestId("bottom-sheet-grabber", { includeHiddenElements: true });
  await fireEvent(grabber, "responderGrant", touch(0, 0));
  await fireEvent(grabber, "responderMove", touch(dy, duration));
  await fireEvent(grabber, "responderRelease", touch(dy, duration));
}

function Sheet({ onClose }: { onClose: () => void }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 42 } }}
    >
      <BottomSheet visible onClose={onClose} footer={<Text>Кнопки</Text>}>
        <Text>Внутри</Text>
      </BottomSheet>
    </SafeAreaProvider>
  );
}

describe("BottomSheet", () => {
  it("closes on a long pull or a fast flick, and not on a short slow one", () => {
    expect(shouldCloseSheet(120, 0.1, 400)).toBe(true);
    expect(shouldCloseSheet(30, 1.2, 400)).toBe(true);
    expect(shouldCloseSheet(30, 0.1, 400)).toBe(false);
    expect(shouldCloseSheet(-80, 2, 400)).toBe(false);
    // A short sheet needs a quarter of its height, not the full 96 dp.
    expect(shouldCloseSheet(60, 0.1, 200)).toBe(true);
  });

  it("closes when the grabber is pulled down far enough", async () => {
    const onClose = jest.fn();
    await render(<Sheet onClose={onClose} />);
    await drag(200, 800);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("snaps back after a short slow pull", async () => {
    const onClose = jest.fn();
    await render(<Sheet onClose={onClose} />);
    await drag(20, 800);
    expect(screen.getByText("Внутри")).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the footer above the system navigation bar", async () => {
    await render(<Sheet onClose={() => {}} />);
    const sheet = screen.getByTestId("bottom-sheet");
    expect(sheet).toHaveStyle({ paddingBottom: 42 + 16 });
  });

  it("still closes from the dim area", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<Sheet onClose={onClose} />);
    await user.press(screen.getByRole("button", { name: "Закрыть окно" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Обязательное / Желаемое", () => {
  it("sinks a tab while the finger is on it", async () => {
    await render(
      <SegmentedTabs
        options={[
          { value: "mandatory", label: "Необходимое" },
          { value: "optional", label: "Желаемое" },
        ]}
        value="mandatory"
        onChange={() => {}}
      />,
    );
    const tab = screen.getByRole("button", { name: "Желаемое" });
    expect(tab).toHaveStyle({ paddingBottom: 3 });
    await fireEvent(tab, "responderGrant", {
      persist() {},
      nativeEvent: { touches: [], changedTouches: [], pageX: 0, pageY: 0, locationX: 0, locationY: 0, timestamp: 0 },
      currentTarget: { measure() {} },
      dispatchConfig: { registrationName: "onResponderGrant" },
    });
    expect(tab).toHaveStyle({ paddingTop: 3, paddingBottom: 0 });
  });
});

import { act, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { LessonDock } from "../screens/TaskListScreen";

type Host = {
  props: { onLayout?: (event: unknown) => void; style?: unknown };
  parent: Host | null;
};

/**
 * React Native pools layout events and sets `nativeEvent` to null once the
 * handler returns. A second layout in the same turn skips the eager state
 * update, so the height has to be copied before that release.
 */
function pooledLayout(height: number) {
  let released = false;
  return {
    event: {
      get nativeEvent() {
        return released ? null : { layout: { x: 0, y: 0, width: 120, height } };
      },
    },
    release() {
      released = true;
    },
  };
}

function layoutHost(start: Host): Host {
  let node: Host | null = start;
  while (node) {
    if (typeof node.props.onLayout === "function") return node;
    node = node.parent;
  }
  throw new Error("layout host missing");
}

describe("LessonDock", () => {
  it("keeps the action height after the layout event is released", async () => {
    await render(
      <LessonDock
        cap={40}
        copy={<Text>Коротко</Text>}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Начать">
            <Text>Начать</Text>
          </Pressable>
        }
        extras={null}
        onHeight={() => {}}
      />,
    );

    const copy = layoutHost(screen.getByText("Коротко") as unknown as Host);
    const action = layoutHost(screen.getByRole("button", { name: "Начать" }) as unknown as Host);
    const dock = layoutHost(action.parent as Host);
    const copyLayout = pooledLayout(20);
    const actionLayout = pooledLayout(80);

    await act(() => {
      copy.props.onLayout?.(copyLayout.event);
      action.props.onLayout?.(actionLayout.event);
      copyLayout.release();
      actionLayout.release();
    });

    expect(dock).toHaveStyle({ height: 40 });
  });
});

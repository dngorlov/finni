import { render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "react-native";
import { BottomSheet, resetOpenSheetForTests } from "./BottomSheet";

function TwoSheets({ openSecond }: { openSecond: boolean }) {
  const [first, setFirst] = useState(true);
  return (
    <>
      <BottomSheet visible={first} onClose={() => setFirst(false)}>
        <Text>Первая</Text>
      </BottomSheet>
      <BottomSheet visible={openSecond} onClose={() => undefined}>
        <Text>Вторая</Text>
      </BottomSheet>
    </>
  );
}

describe("BottomSheet", () => {
  beforeEach(() => resetOpenSheetForTests());

  it("closes the drawer on screen when another one opens, so two never stack", async () => {
    const view = await render(<TwoSheets openSecond={false} />);
    expect(screen.getByText("Первая")).toBeOnTheScreen();
    await view.rerender(<TwoSheets openSecond />);
    expect(screen.queryByText("Первая")).not.toBeOnTheScreen();
    expect(screen.getByText("Вторая")).toBeOnTheScreen();
  });
});

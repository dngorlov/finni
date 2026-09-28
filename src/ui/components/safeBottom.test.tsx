import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppModal } from "./AppModal";
import { Screen } from "./Screen";

const NAV_BAR = 48;

function Phone({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 24, left: 0, right: 0, bottom: NAV_BAR },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
}

function footerPadding(): unknown {
  return StyleSheet.flatten(screen.getByText("Кнопка").parent?.props.style).paddingBottom;
}

describe("Screen footer and the navigation bar", () => {
  it("leaves a normal screen to the root safe area", async () => {
    await render(
      <Phone>
        <Screen footer={<Text>Кнопка</Text>}>
          <Text>Тело</Text>
        </Screen>
      </Phone>,
    );
    expect(footerPadding()).toBe(24);
  });

  it("lifts a footer inside a modal above the navigation bar", async () => {
    await render(
      <Phone>
        <AppModal animation="fade" visible transparent>
          <Screen footer={<Text>Кнопка</Text>}>
            <Text>Тело</Text>
          </Screen>
        </AppModal>
      </Phone>,
    );
    expect(footerPadding()).toBe(24 + NAV_BAR);
  });
});

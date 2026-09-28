import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { useAnimationsOn } from "../motion";

/** Length of the cross-fade between Дом, Карта, and Деньги. */
export const TAB_FADE_MS = 200;

type Fade<T> = { from: T; value: Animated.Value };

/**
 * Cross-fade between the tabs of the play shell: the tab being opened fades in
 * over the one being left, which stays drawn (and mounted) underneath until the
 * fade ends. With «Анимация» off in Настройки the switch is instant.
 */
export function useTabFade<T extends string>(tab: T): { fade: Fade<T> | null; leaving: T | null } {
  const animationsOn = useAnimationsOn();
  const [shown, setShown] = useState(tab);
  const [fade, setFade] = useState<Fade<T> | null>(null);
  if (tab !== shown) {
    setShown(tab);
    setFade(animationsOn ? { from: shown, value: new Animated.Value(0) } : null);
  }

  useEffect(() => {
    if (!fade) return;
    const run = Animated.timing(fade.value, {
      toValue: 1,
      duration: TAB_FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start(({ finished }) => {
      if (finished) setFade((current) => (current === fade ? null : current));
    });
    return () => run.stop();
  }, [fade]);

  return { fade, leaving: fade && fade.from !== tab ? fade.from : null };
}

/**
 * One tab's layer. The open tab is on top and takes touches; the tab being
 * left stays visible underneath during the fade; any other mounted tab is
 * invisible. Only the open tab is reachable by screen readers.
 */
export function TabPane({
  open,
  leaving,
  fadeIn,
  children,
}: {
  open: boolean;
  leaving: boolean;
  /** Opacity of the open tab while it fades in. */
  fadeIn: Animated.Value | null;
  children: ReactNode;
}) {
  const opacity = open ? (fadeIn ?? 1) : leaving ? 1 : 0;
  return (
    <Animated.View
      pointerEvents={open ? "auto" : "none"}
      aria-hidden={!open}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      style={[StyleSheet.absoluteFill, { opacity, zIndex: open ? 1 : 0 }]}
    >
      {children}
    </Animated.View>
  );
}

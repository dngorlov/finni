import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenTitle } from "../components/ScreenTitle";
import { finnyScript, type SpotlightBox, type TourStep } from "../finnyScript";
import { colors, radius, spacing, type } from "../theme";

/** Clear pixels between the control and the stroke, so the stroke sits outside it. */
const GAP = 4;
const STROKE = 3;
const PAD = GAP + STROKE;

/** Bottom tab tray (icon, label, padding). The coach sits above it. */
const ABOVE_TABS = 104;

/**
 * Finny’s acquaintance coach. The card sits over the live screen and names the
 * control the ring is marking. Choosing a Цель is the GoalPicker, not this card.
 */
export function FinnyTour({
  step,
  chosen,
  hole,
  onAdvance,
}: {
  step: TourStep;
  chosen: { name: string; cost: number } | null;
  /** Cut the dimming around the outlined control so it stays bright. */
  hole?: SpotlightBox | null;
  onAdvance: () => void;
}) {
  const [frameHeight, setFrameHeight] = useState(0);
  const lines = step.confirmGoal && chosen
    ? [step.lines[0] ?? finnyScript.pickedLine, finnyScript.pickedGoal(chosen.name), finnyScript.pickedCost(chosen.cost)]
    : step.lines;
  const highlightLow =
    hole != null && frameHeight > 0 && hole.y + hole.height / 2 > frameHeight / 2;
  const onTop = hole != null ? highlightLow : step.dock === "top";
  const roomBesideHole = hole == null || frameHeight <= 0
    ? 0
    : onTop
      ? hole.y - spacing.l - spacing.m
      : frameHeight - ABOVE_TABS - (hole.y + hole.height) - spacing.m;
  const room = roomBesideHole > 0 ? roomBesideHole : undefined;

  return (
    <View
      pointerEvents="box-none"
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.height);
        setFrameHeight((current) => (current === next ? current : next));
      }}
      style={[StyleSheet.absoluteFill, styles.layer]}
    >
      <SpotlightScrim hole={hole} light={step.map === true} />
      <View style={[styles.dock, onTop ? styles.dockTop : styles.dockBottom, room != null ? { maxHeight: room } : null]}>
        <View accessibilityLiveRegion="polite" style={styles.card}>
          {step.title ? (
            <ScreenTitle plain style={styles.title}>
              {step.title}
            </ScreenTitle>
          ) : null}
          {lines.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
          <PrimaryButton label={step.button} onPress={onAdvance} />
        </View>
      </View>
    </View>
  );
}

function SpotlightScrim({ hole, light }: { hole?: SpotlightBox | null; light: boolean }) {
  const dim = light ? styles.scrimLight : styles.scrim;
  if (!hole) {
    return <Pressable accessible={false} aria-hidden onPress={() => {}} style={[StyleSheet.absoluteFill, dim]} />;
  }
  const rawX = hole.x - PAD;
  const rawY = hole.y - PAD;
  const x = Math.max(0, rawX);
  const y = Math.max(0, rawY);
  const width = hole.width + PAD * 2 - (x - rawX);
  const height = hole.height + PAD * 2 - (y - rawY);
  return (
    <>
      <Pressable accessible={false} aria-hidden onPress={() => {}} style={[dim, styles.band, { top: 0, left: 0, right: 0, height: y }]} />
      <Pressable accessible={false} aria-hidden onPress={() => {}} style={[dim, styles.band, { top: y, left: 0, width: x, height }]} />
      <Pressable
        accessible={false}
        aria-hidden
        onPress={() => {}}
        style={[dim, styles.band, { top: y, left: x + width, right: 0, height }]}
      />
      <Pressable
        accessible={false}
        aria-hidden
        onPress={() => {}}
        style={[dim, styles.band, { top: y + height, left: 0, right: 0, bottom: 0 }]}
      />
      <Pressable accessible={false} aria-hidden onPress={() => {}} style={[styles.band, { top: y, left: x, width, height }]} />
      <View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            top: y,
            left: x,
            width,
            height,
            borderRadius: Math.min((hole.radius ?? radius.card) + PAD, width / 2, height / 2),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 20,
  },
  scrim: {
    backgroundColor: "rgba(34, 26, 18, 0.45)",
  },
  scrimLight: {
    backgroundColor: "rgba(34, 26, 18, 0.12)",
  },
  band: {
    position: "absolute",
  },
  ring: {
    borderColor: colors.accent,
    borderWidth: STROKE,
    position: "absolute",
  },
  dock: {
    left: spacing.m,
    position: "absolute",
    right: spacing.m,
  },
  dockBottom: {
    bottom: ABOVE_TABS,
  },
  dockTop: {
    top: spacing.l,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.raisedEdge,
    borderRadius: radius.card,
    borderWidth: 3,
    gap: spacing.s,
    padding: spacing.m,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  line: {
    color: colors.text,
    fontSize: type.body,
  },
});

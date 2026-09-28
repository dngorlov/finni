import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View, type Role } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { META_KEYS } from "../../data/metaKeys";
import { AppModal } from "../components/AppModal";
import { BackButton } from "../components/BackButton";
import { ScreenTitle } from "../components/ScreenTitle";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextButton } from "../components/TextButton";
import type { RootStackParamList } from "../navigation/types";
import { adultOverview, type AdultOverview } from "../session/adultOverview";
import { deleteChildAndDemo, resetChildProgress } from "../session/childProgress";
import { demoExists, enterDemo, exitDemo, resetDemo } from "../session/demoMode";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Demo">;
type Sheet =
  | null
  | { kind: "demoOn" }
  | { kind: "demoReset" }
  | { kind: "resetExplain" }
  | { kind: "resetType"; value: string }
  | { kind: "deleteExplain" }
  | { kind: "deleteType"; value: string };

const TEXTBOX_ROLE = "textbox" as Role;

export default function DemoScreen({ navigation }: Props) {
  const { game, meta, content } = useSession();
  const [demoOn, setDemoOn] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [overview, setOverview] = useState<AdultOverview | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);

  const load = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    const active = profileId ? game.getProfile(profileId) : null;
    setDemoOn(Boolean(active?.isDemo));
    setCanReset(demoExists(game, meta));
    setOverview(profileId ? adultOverview(game, content, profileId) : null);
    setSheet(null);
  }, [content, game, meta]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goMain = () => navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  const goFirstRun = () => navigation.reset({ index: 0, routes: [{ name: "FirstRun" }] });

  const turnOn = () => {
    enterDemo(game, meta, content);
    goMain();
  };

  const turnOff = () => {
    exitDemo(meta);
    goMain();
  };

  const reset = () => {
    resetDemo(game, meta, content);
    goMain();
  };

  const resetChild = () => {
    resetChildProgress(game, meta, content);
    goMain();
  };

  const deleteChild = () => {
    deleteChildAndDemo(game, meta);
    goFirstRun();
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <BackButton />
      <ScreenTitle style={styles.title}>{strings.navAdult}</ScreenTitle>
      {overview ? (
        <Card>
          {overview.topics.map((line) => (
            <Text key={line} style={styles.body}>
              {line}
            </Text>
          ))}
          <Text style={styles.body}>{overview.daysLine}</Text>
          <Text style={styles.body}>{overview.tasksLine}</Text>
          <Text style={styles.body}>{overview.answersLine}</Text>
          <Text style={styles.body}>{overview.lessonsLine}</Text>
          {overview.lastLessonLine ? <Text style={styles.body}>{overview.lastLessonLine}</Text> : null}
        </Card>
      ) : null}
      <Card>
        <Chip label={strings.demoMode} selected={demoOn} onPress={() => (demoOn ? turnOff() : setSheet({ kind: "demoOn" }))} />
        {canReset ? <TextButton label={strings.demoReset} onPress={() => setSheet({ kind: "demoReset" })} /> : null}
      </Card>
      {demoOn ? null : (
        <Card>
          <TextButton label={strings.resetProgress} onPress={() => setSheet({ kind: "resetExplain" })} />
          <TextButton label={strings.deleteProfile} onPress={() => setSheet({ kind: "deleteExplain" })} />
        </Card>
      )}
      {sheet?.kind === "demoOn" ? (
        <ConfirmSheet
          title={strings.demoMode}
          body={strings.demoConfirmBody}
          onClose={() => setSheet(null)}
          onConfirm={turnOn}
        />
      ) : null}
      {sheet?.kind === "demoReset" ? (
        <ConfirmSheet
          title={strings.demoReset}
          body={strings.demoResetConfirmBody}
          onClose={() => setSheet(null)}
          onConfirm={reset}
        />
      ) : null}
      {sheet?.kind === "resetExplain" ? (
        <ConfirmSheet
          title={strings.resetProgress}
          body={strings.resetProgressBody}
          confirmLabel={strings.next}
          onClose={() => setSheet(null)}
          onConfirm={() => setSheet({ kind: "resetType", value: "" })}
        />
      ) : null}
      {sheet?.kind === "resetType" ? (
        <TypedSheet
          title={strings.resetProgress}
          label={strings.resetProgressTypedLabel}
          value={sheet.value}
          expected={strings.resetProgressWord}
          onChange={(value) => setSheet({ kind: "resetType", value })}
          onClose={() => setSheet(null)}
          onConfirm={resetChild}
        />
      ) : null}
      {sheet?.kind === "deleteExplain" ? (
        <ConfirmSheet
          title={strings.deleteProfile}
          body={strings.deleteProfileBody}
          confirmLabel={strings.next}
          onClose={() => setSheet(null)}
          onConfirm={() => setSheet({ kind: "deleteType", value: "" })}
        />
      ) : null}
      {sheet?.kind === "deleteType" ? (
        <TypedSheet
          title={strings.deleteProfile}
          label={strings.deleteProfileTypedLabel}
          value={sheet.value}
          expected={strings.deleteProfileWord}
          onClose={() => setSheet(null)}
          onChange={(value) => setSheet({ kind: "deleteType", value })}
          onConfirm={deleteChild}
        />
      ) : null}
    </Screen>
  );
}

function ConfirmSheet({
  title,
  body,
  confirmLabel = strings.done,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AppModal animation="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop} pointerEvents="box-none">
        <View style={styles.sheet}>
          <Text style={styles.section}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <TextButton label={strings.close} onPress={onClose} />
          <PrimaryButton label={confirmLabel} onPress={onConfirm} />
        </View>
      </View>
    </AppModal>
  );
}

function TypedSheet({
  title,
  label,
  value,
  expected,
  onChange,
  onClose,
  onConfirm,
}: {
  title: string;
  label: string;
  value: string;
  expected: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AppModal animation="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop} pointerEvents="box-none">
        <View style={styles.sheet}>
          <Text style={styles.section}>{title}</Text>
          <Text style={styles.body}>{label}</Text>
          <TextInput
            role={TEXTBOX_ROLE}
            aria-label={label}
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <TextButton label={strings.close} onPress={onClose} />
          <PrimaryButton label={strings.done} disabled={value.trim() !== expected} onPress={onConfirm} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  section: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    gap: spacing.s,
    padding: spacing.l,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.track,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: type.body,
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
  },
});

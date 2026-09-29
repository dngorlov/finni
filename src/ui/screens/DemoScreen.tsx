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
import { AdultProgress } from "./adultProgress";
import { HeroCard, MoneyCard, SectionTitle } from "./moneyParts";
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
  | { kind: "bonus"; amount: number }
  | { kind: "resetExplain" }
  | { kind: "resetType"; value: string }
  | { kind: "deleteExplain" }
  | { kind: "deleteType"; value: string };

/** A whole number of coins, up to seven digits. Zero and junk stay unset. */
function parseCoins(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d{1,7}$/.test(text)) return null;
  const amount = Number(text);
  return amount > 0 ? amount : null;
}

const TEXTBOX_ROLE = "textbox" as Role;

export default function DemoScreen({ navigation }: Props) {
  const { game, meta, content } = useSession();
  const [demoOn, setDemoOn] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [overview, setOverview] = useState<AdultOverview | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [amountText, setAmountText] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const coins = parseCoins(amountText);

  const load = useCallback(() => {
    const activeId = meta.get(META_KEYS.activeProfileId);
    const active = activeId ? game.getProfile(activeId) : null;
    setProfileId(activeId);
    setBalance(active?.balance ?? 0);
    setDemoOn(Boolean(active?.isDemo));
    setCanReset(demoExists(game, meta));
    setOverview(activeId ? adultOverview(game, content, activeId) : null);
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

  const grantBonus = (amount: number) => {
    if (!profileId) return;
    game.addParentBonus(profileId, amount);
    setAmountText("");
    load();
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <BackButton />
      <ScreenTitle style={styles.title}>{strings.navAdult}</ScreenTitle>
      {profileId ? (
        <HeroCard compact caption={strings.balanceWord} value={balance} label={strings.adultNowBalance(balance)} />
      ) : null}
      {profileId ? (
        <>
          <SectionTitle>{strings.adultAddTitle}</SectionTitle>
          <MoneyCard>
            <Text style={styles.body}>{strings.adultAddHint}</Text>
            <TextInput
              role={TEXTBOX_ROLE}
              aria-label={strings.adultAddAmount}
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="number-pad"
              style={styles.input}
            />
            <PrimaryButton
              label={strings.adultAdd}
              disabled={coins == null}
              onPress={() => {
                if (coins == null) return;
                setSheet({ kind: "bonus", amount: coins });
              }}
            />
          </MoneyCard>
        </>
      ) : null}
      {overview ? <AdultProgress overview={overview} /> : null}
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
      {sheet?.kind === "bonus" ? (
        <ConfirmSheet
          title={strings.adultAddTitle}
          body={strings.adultAddBody(sheet.amount)}
          onClose={() => setSheet(null)}
          onConfirm={() => grantBonus(sheet.amount)}
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

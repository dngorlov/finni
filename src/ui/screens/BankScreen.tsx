import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { checkDeposit, depositPayout, maturesOnDay } from "../../core/bank";
import { BANK } from "../../core/config";
import { META_KEYS } from "../../data/metaKeys";
import type { DayState, DepositView } from "../../data/repositories/gameRepository";
import { AmountStepper } from "../components/AmountStepper";
import { CoinText } from "../components/CoinText";
import { ScreenTitle } from "../components/ScreenTitle";
import { Card } from "../components/Card";
import { CHART_COLORS } from "../components/DonutChart";
import { PixelIcon } from "../components/Pictogram";
import { FeedbackCard, type FeedbackModel } from "../components/FeedbackCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextButton } from "../components/TextButton";
import { usePlayChrome } from "../navigation/playChrome";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { moneyStrings } from "../stringsMoney";
import { colors, font, minTarget, spacing, type } from "../theme";
import { HeroCard, MoneyCard, moneyColors, ProgressBar, SectionTitle, ShowAllButton } from "./moneyParts";

/**
 * Банк — separate from Копилка: a вклад takes coins out of Баланс for a fixed
 * number of Игровые дни and returns them with interest (collected on Дом when
 * the day opens). No early withdrawal.
 */
/** Банк lists this many вклады before «Показать все». */
const DEPOSITS_SHOWN = 3;

export default function BankScreen() {
  const { game, meta } = useSession();
  const { touchChrome } = usePlayChrome();
  const [day, setDay] = useState<DayState | null>(null);
  const [balance, setBalance] = useState(0);
  const [deposits, setDeposits] = useState<DepositView[]>([]);
  const [offerId, setOfferId] = useState<string>(BANK.offers[0].id);
  const [amount, setAmount] = useState<number>(BANK.minDeposit);
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackModel | null>(null);
  const [showAllDeposits, setShowAllDeposits] = useState(false);

  const load = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    setDay(game.dayState(profileId));
    setBalance(game.getProfile(profileId).balance);
    setDeposits(game.listDeposits(profileId));
    touchChrome();
  }, [game, meta, touchChrome]);

  useFocusEffect(
    useCallback(() => {
      load();
      setConfirming(false);
    }, [load]),
  );

  const offer = BANK.offers.find((item) => item.id === offerId) ?? BANK.offers[0];
  const payout = depositPayout(amount, offer.ratePercent);
  const check = checkDeposit(balance, amount);
  const canOpen = Boolean(day?.open) && check.status === "ok";
  const returnsOn = day ? maturesOnDay(day.n, offer.days) : 0;
  const locked = deposits.filter((dep) => dep.status === "open").reduce((sum, dep) => sum + dep.amount, 0);
  // Open вклады first; a long history of returned ones folds away.
  const ordered = [...deposits.filter((dep) => dep.status === "open"), ...deposits.filter((dep) => dep.status !== "open")];
  const foldable = ordered.length > DEPOSITS_SHOWN;
  const shownDeposits = foldable && !showAllDeposits ? ordered.slice(0, DEPOSITS_SHOWN) : ordered;

  const open = () => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId || !day) return;
    const result = game.openDeposit(profileId, day.dayId, offer.id, amount);
    setConfirming(false);
    if (result.status === "ok") {
      setFeedback({
        deltas: { balance: -amount },
        cause: strings.feedbackCauseBankIn,
        nextStep: strings.feedbackNextBankIn,
      });
    }
    load();
  };

  if (day && !day.open) {
    return (
      <Screen>
        <ScreenTitle style={styles.title}>{strings.bankTitle}</ScreenTitle>
        <CoinText text={strings.waitingEconomyHint} style={styles.body} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        confirming ? (
          <>
            <TextButton label={strings.close} onPress={() => setConfirming(false)} />
            <PrimaryButton label={strings.bankOpen} onPress={open} />
          </>
        ) : (
          <PrimaryButton label={strings.bankOpen} disabled={!canOpen} onPress={() => setConfirming(true)} />
        )
      }
    >
      <ScreenTitle style={styles.title}>{strings.bankTitle}</ScreenTitle>
      <HeroCard
        compact
        caption={moneyStrings.bankActiveCaption}
        value={locked}
        label={moneyStrings.bankActiveTotal(locked)}
      >
        <CoinText text={strings.bankIntro} style={styles.heroNote} />
      </HeroCard>
      <MoneyCard>
        <Text role="heading" style={styles.section}>
          {moneyStrings.bankNew}
        </Text>
        <View style={styles.offers}>
          {BANK.offers.map((item) => {
            const selected = item.id === offer.id;
            const example = amount > 0 ? amount : BANK.minDeposit;
            return (
              <Pressable
                key={item.id}
                role="button"
                aria-label={strings.bankOfferLabel(item.days, item.ratePercent)}
                aria-selected={selected}
                onPress={() => setOfferId(item.id)}
                style={[styles.offer, selected ? styles.offerOn : null]}
              >
                <View style={styles.offerTop}>
                  <Text style={styles.term}>{moneyStrings.bankTerm(item.days)}</Text>
                  <View style={styles.rate}>
                    <Text style={styles.rateText}>{moneyStrings.bankRate(item.ratePercent)}</Text>
                  </View>
                </View>
                <Text style={styles.example}>
                  {moneyStrings.bankExample(example, depositPayout(example, item.ratePercent))}
                </Text>
                {selected ? (
                  <View style={styles.offerCheck}>
                    <PixelIcon name="check" size={16} color={colors.onRaised} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <AmountStepper
          label={strings.bankAmount}
          pictogram={strings.navBankPictogram}
          value={amount}
          min={0}
          max={Math.max(balance, 0)}
          showTrack
          dense
          trackColor={CHART_COLORS.bank}
          onChange={setAmount}
        />
        <CoinText coin text={strings.bankPreview(amount, payout, offer.days)} style={styles.body} />
        {check.status === "tooSmall" ? <CoinText text={strings.bankMin(check.min)} style={styles.muted} /> : null}
      </MoneyCard>
      {confirming ? (
        <Card>
          <CoinText text={strings.bankConfirmTitle} style={styles.section} />
          <CoinText text={strings.bankConfirmBody(amount, returnsOn)} style={styles.body} />
        </Card>
      ) : null}
      <SectionTitle>{strings.bankActive}</SectionTitle>
      <MoneyCard tight>
        {deposits.length === 0 ? <CoinText text={strings.bankEmpty} style={styles.muted} /> : null}
        {shownDeposits.map((dep, index) => {
          const passed = dep.status === "paid" ? dep.days : Math.max(0, dep.days - dep.daysLeft);
          const lastRow = index === shownDeposits.length - 1 && !foldable;
          return (
            <View key={dep.id} style={[styles.deposit, lastRow ? null : styles.depositDivider]}>
              <View style={styles.depositIcon}>
                <PixelIcon
                  name={dep.status === "paid" ? "check" : "lock"}
                  size={20}
                  color={dep.status === "paid" ? moneyColors.plus : CHART_COLORS.bank}
                />
              </View>
              <View style={styles.depositBody}>
                <CoinText
                  coin
                  text={strings.bankDepositLine(dep.amount, dep.ratePercent, dep.payout)}
                  style={styles.depositTitle}
                />
                <View accessible aria-label={moneyStrings.bankProgressA11y(passed, dep.days)}>
                  <ProgressBar value={passed} max={dep.days} color={CHART_COLORS.bank} />
                </View>
                <Text style={styles.muted}>{dep.status === "paid" ? strings.bankPaid : strings.bankDaysLeft(dep.daysLeft)}</Text>
              </View>
            </View>
          );
        })}
        {foldable ? (
          <ShowAllButton
            expanded={showAllDeposits}
            total={deposits.length}
            onPress={() => setShowAllDeposits((was) => !was)}
          />
        ) : null}
      </MoneyCard>
      {feedback ? <FeedbackCard model={feedback} onDismiss={() => setFeedback(null)} /> : null}
    </Screen>
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
  muted: {
    color: colors.subtle,
    fontSize: type.body,
  },
  heroNote: {
    color: moneyColors.heroSubtle,
    fontSize: type.body,
  },
  offers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  offer: {
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: 16,
    borderWidth: 2,
    flexBasis: "40%",
    flexGrow: 1,
    gap: 4,
    minHeight: minTarget,
    paddingHorizontal: 12,
    paddingVertical: spacing.s,
  },
  offerTop: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    paddingRight: 20,
  },
  offerOn: {
    backgroundColor: colors.highlight,
    borderColor: colors.accent,
  },
  offerCheck: {
    position: "absolute",
    right: 6,
    top: 6,
  },
  rate: {
    backgroundColor: CHART_COLORS.bank,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  rateText: {
    color: "#FFFFFF",
    fontFamily: font.pixel,
    fontSize: 12,
  },
  term: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  example: {
    color: colors.subtle,
    fontFamily: font.pixel,
    fontSize: 11,
    lineHeight: 18,
  },
  deposit: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    paddingVertical: 6,
  },
  depositDivider: {
    borderBottomColor: colors.track,
    borderBottomWidth: 1,
  },
  depositIcon: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  depositBody: {
    flex: 1,
    gap: 4,
  },
  depositTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
});

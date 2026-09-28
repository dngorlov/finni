import { useCallback, useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { META_KEYS } from "../../data/metaKeys";
import type { CatalogItemContent } from "../../data/content";
import type { DayState, SavingsView } from "../../data/repositories/gameRepository";
import { CoinText } from "../components/CoinText";
import { ScreenTitle } from "../components/ScreenTitle";
import { BackButton } from "../components/BackButton";
import { BottomSheet } from "../components/BottomSheet";
import { GoalPicker, ownedOnceItemIds } from "../components/GoalPicker";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusStrip } from "../components/StatusStrip";
import { TextButton } from "../components/TextButton";
import { usePlayChrome } from "../navigation/playChrome";
import type { RootStackParamList } from "../navigation/types";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { shopStrings } from "../stringsShop";
import { colors, spacing, type } from "../theme";
import { billsForDay } from "../../core/economy";
import { confirmedLeftover, leftoverAfterTap } from "./planLeftover";
import { PurchaseResult, type PurchaseResultModel } from "./PurchaseResult";
import {
  DrawerHead,
  hiddenFromReader,
  ItemEffects,
  ItemTags,
  SegmentedTabs,
  ShopRow,
  type RowFlags,
} from "./shopParts";

type Props = NativeStackScreenProps<RootStackParamList, "Shop">;
type Tab = "mandatory" | "optional";
/**
 * Bottom drawer for one item. `buy` shows details and the confirm;
 * `goalWarn` is the extra step before spending Баланс on the active Цель.
 */
type Drawer =
  | { name: "closed" }
  | { name: "buy"; item: CatalogItemContent }
  | { name: "goalWarn"; item: CatalogItemContent };

const TABS: readonly { value: Tab; label: string }[] = [
  { value: "mandatory", label: strings.shopMandatoryTab },
  { value: "optional", label: strings.shopOptionalTab },
];

function engineItem(item: CatalogItemContent) {
  return { id: item.id, kind: item.kind, price: item.price, effect: item.effect, also: item.also, once: item.once };
}

export default function ShopScreen({ navigation }: Props) {
  const { game, meta, content } = useSession();
  const { setTab: setPlayTab, focus } = usePlayChrome();
  const [tab, setTab] = useState<Tab>("mandatory");
  const [day, setDay] = useState<DayState | null>(null);
  const [balance, setBalance] = useState(0);
  const [bought, setBought] = useState<string[]>([]);
  const [ownedOnce, setOwnedOnce] = useState<Set<string>>(new Set());
  const [savings, setSavings] = useState<SavingsView | null>(null);
  const [drawer, setDrawer] = useState<Drawer>({ name: "closed" });
  const [receipt, setReceipt] = useState<PurchaseResultModel | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [offerPickGoal, setOfferPickGoal] = useState(false);

  // A new «оплатить Счета» hint turns the list back to Необходимое.
  const [seenFocus, setSeenFocus] = useState(focus);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus?.kind === "shop-bills") setTab("mandatory");
  }

  const load = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const next = game.dayState(profileId);
    // The day can close while Магазин is open (a Урок, Демо-режим); a closed day has no purchases to read.
    const purchasedToday = next.open ? game.purchasedItemIds(profileId, next.dayId) : [];
    setDay(next);
    setBalance(next.available);
    setBought(purchasedToday);
    setSavings(game.savingsState(profileId));
    setOwnedOnce(ownedOnceItemIds(game.listJournal(profileId), content.catalog, purchasedToday));
  }, [content.catalog, game, meta]);

  useFocusEffect(load);

  useEffect(() => game.subscribe(load), [game, load]);

  const closeDrawer = () => {
    setDrawer({ name: "closed" });
  };

  const openMap = () => {
    closeDrawer();
    setPlayTab("map");
    navigation.navigate("Main");
  };

  const openBuy = (item: CatalogItemContent) => {
    setDrawer({ name: "buy", item });
  };

  const activeKey = savings?.activeGoal?.key ?? null;
  const pot = savings?.pot ?? 0;
  const dueIds = new Set(day ? billsForDay(day.n, content.bills).items : []);
  const flagsFor = (item: CatalogItemContent): RowFlags => ({
    due: dueIds.has(item.id),
    goal: activeKey === item.id,
    bought: bought.includes(item.id),
  });

  const items = content.catalog.filter((item) => {
    if (item.kind !== tab) return false;
    if (tab === "optional" && item.once && ownedOnce.has(item.id)) return false;
    return true;
  });
  const tabLeftover = confirmedLeftover(day, tab);
  const tabBucketLabel = tab === "mandatory" ? strings.bucketMandatory : strings.bucketOptional;

  const afterPurchase = (item: CatalogItemContent, fromSavings: boolean, offerGoal: boolean) => {
    load();
    closeDrawer();
    setOfferPickGoal(offerGoal);
    setReceipt({ item, paidFrom: fromSavings ? "savings" : "balance" });
  };

  const buy = (item: CatalogItemContent) => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const today = game.dayState(profileId);
    const wasActiveGoal = game.savingsState(profileId).activeGoal?.key === item.id;
    const result = game.purchase(profileId, today.dayId, engineItem(item));
    if (result.status === "blocked") {
      openBuy(item);
      return;
    }
    afterPurchase(item, false, wasActiveGoal);
  };

  const buyFromSavings = (item: CatalogItemContent) => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const today = game.dayState(profileId);
    const result = game.purchaseFromSavings(profileId, today.dayId, engineItem(item));
    if (result.status === "blocked") {
      setDrawer({ name: "buy", item });
      return;
    }
    afterPurchase(item, true, true);
  };

  const requestBuy = (item: CatalogItemContent) => {
    if (activeKey === item.id) {
      setDrawer({ name: "goalWarn", item });
      return;
    }
    buy(item);
  };

  const planLines = (item: CatalogItemContent): ReactNode => {
    const after = leftoverAfterTap(confirmedLeftover(day, item.kind), item.price);
    if (after == null) return null;
    return (
      <>
        <CoinText coin text={strings.planAfterTap(after)} style={styles.body} />
        {after < 0 ? <CoinText text={strings.planOverWarn} style={styles.warn} /> : null}
      </>
    );
  };

  const drawerBody = (): ReactNode => {
    if (drawer.name === "closed") return null;
    const item = drawer.item;
    const flags = flagsFor(item);
    const head = (
      <DrawerHead item={item}>
        <ItemTags item={item} flags={flags} />
      </DrawerHead>
    );

    if (drawer.name === "goalWarn") {
      return (
        <>
          {head}
          <CoinText text={strings.shopConfirmBuy(item.price)} label={strings.shopConfirmBuyA11y(item.price)} style={styles.section} />
          <CoinText coin text={strings.shopBuyActiveGoalWarn(pot)} style={styles.body} />
          {planLines(item)}
        </>
      );
    }

    const canPay = balance >= item.price;
    return (
      <>
        {head}
        <CoinText text={item.description} style={styles.body} />
        <ItemEffects item={item} announce />
        {canPay ? (
          <CoinText text={strings.shopAfterBuy(balance - item.price)} style={styles.body} />
        ) : (
          <CoinText coin text={strings.shopShortfall(item.price - balance)} style={styles.warn} />
        )}
        {item.once ? <CoinText text={strings.shopOnceLabel} style={styles.body} /> : null}
        {!canPay && flags.goal ? <CoinText text={strings.shopBlockedAlreadyGoal} style={styles.body} /> : null}
        {canPay && !flags.goal ? (
          <View style={styles.confirm}>
            <CoinText text={strings.shopConfirmBuy(item.price)} label={strings.shopConfirmBuyA11y(item.price)} style={styles.section} />
            {planLines(item)}
          </View>
        ) : null}
      </>
    );
  };

  const drawerFooter = (): ReactNode => {
    if (drawer.name === "closed") return null;
    const item = drawer.item;
    if (drawer.name === "goalWarn") {
      return (
        <>
          <PrimaryButton label={strings.shopBuy} onPress={() => buy(item)} />
          <TextButton label={strings.back} onPress={() => setDrawer({ name: "buy", item })} />
        </>
      );
    }
    const isActive = activeKey === item.id;
    const canPayBalance = balance >= item.price;
    const canPayPot = isActive && pot >= item.price;
    if (canPayBalance) {
      return (
        <>
          {canPayPot ? (
            <PrimaryButton label={strings.shopBuyFromSavings} onPress={() => buyFromSavings(item)} />
          ) : (
            <PrimaryButton label={strings.shopBuy} onPress={() => requestBuy(item)} />
          )}
          {canPayPot ? <TextButton label={strings.shopBuy} onPress={() => requestBuy(item)} /> : null}
          <TextButton label={strings.back} onPress={closeDrawer} />
        </>
      );
    }
    return (
      <>
        {canPayPot ? (
          <PrimaryButton label={strings.shopBuyFromSavings} onPress={() => buyFromSavings(item)} />
        ) : (
          <PrimaryButton label={strings.gotIt} onPress={closeDrawer} />
        )}
        <TextButton label={strings.shopDoTask} onPress={openMap} />
        {canPayPot ? <TextButton label={strings.gotIt} onPress={closeDrawer} /> : null}
      </>
    );
  };

  const footer =
    offerPickGoal && drawer.name === "closed" && !receipt ? (
      <PrimaryButton
        label={strings.pickNewGoal}
        onPress={() => {
          setOfferPickGoal(false);
          setPickerOpen(true);
        }}
      />
    ) : null;

  const sheetOpen = drawer.name !== "closed";
  // Behind an open drawer or the receipt the page is out of reach, for touch and for the screen reader.
  const behindSheet = sheetOpen || receipt ? hiddenFromReader : {};

  return (
    <Screen
      header={
        <View {...behindSheet}>
          <StatusStrip />
        </View>
      }
      footer={footer}
    >
      <View {...behindSheet} style={styles.page}>
        <BackButton />
        <ScreenTitle style={styles.title}>{strings.navShop}</ScreenTitle>
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
        <CoinText text={shopStrings.dailyRule} style={styles.body} />
        {tabLeftover != null ? (
          <CoinText
            coin
            label={strings.planLeftoverA11y(tabBucketLabel, tabLeftover)}
            text={tabLeftover >= 0 ? strings.planLeftover(tabLeftover) : strings.planOvershoot(Math.abs(tabLeftover))}
            style={styles.leftover}
          />
        ) : null}
        <View style={styles.list}>
          {items.map((item) => {
            const flags = flagsFor(item);
            return (
              <ShopRow
                key={item.id}
                item={item}
                flags={flags}
                balance={balance}
                marked={focus?.kind === "shop-bills" && flags.due && !flags.bought}
                onOpen={() => openBuy(item)}
                onBuy={() => openBuy(item)}
              />
            );
          })}
        </View>
      </View>
      <BottomSheet visible={sheetOpen} onClose={closeDrawer} footer={drawerFooter()}>
        {drawerBody()}
      </BottomSheet>
      {receipt ? <PurchaseResult model={receipt} onDismiss={() => setReceipt(null)} /> : null}
      <GoalPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onChanged={load} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.m,
  },
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
  warn: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  leftover: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  list: {
    gap: 12,
  },
  confirm: {
    backgroundColor: colors.card,
    borderRadius: 16,
    gap: spacing.s,
    padding: spacing.m,
  },
});

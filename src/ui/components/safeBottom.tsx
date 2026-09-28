import { createContext, useContext, type ReactNode } from "react";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

/**
 * True inside an AppModal. A modal is its own edge-to-edge window, so the root
 * SafeAreaView in FinPetApp no longer keeps it above Android's navigation bar.
 */
const InModalContext = createContext(false);

export function InModal({ children }: { children: ReactNode }) {
  return <InModalContext.Provider value>{children}</InModalContext.Provider>;
}

/**
 * Extra bottom room a footer needs so the system navigation bar (3-button or
 * gesture) never covers its buttons. Zero on a normal screen: the root
 * SafeAreaView already pads it. Zero without a SafeAreaProvider (tests).
 */
export function useBottomInset(): number {
  const inModal = useContext(InModalContext);
  const insets = useContext(SafeAreaInsetsContext);
  return inModal ? (insets?.bottom ?? 0) : 0;
}

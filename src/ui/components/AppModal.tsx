import { Modal, type ModalProps } from "react-native";
import { useModalAnimation } from "../motion";

/** A sheet or card. `animation` is skipped when Настройки has turned motion off. */
export function AppModal({
  animation,
  ...rest
}: Omit<ModalProps, "animationType"> & { animation: "fade" | "slide" }) {
  return <Modal animationType={useModalAnimation(animation)} {...rest} />;
}

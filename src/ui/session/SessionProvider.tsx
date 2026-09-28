import { createContext, useContext, type ReactNode } from "react";
import type { SessionPorts } from "./types";

const SessionContext = createContext<SessionPorts | null>(null);

export function SessionProvider({ ports, children }: { ports: SessionPorts; children: ReactNode }) {
  return <SessionContext.Provider value={ports}>{children}</SessionContext.Provider>;
}

export function useOptionalSession(): SessionPorts | null {
  return useContext(SessionContext);
}

export function useSession(): SessionPorts {
  const value = useOptionalSession();
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}

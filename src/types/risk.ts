export const RISK_LEVELS = [0, 1, 2, 3, 4] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export type RiskId = "stable" | "unsettled" | "classic_dana" | "severe" | "catastrophic";

export type RiskMeta = {
  id: RiskId;
  color: string;
  ink: string;
};

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  0: { id: "stable", color: "#2F6F4E", ink: "#D7F0E2" },
  1: { id: "unsettled", color: "#C9A227", ink: "#1A1503" },
  2: { id: "classic_dana", color: "#D36B2A", ink: "#1A0D04" },
  3: { id: "severe", color: "#C0392B", ink: "#FDECEA" },
  4: { id: "catastrophic", color: "#5B2C6F", ink: "#F5E9FB" },
};

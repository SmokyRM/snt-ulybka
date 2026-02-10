export type OpsFeatureFlag =
  | "qa_mode"
  | "pdf_generation"
  | "bulk_operations"
  | "imports_v2";

type FlagDefinition = {
  env: string;
  defaultValue: boolean;
  description: string;
};

export type ResolvedFlag = {
  key: OpsFeatureFlag;
  enabled: boolean;
  source: "env" | "default" | "forced_off";
  env: string;
  description: string;
};

const DEFINITIONS: Record<OpsFeatureFlag, FlagDefinition> = {
  qa_mode: {
    env: "FEATURE_QA_MODE",
    defaultValue: false,
    description: "QA сценарии и override-инструменты",
  },
  pdf_generation: {
    env: "FEATURE_PDF_GENERATION",
    defaultValue: false,
    description: "Генерация PDF отчётов и документов",
  },
  bulk_operations: {
    env: "FEATURE_BULK_OPERATIONS",
    defaultValue: false,
    description: "Массовые операции в офисном UI/API",
  },
  imports_v2: {
    env: "FEATURE_IMPORTS_V2",
    defaultValue: false,
    description: "Новые импорты v2 (statement/xlsx jobs)",
  },
};

const parseBoolean = (value: string | undefined): boolean | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
};

const isProduction = () => process.env.NODE_ENV === "production";

export const resolveFlag = (flag: OpsFeatureFlag): ResolvedFlag => {
  const definition = DEFINITIONS[flag];
  if (flag === "qa_mode" && isProduction()) {
    return {
      key: flag,
      enabled: false,
      source: "forced_off",
      env: definition.env,
      description: definition.description,
    };
  }

  const parsed = parseBoolean(process.env[definition.env]);
  if (parsed !== null) {
    return {
      key: flag,
      enabled: parsed,
      source: "env",
      env: definition.env,
      description: definition.description,
    };
  }

  return {
    key: flag,
    enabled: definition.defaultValue,
    source: "default",
    env: definition.env,
    description: definition.description,
  };
};

export const isEnabled = (flag: OpsFeatureFlag): boolean => resolveFlag(flag).enabled;

export const listFlags = (): ResolvedFlag[] =>
  (Object.keys(DEFINITIONS) as OpsFeatureFlag[]).map((flag) => resolveFlag(flag));

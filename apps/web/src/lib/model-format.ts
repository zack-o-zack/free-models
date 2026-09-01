export function formatContext(value: number): string {
  if (value <= 0) return "Not listed";
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value / 1_000_000)}M`;
  }
  if (value >= 1_000) {
    return `${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value / 1_000)}K`;
  }
  return new Intl.NumberFormat("en").format(value);
}

export function formatModalities(input: string[], output: string[]): string | null {
  if (input.length === 0 && output.length === 0) return null;

  const formatList = (values: string[]) =>
    values.length > 0
      ? values
          .map((value) =>
            value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          )
          .join(", ")
      : "—";

  return `Input (${formatList(input)}) · Output (${formatList(output)})`;
}

export function formatBenchmarkScore(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}

export function formatBenchmarkRank(value: number): string {
  return `#${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatBenchmarkElo(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

export function formatBenchmarkWinRate(value: number): string {
  return `${formatBenchmarkScore(value)}%`;
}

const designArenaCategoryLabels: Record<string, string> = {
  "3d": "3D",
  agenticgamedev: "Agentic game dev",
  androidnative: "Android native",
  asciiart: "ASCII art",
  codecategories: "Code categories",
  dataviz: "Data viz",
  fullstack: "Full-stack",
  gamedev: "Game dev",
  godotgamedev: "Godot game dev",
  htmlslides: "HTML slides",
  mobileapps: "Mobile apps",
  "python-pptxslides": "Python PPTX slides",
  svg: "SVG",
  uicomponent: "UI component",
  webapps: "Web apps",
  website: "Website",
};

export function formatDesignArenaCategory(category: string): string {
  return (
    designArenaCategoryLabels[category] ??
    category.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function formatDesignArenaName(arena: string): string {
  if (arena === "agents") return "Agents";
  if (arena === "models") return "Models";
  return arena.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const connectionKeyLabels: Record<string, string> = {
  base_url: "Base URL",
  ai_sdk_package: "AI SDK Package",
  endpoint: "Endpoint",
  supported_endpoint_types: "Supported Endpoint Types",
};

export function formatConnectionKey(key: string): string {
  return (
    connectionKeyLabels[key] ??
    key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function formatConnectionValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatConnectionValue).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

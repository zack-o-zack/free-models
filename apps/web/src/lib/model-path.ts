const STEALTH_ID_PREFIX = "stealth:";

export function modelRouteSegments(modelId: string): string[] {
  if (modelId.startsWith(STEALTH_ID_PREFIX)) {
    return ["stealth", modelId.slice(STEALTH_ID_PREFIX.length)];
  }

  return modelId.split("/");
}

export function modelIdFromRouteSegments(segments: string[]): string {
  if (segments[0] === "stealth" && segments.length > 1) {
    return `${STEALTH_ID_PREFIX}${segments.slice(1).join("/")}`;
  }

  return segments.join("/");
}

export function modelHref(modelId: string): string {
  return `/models/${modelRouteSegments(modelId).map(encodeURIComponent).join("/")}`;
}

const STEALTH_ID_PREFIX = "stealth:";
export const MAX_COMPARE_MODELS = 4;

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

export function compareHref(modelIds: string[], highlightBest = false): string {
  const normalizedIds = Array.from(new Set(modelIds)).filter(Boolean).slice(0, MAX_COMPARE_MODELS);
  const segments = normalizedIds.flatMap((id) => modelRouteSegments(id).map(encodeURIComponent));
  const basePath = segments.length > 0 ? `/compare/${segments.join("/")}` : "/compare";
  return highlightBest ? `${basePath}?highlight=true` : basePath;
}

export function parseCompareRouteSegments(
  segments: string[],
  knownModelIds?: Iterable<string>,
): string[] {
  if (!segments || segments.length === 0) return [];

  const knownSet = knownModelIds ? new Set(knownModelIds) : null;
  const decodedSegments = segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  const modelIds: string[] = [];
  let i = 0;
  while (i < decodedSegments.length && modelIds.length < MAX_COMPARE_MODELS) {
    if (knownSet) {
      let matched = false;
      for (const len of [2, 3, 1]) {
        if (i + len <= decodedSegments.length) {
          const candidate = modelIdFromRouteSegments(decodedSegments.slice(i, i + len));
          if (knownSet.has(candidate)) {
            modelIds.push(candidate);
            i += len;
            matched = true;
            break;
          }
        }
      }
      if (matched) continue;
    }

    if (i + 1 < decodedSegments.length) {
      modelIds.push(modelIdFromRouteSegments([decodedSegments[i], decodedSegments[i + 1]]));
      i += 2;
    } else {
      i += 1;
    }
  }

  return Array.from(new Set(modelIds)).slice(0, MAX_COMPARE_MODELS);
}

export function parseComparePathname(pathname: string, knownModelIds?: Iterable<string>): string[] {
  const cleanPath = pathname.replace(/^\/compare\/?/, "");
  if (!cleanPath) return [];
  const segments = cleanPath.split("/").filter(Boolean);
  return parseCompareRouteSegments(segments, knownModelIds);
}

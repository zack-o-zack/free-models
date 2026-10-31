/**
 * Topic taxonomy for the public catalogue, modelled on the OpenRouter use-case categories.
 *
 * Topics describe what a model is good for (programming, translation, health, ...), unlike
 * `model_type`, which describes the task interface (chat, embedding, speech, ...).
 *
 * Method:
 * 1. Rules run at render time, so every new or changed model is tagged without a manual step.
 *    They only apply to language models (`model_type` chat, realtime or translation) and match
 *    explicit claims in our own catalogue data: the reviewed name, the canonical ID and the
 *    source description. No upstream category data is fetched.
 * 2. Curated overrides in `catalogue/topics.json` replace the rule result for one model. Use
 *    them for specialised non-chat models (for example domain embeddings), models without a
 *    description, and false positives. An empty list removes every topic.
 * 3. A model without a clear claim gets no topic. Untagged is better than guessed.
 *
 * Labels equal the title-cased slug, so the site can derive them without a second copy.
 */

export const MODEL_TOPICS = [
  { slug: "programming", label: "Programming" },
  { slug: "agents", label: "Agents" },
  { slug: "math", label: "Math" },
  { slug: "science", label: "Science" },
  { slug: "research", label: "Research" },
  { slug: "translation", label: "Translation" },
  { slug: "roleplay", label: "Roleplay" },
  { slug: "creative_writing", label: "Creative Writing" },
  { slug: "customer_support", label: "Customer Support" },
  { slug: "finance", label: "Finance" },
  { slug: "health", label: "Health" },
  { slug: "legal", label: "Legal" },
] as const;

export type ModelTopic = (typeof MODEL_TOPICS)[number]["slug"];

export const MODEL_TOPIC_SLUGS: ReadonlySet<string> = new Set(MODEL_TOPICS.map(({ slug }) => slug));

const TOPIC_MODEL_TYPES = new Set(["chat", "realtime", "translation"]);

const TOPIC_RULES: readonly { readonly topic: ModelTopic; readonly pattern: RegExp }[] = [
  {
    topic: "programming",
    pattern:
      /\b(?:cod(?:e|er|ers|ing)|codex|codestral|devstral|programming|software (?:engineering|development|delivery)|fill-in-the-middle|refactoring|app development)\b/,
  },
  {
    topic: "agents",
    pattern:
      /\b(?:agents?|agentic|sub-?agents?|tool[- ](?:use|calling)|function calling)\b|\bagent-(?:based|centric|driven)\b/,
  },
  { topic: "math", pattern: /\b(?:math|maths|mathematics|mathematical|theorem proving)\b/ },
  { topic: "science", pattern: /\b(?:science|scientific|stem)\b/ },
  {
    topic: "research",
    pattern:
      /\b(?:deep research|research tasks|research papers|forecasting|evidence synthesis|knowledge-intensive|citations)\b/,
  },
  { topic: "translation", pattern: /\b(?:translat(?:e|es|ion|ions|ing)|nmt)\b/ },
  { topic: "roleplay", pattern: /\b(?:role-?play(?:ing)?|character chat)\b/ },
  {
    topic: "creative_writing",
    pattern: /\b(?:creative (?:writing|finetune)|storytelling|fiction|poetry|copywriting)\b/,
  },
  {
    topic: "customer_support",
    pattern: /\b(?:customer (?:support|service)|call cent(?:er|re)s?|contact cent(?:er|re)s?)\b/,
  },
  { topic: "finance", pattern: /\b(?:finance|financial|fintech)\b/ },
  { topic: "health", pattern: /\b(?:health|healthcare|medical|medicine|clinical|biomedical)\b/ },
  { topic: "legal", pattern: /\b(?:legal|law|lawyers?)\b/ },
];

export interface TopicSource {
  readonly id: string;
  readonly name: string;
  readonly description?: unknown;
  readonly model_type?: unknown;
}

/** Returns topic slugs in taxonomy order. A curated override replaces the rule result. */
export function assignModelTopics(
  model: TopicSource,
  overrides: ReadonlyMap<string, readonly string[]> = new Map(),
): ModelTopic[] {
  const override = overrides.get(model.id);
  if (override) {
    return sortTopics(override);
  }
  if (typeof model.model_type !== "string" || !TOPIC_MODEL_TYPES.has(model.model_type)) {
    return [];
  }

  // Link targets are not claims about the model, e.g. a "/legal/" policy URL.
  const description =
    typeof model.description === "string"
      ? model.description.replace(/\]\([^)]*\)|<[^>]*>|https?:\/\/\S+/g, "]")
      : "";
  const text = `${model.id}\n${model.name}\n${description}`.toLowerCase();
  return sortTopics(
    TOPIC_RULES.filter(({ pattern }) => pattern.test(text)).map(({ topic }) => topic),
  );
}

function sortTopics(topics: readonly string[]): ModelTopic[] {
  const selected = new Set(topics);
  return MODEL_TOPICS.map(({ slug }) => slug).filter((slug) => selected.has(slug));
}

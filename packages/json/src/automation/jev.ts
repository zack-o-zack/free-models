import { z } from "zod";
import { jsonObjectSchema } from "../catalogue/schema.ts";

export const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const DEFAULT_JEV_MODEL = "jev-latest";
export const JEV_MAX_CHOICES = 255;
const JEV_TIMEOUT_MS = 60_000;

export type JevFailure = "missing_key" | "transport" | "http" | "schema";

export class JevUnavailable extends Error {
  readonly reason: JevFailure;
  readonly status: number | undefined;

  constructor(
    reason: JevFailure,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "JevUnavailable";
    this.reason = reason;
    this.status = options.status;
  }
}

const choiceQuestionSchema = z
  .object({
    type: z.literal("choice"),
    instructions: z.string().min(1),
    criteria: z
      .record(z.string().min(1), z.string().min(1))
      .refine((criteria) => Object.keys(criteria).length >= 1)
      .refine((criteria) => Object.keys(criteria).length <= JEV_MAX_CHOICES),
  })
  .strict();

const noulQuestionSchema = z
  .object({
    type: z.literal("noul"),
    instructions: z.union([z.string().min(1), jsonObjectSchema]),
    criteria: z
      .object({ true: z.string().min(1).optional(), false: z.string().min(1).optional() })
      .strict()
      .optional(),
  })
  .strict();

const questionSchema = z.discriminatedUnion("type", [choiceQuestionSchema, noulQuestionSchema]);

const requestSchema = z
  .object({
    model: z.string().min(1),
    state: z.string().min(1),
    questions: z.record(z.string().min(1), questionSchema).refine((questions) => {
      return Object.keys(questions).length >= 1;
    }),
  })
  .strict();

const choiceAnswerSchema = z.object({
  type: z.literal("choice"),
  choice: z.string().min(1),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.string().min(1), z.number().min(0).max(1)),
});

const noulAnswerSchema = z.object({
  type: z.literal("noul"),
  noul: z.number().min(0).max(1),
});

const responseSchema = z.object({
  model: z.string().min(1),
  answers: z.record(
    z.string().min(1),
    z.discriminatedUnion("type", [choiceAnswerSchema, noulAnswerSchema]),
  ),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
});

export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type NoulQuestion = z.infer<typeof noulQuestionSchema>;
export type JevQuestion = z.infer<typeof questionSchema>;
export type JevQuestions = Readonly<Record<string, JevQuestion>>;
export type JevAnswer = z.infer<typeof responseSchema>["answers"][string];
export type JevResponse = z.infer<typeof responseSchema>;

export interface JevClient {
  evaluate(state: string, questions: JevQuestions): Promise<JevResponse>;
}

export interface JevClientOptions {
  readonly apiKey?: string | undefined;
  readonly model?: string | undefined;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: (url: string, init: RequestInit) => Promise<Response>;
}

export function createJevClient(options: JevClientOptions = {}): JevClient {
  const env = options.env ?? process.env;
  const apiKey = (options.apiKey ?? env.TYPESAFE_API_KEY)?.trim();
  const model = options.model?.trim() || env.JEV_MODEL?.trim() || DEFAULT_JEV_MODEL;
  const send = options.fetch ?? ((url, init) => fetch(url, init));

  return {
    async evaluate(state, questions) {
      if (!apiKey) throw new JevUnavailable("missing_key", "TYPESAFE_API_KEY is not set");
      const body = requestSchema.parse({ model, state, questions });

      let response: Response;
      try {
        response = await send(JEV_ENDPOINT, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (error) {
        throw new JevUnavailable("transport", "TypeSafe request failed", { cause: error });
      }
      if (!response.ok) {
        throw new JevUnavailable("http", `TypeSafe responded with HTTP ${response.status}`, {
          status: response.status,
        });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw new JevUnavailable("schema", "TypeSafe response is not valid JSON", { cause: error });
      }
      const parsed = responseSchema.safeParse(payload);
      if (!parsed.success || !answersMatchQuestions(questions, parsed.data.answers)) {
        throw new JevUnavailable("schema", "TypeSafe response does not match the request");
      }
      return parsed.data;
    },
  };
}

function answersMatchQuestions(questions: JevQuestions, answers: JevResponse["answers"]): boolean {
  for (const [id, question] of Object.entries(questions)) {
    const answer = answers[id];
    if (!answer || answer.type !== question.type) return false;
    if (answer.type === "choice" && question.type === "choice") {
      if (!Object.hasOwn(question.criteria, answer.choice)) return false;
    }
  }
  return true;
}

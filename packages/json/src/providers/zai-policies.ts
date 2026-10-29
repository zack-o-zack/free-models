import type { Compliance } from "../catalogue/schema.ts";

/**
 * Compliance policy for Z.ai (GLM) API inference endpoints.
 * Under Z.ai Privacy Policy (Jingsheng Hengxing Technology Pte. Ltd., Singapore):
 * - API requests are processed in real-time and not stored on Z.ai servers.
 * - Customer API prompts and outputs are not used for foundation model training.
 * - Infrastructure and entity jurisdiction are located in Singapore.
 * - Upstream foundation model developer and operator is Zhipu AI ("zhipu").
 */
export const ZAI_COMPLIANCE: Compliance = {
  zdr: true,
  no_training: true,
  data_retention: false,
  countries: ["SG"],
  subprocessors: ["zhipu"],
  description: "Zero data retention and no model training with Singapore hosting",
};

export function resolveZaiCompliance(_modelId: string): Compliance {
  return ZAI_COMPLIANCE;
}

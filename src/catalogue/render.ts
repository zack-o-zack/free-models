import { compareStrings, serializeJson, sortJsonObject } from "./files.ts";
import { type Catalogue, catalogueSchema, type DiscoveredOffer } from "./schema.ts";
import type { CatalogueState } from "./state.ts";

export interface CatalogueRenderer {
  readonly defaultFileName: string;
  readonly mediaType: string;
  render(state: CatalogueState): string;
}

export class JsonCatalogueRenderer implements CatalogueRenderer {
  readonly defaultFileName = "free-models.json";
  readonly mediaType = "application/json";

  render(state: CatalogueState): string {
    return renderCatalogue(buildCatalogue(state));
  }
}

export function renderCatalogue(catalogue: Catalogue): string {
  return serializeJson(catalogueSchema.parse(catalogue));
}

function buildCatalogue(state: CatalogueState): Catalogue {
  const canonicalById = new Map(state.canonicalModels.models.map((model) => [model.id, model]));
  const groupedOffers = new Map<string, Map<string, DiscoveredOffer[]>>();

  for (const [providerId, snapshot] of state.snapshots) {
    const mappings = state.mappings.get(providerId)?.mappings ?? {};

    for (const offer of snapshot.offers) {
      const canonicalId = mappings[offer.model_id];
      if (!canonicalId) {
        throw new Error(`Cannot render unresolved offer ${providerId}/${offer.model_id}`);
      }

      const providerOffers = groupedOffers.get(canonicalId) ?? new Map();
      const offers = providerOffers.get(providerId) ?? [];
      offers.push({
        model_id: offer.model_id,
        connection: sortJsonObject(offer.connection),
        metadata: sortJsonObject(offer.metadata),
      });
      providerOffers.set(providerId, offers);
      groupedOffers.set(canonicalId, providerOffers);
    }
  }

  const models = [...groupedOffers]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([canonicalId, offersByProvider]) => {
      const canonical = canonicalById.get(canonicalId);
      if (!canonical) {
        throw new Error(`Cannot render unknown canonical model ${canonicalId}`);
      }

      const providers = Object.fromEntries(
        [...offersByProvider]
          .sort(([left], [right]) => compareStrings(left, right))
          .map(([providerId, offers]) => [
            providerId,
            {
              offers: offers.sort((left, right) => compareStrings(left.model_id, right.model_id)),
            },
          ]),
      );

      return { id: canonical.id, name: canonical.name, providers };
    });

  return { schema_version: 1, models };
}

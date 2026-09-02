import { canonicalModelWithGeneratedFields } from "./canonical.ts";
import { compareStrings, serializeJson, sortJsonObject } from "./files.ts";
import {
  CATALOGUE_SCHEMA_VERSION,
  type Catalogue,
  catalogueSchema,
  type DiscoveredOffer,
} from "./schema.ts";
import { type CatalogueState, resolvedCatalogueOffers } from "./state.ts";

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

  for (const { canonicalId, provider, offer } of resolvedCatalogueOffers(state)) {
    const providerOffers = groupedOffers.get(canonicalId) ?? new Map();
    const offers = providerOffers.get(provider) ?? [];
    offers.push({
      model_id: offer.model_id,
      connection: sortJsonObject(offer.connection),
      limits: offer.limits,
    });
    providerOffers.set(provider, offers);
    groupedOffers.set(canonicalId, providerOffers);
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
          .map(([providerId, offers]) => {
            const snapshot = state.snapshots.get(providerId);
            if (!snapshot) {
              throw new Error(`Cannot render unknown snapshot provider ${providerId}`);
            }
            return [
              providerId,
              {
                doc: sortJsonObject(snapshot.doc),
                offers: offers.sort((left, right) => compareStrings(left.model_id, right.model_id)),
              },
            ];
          }),
      );

      return {
        ...canonicalModelWithGeneratedFields(canonical, canonical),
        providers,
      };
    });

  return catalogueSchema.parse({ schema_version: CATALOGUE_SCHEMA_VERSION, models });
}

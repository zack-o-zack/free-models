import type { DiscoveredOffer, ProviderDoc } from "../../src/catalogue/schema.ts";
import type { ModelsDevRegistry } from "../../src/providers/models-dev.ts";
import type { ModelProvider } from "../../src/providers/provider.ts";

interface FixtureDocument {
  readonly doc?: ProviderDoc;
  readonly error?: string;
  readonly offers?: readonly DiscoveredOffer[];
}

export class FixtureProvider implements ModelProvider {
  readonly doc: ProviderDoc;

  constructor(
    readonly id: string,
    private readonly fixturePath: string,
    doc: ProviderDoc = {},
  ) {
    this.doc = doc;
  }

  async discover(_modelsDev?: ModelsDevRegistry): Promise<readonly DiscoveredOffer[]> {
    const file = Bun.file(this.fixturePath);
    if (!(await file.exists())) {
      throw new Error(`Fixture does not exist: ${this.fixturePath}`);
    }

    const fixture = (await file.json()) as FixtureDocument;
    if (fixture.error) {
      throw new Error(fixture.error);
    }
    return fixture.offers ?? [];
  }
}

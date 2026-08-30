import type { DiscoveredOffer } from "../../src/catalogue/schema.ts";
import type { ModelProvider } from "../../src/providers/provider.ts";

interface FixtureDocument {
  readonly error?: string;
  readonly offers?: readonly DiscoveredOffer[];
}

export class FixtureProvider implements ModelProvider {
  constructor(
    readonly id: string,
    private readonly fixturePath: string,
  ) {}

  async discover(): Promise<readonly DiscoveredOffer[]> {
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

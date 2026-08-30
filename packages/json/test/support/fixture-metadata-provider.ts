import type {
  ActiveCanonicalModel,
  CanonicalMetadata,
  CanonicalMetadataProvider,
} from "../../src/metadata/provider.ts";

interface FixtureMetadataDocument {
  readonly error?: string;
  readonly results?: Readonly<Record<string, CanonicalMetadata>>;
}

export class FixtureMetadataProvider implements CanonicalMetadataProvider {
  constructor(
    private readonly fixturePath: string,
    private readonly capturePath?: string,
  ) {}

  async enrich(
    models: readonly ActiveCanonicalModel[],
  ): Promise<ReadonlyMap<string, CanonicalMetadata>> {
    if (this.capturePath) {
      await Bun.write(this.capturePath, `${JSON.stringify(models, null, 2)}\n`);
    }

    const fixture = (await Bun.file(this.fixturePath).json()) as FixtureMetadataDocument;
    if (fixture.error) {
      throw new Error(fixture.error);
    }
    return new Map(Object.entries(fixture.results ?? {}));
  }
}

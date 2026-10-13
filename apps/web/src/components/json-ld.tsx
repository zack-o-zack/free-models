import { serializeJsonLd } from "@/lib/seo";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Serialization escapes HTML delimiters from catalogue text.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

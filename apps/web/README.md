This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Catalogue data and builds

Run `bun run build` from `apps/web` (or `bun run --filter web build` from the repository root).
The build first renders `.generated/free-models.json` from the checked-out `packages/json`
catalogue, then generates the static pages from that file. Rendering uses the committed
snapshots and metadata; it does not fetch upstream model data. A render failure stops the build.

Use `bun run build` as the deployment build command, and make the repository files outside
`apps/web` available to the build. SSG no longer depends on the R2 publication workflow or
the CDN cache becoming fresh. The public JSON download URL still points to the CDN.

`bun run dev` also renders the catalogue on startup. After editing catalogue inputs during
development, run `bun run catalogue:render` again or restart the dev server.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

The site is a fully prerendered static export (`output: "export"`), written to `out/`. It is served as an assets-only Cloudflare Worker named `free-models`, configured in `wrangler.jsonc`. The Worker has no main script, so every request is a static asset request. Nothing runs on a server at request time.

Cloudflare Workers Builds, connected to this repository, builds and deploys the site. GitHub Actions do not deploy it.

Configure these settings in the Cloudflare dashboard under Workers & Pages > free-models > Settings > Build:

| Setting                               | Value                               |
| ------------------------------------- | ----------------------------------- |
| Production branch                     | `main`                              |
| Root directory                        | `apps/web`                          |
| Build command                         | `bun run build`                     |
| Deploy command                        | `npx wrangler deploy`               |
| Non-production branch deploy command | `npx wrangler versions upload`      |
| Branch control                        | Enable preview builds               |
| Build variable `NEXT_PUBLIC_SITE_URL` | Public HTTPS origin, without a path |

Do not set `SITE_ENVIRONMENT` in the dashboard. Workers Builds sets `WORKERS_CI_BRANCH`, and any branch other than `main` is treated as a preview: it emits `noindex, nofollow` and `Disallow: /`. Without `NEXT_PUBLIC_SITE_URL`, production output is non-indexable and the SEO check fails.

To serve the built output locally with the same header and redirect rules as Cloudflare, run `bun run build` and then `bun run start`.

`public/_headers` sets cache policies for fingerprinted assets and the content type for the extensionless OpenGraph image. `public/_redirects` serves the compare shell for `/compare/<model>/...` URLs, which are read in the browser, while preserving Next.js route manifests.

## Brand logos

Logos are checked-in images in `public/brand-logos`, with content hashes in their filenames and a one-year immutable cache policy. Pages use these local assets; an unknown brand uses its initials.

To refresh the snapshots explicitly, run `bun run catalogue:render` and then `bun run logos:sync` from `apps/web`. Pass a local catalogue path after the command to use a different `free-models.json`. This maintenance command downloads favicon images; regular builds do not refresh them.

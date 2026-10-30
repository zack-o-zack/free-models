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

The site is a fully prerendered static export (`output: "export"`), written to `out/`. It is hosted on Cloudflare Pages and deployed by GitHub Actions. Nothing runs on a server at request time.

- `.github/workflows/web-preview.yml` builds each pull request from this repository and deploys it to `https://pr-<number>.free-models.pages.dev`. The workflow maintains one pull request comment with the stable preview URL and the immutable deployment URL. Preview builds set `SITE_ENVIRONMENT=preview`, so they emit `noindex, nofollow`. Cloudflare also adds `X-Robots-Tag: noindex` to preview responses. Fork pull requests receive build validation but no credential-backed deployment.
- `.github/workflows/web-production.yml` builds each push to `main`, checks the SEO output, and deploys to the production branch. Explicitly dispatched catalogue publications also dispatch this workflow after a successful publication; this covers automated merges without causing a second deployment for ordinary pushes.

Builds need the repository variable `NEXT_PUBLIC_SITE_URL`, set to the public HTTPS origin without a path. Without it, production output is non-indexable and the SEO check fails. The repository secrets `CLOUDFLARE_API_TOKEN` (with Cloudflare Pages edit permission) and `CLOUDFLARE_ACCOUNT_ID` are required. The token used for catalogue publication needs the Pages permission added if it was previously scoped only to R2.

One-time Cloudflare setup (use a Direct Upload project without a connected Git integration, so Cloudflare and GitHub Actions do not both deploy):

```sh
bunx wrangler pages project create free-models --production-branch main
```

Then attach the production domain in the Cloudflare Pages project settings.

To serve the built output locally with the same header and redirect rules as Cloudflare, run `bun run build` and then `bun run start`.

`public/_headers` sets cache policies for fingerprinted assets and the content type for the extensionless OpenGraph image. `public/_redirects` serves the compare shell for `/compare/<model>/...` URLs, which are read in the browser, while preserving Next.js route manifests.

## Brand logos

Logos are checked-in images in `public/brand-logos`, with content hashes in their filenames and a one-year immutable cache policy. Pages use these local assets; an unknown brand uses its initials.

To refresh the snapshots explicitly, run `bun run catalogue:render` and then `bun run logos:sync` from `apps/web`. Pass a local catalogue path after the command to use a different `free-models.json`. This maintenance command downloads favicon images; regular builds do not refresh them.

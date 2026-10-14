This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Catalogue data and builds

Run `bun run build` from `apps/web` (or `bun run --filter web build` from the repository root).
The build first renders `.generated/free-models.json` from the checked-out `packages/json`
catalogue, then generates the static pages from that file. Rendering uses the committed
snapshots and metadata; it does not fetch upstream model data. A render failure stops the build.

Use `bun run build` as the deployment build command, and make the repository files outside
`apps/web` available to the build. SSG no longer depends on the R2 publication workflow or
the CDN cache becoming fresh. The public JSON download URL still points to the CDN.

The web package declares `json` as a workspace dependency so Vercel rebuilds the site when
catalogue snapshots, mappings, or metadata change. Keep this dependency even though the
renderer runs through a relative CLI path; Vercel cannot infer that dependency from the script.

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Black Box: Movie Night

Black Box: Movie Night is a small movie-night web app designed for three friends: **Britton**, **Nabi**, and **Alex**. Search movies via the movie database, save picks to your Watchlist or mark them as Watched, and then spin the roulette to choose tonight’s option.

The app supports individual ratings for the group and displays consistent “Recommended by” info for everyone.

## Features
- **Movie database** (in-browser search + details using a read access token)
- **Firebase Firestore real-time database** for a shared Watchlist / Watched library
- **Login/auth (3 users)** with persisted sessions in the browser
- **Roulette wheel** with confetti and glitch-style winner celebration

## Local Development

### 1) Prerequisites
- Node.js 18+ (Node 20 recommended)
- A movie database read access token (for in-browser search/details)
- A Firebase project (Firestore enabled)

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment variables
Copy the example file and update values:
```bash
copy .env.local.example .env.local
```

At minimum, set:
- `TMDB_API_KEY`
- `NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN`

Note: the Firebase config is loaded from environment variables in `src/lib/firebase.ts` (the `NEXT_PUBLIC_FIREBASE_*` values).

### 4) Run the dev server
```bash
npm run dev
```

Open:
http://localhost:3000

## Static Export (GitHub Pages)

This repo is configured for Next.js static export (`output: "export"`).

To generate static files locally:
```bash
npm run build
```

The static site will be in the `out/` directory.

## CI/CD Deployment

When you push to `main`, GitHub Actions will:
1. Build the app
2. Generate static files into `out/` (via `output: "export"`)
3. Deploy `out/` to GitHub Pages

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Deployment

This site is hosted on **GitHub Pages** using the `master` branch.

### GitHub Actions Secrets
To allow the GitHub Action workflow to build successfully (Firestore + in-browser movie database), set these repository secrets:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Movie database token
- `NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN`

These values are required because the app uses:
- **Firebase Firestore** for the shared Watchlist / Watched data
- The **movie database API** directly in the browser for search/details

## Visuals

The UI is built with an **Obsidian + futuristic** design language:
- Deep charcoal/navey background (`#0a0a0c`) with subtle **dark purple** glow accents
- Cards and panels use **glass-like blur** and gradient borders
- Motion-heavy interactions throughout the app (including a **staggered card entrance** and a **neon Roulette wheel**)

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

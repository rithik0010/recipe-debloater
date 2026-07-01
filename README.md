# 🍳 Recipe De-Bloater

> Paste any recipe blog URL or YouTube cooking video → Get a clean, structured recipe. No ads, no life stories. **$0/month to run.**

## Live Demo
[recipe-debloater.vercel.app](https://recipe-debloater.vercel.app)

---

## Tech Stack (All Free)

| Service | Purpose | Cost |
|---------|---------|------|
| Next.js 14 on Vercel | Frontend + API | $0 |
| Groq AI (Llama 3.3 70B) | Recipe parsing | $0 (1K/day) |
| Groq Whisper | Video transcription | $0 (1K/day) |
| youtube-transcript | YouTube captions | $0 |
| Jina Reader | Website scraping | $0 (1K/mo) |
| Supabase | Database + Auth | $0 (500MB) |
| Upstash Redis | Caching | $0 (10K/day) |
| Stripe | Payments | $0 (fees only) |

**Total: $0/month until 1,000+ daily users**

---

## Quick Setup

### 1. Get API Keys (all free, no credit card)

| Service | Sign Up | What to Get |
|---------|---------|-------------|
| [Groq](https://groq.com) | 5 min | API Key |
| [Supabase](https://supabase.com) | 5 min | Project URL + Anon Key + Service Role Key |
| [Upstash](https://upstash.com) | 3 min | Redis REST URL + Token |
| [Stripe](https://stripe.com) | 10 min | Test Secret Key + Webhook Secret |

### 2. Run Database Migration

Copy `supabase/migrations/001_initial.sql` and run it in your Supabase SQL Editor.

### 3. Set Environment Variables

```bash
cp .env.local.example .env.local
# Fill in all the keys
```

### 4. Run Locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 5. Deploy to Vercel

```bash
npx vercel
# Set environment variables in Vercel Dashboard → Settings → Environment Variables
```

---

## Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Click the 🍳 icon on any recipe page!

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/page.tsx    # User dashboard
│   ├── recipe/[id]/page.tsx  # Recipe view
│   └── api/
│       ├── extract/route.ts  # POST — main extraction endpoint
│       ├── recipes/route.ts  # GET/DELETE — saved recipes
│       └── webhooks/stripe/  # Stripe webhook
├── components/
│   ├── Navbar.tsx
│   ├── UrlInput.tsx
│   ├── RecipeCard.tsx
│   └── RecipeDisplay.tsx
└── lib/
    ├── services/
    │   ├── scraper.ts        # Jina Reader
    │   ├── videoExtractor.ts # YouTube captions + Groq Whisper
    │   ├── aiParser.ts       # Groq Llama
    │   ├── aiRouter.ts       # Multi-provider fallback
    │   ├── cache.ts          # Upstash Redis
    │   └── db.ts             # Supabase
    └── utils/
        └── urlDetector.ts
```

---

## AI Provider Fallback Chain

When Groq hits its free limit, the app automatically falls back:

```
Groq (1,000/day) → Cerebras (500/day) → Google AI (1,500/day) → NVIDIA (1,000/day)
Total: 4,000+ free extractions/day
```

---

## Free Tier Limits

| Service | Limit | Recipes/Day |
|---------|-------|-------------|
| Groq | 1,000 req/day | 1,000 |
| Vercel | 10,000 invocations/day | 10,000 |
| Supabase | 500MB | ~50,000 recipes |
| Upstash | 10,000 req/day | 5,000 cached |

**Serves ~100 active users/day (3,000/month) completely free.**

---

*Built with Groq, Supabase, and Vercel. Runs for $0/month.*

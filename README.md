# StudyBuddy

A mobile-first PWA for SAT vocabulary learning with voice-based testing.

## Features

- 📚 **Review Mode**: Swipe through flashcards with 384 SAT words
- 🎤 **Test Mode**: Speak definitions and get AI-powered feedback
- 🧠 **Spaced Repetition**: Smart scheduling to optimize learning
- 📊 **Progress Tracking**: Monitor your accuracy and mastery
- 🔐 **Secure Auth**: Sign in with Google via Clerk
- 📱 **PWA**: Install on any device for offline access

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, ShadCN UI
- **Auth**: Clerk
- **Database**: Neon Postgres with Drizzle ORM
- **AI**: Vercel AI SDK (Whisper for STT, gpt-5-nano for grading)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Neon database (free tier works great)
- Clerk account for authentication
- OpenAI API key

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.local.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:
   - `DATABASE_URL` - Your Neon database connection string
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
   - `CLERK_SECRET_KEY` - From Clerk dashboard
   - `OPENAI_API_KEY` - Your OpenAI API key

3. **Set up the database**:
   ```bash
   # Generate migration files
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

4. **Import SAT vocabulary**:
   After starting the dev server, call the import API:
   ```bash
   # Start the dev server first
   npm run dev
   
   # Then in another terminal (requires ADMIN_USER_IDS set):
   curl -X POST http://localhost:3000/api/import/words
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
study-buddy/
├── app/                    # Next.js app directory
│   ├── (marketing)/       # Public landing page
│   ├── (auth)/            # Sign in/up pages
│   ├── (app)/             # Authenticated app (review, test, profile)
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # ShadCN UI components
│   ├── layout/           # Header, nav, etc.
│   ├── review/           # Flashcard components
│   ├── test/             # Test mode components
│   └── profile/          # Stats and profile components
├── lib/                   # Utilities and core logic
│   ├── db/               # Database schema and connection
│   ├── dictionary.ts     # Dictionary API client
│   ├── whisper.ts        # Speech-to-text
│   ├── grader.ts         # AI grading logic
│   └── spaced-repetition.ts  # SR algorithm
└── docs/                  # Documentation
    ├── prd.md            # Product requirements
    ├── plan.md           # Implementation plan
    └── sample-words.json # SAT vocabulary list
```

## Development

### Database Commands

```bash
# Generate migration files from schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all variables from `.env.local.example` in your Vercel project settings.

## Contributing

This is a learning project. Feel free to fork and experiment!

## License

MIT

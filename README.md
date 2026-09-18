# Simple AI Calendar

An AI-powered academic planner built with Next.js, Prisma, Supabase, and Google Gemini AI.

## Features

- **Google Calendar Integration:** Syncs and schedules study sessions directly onto your Google Calendar.
- **Canvas LMS Integration:** Pulls assignments directly from your Canvas courses.
- **Syllabus Parsing:** Upload course syllabuses (PDF) and let Gemini AI automatically extract your assignments, exams, and readings.
- **Deterministic Scheduling Engine:** Automatically finds free time on your calendar and allocates study sessions before your deadlines, respecting your preferences (e.g. "no studying after 8 PM").
- **AI Planner Interface:** Chat with an agentic AI assistant to tweak your schedule ("Schedule all my homework this week", "Move my chemistry study session to tomorrow").

## Setup Instructions

### 1. Database (Supabase PostgreSQL)

1. Create a new project on [Supabase](https://supabase.com/).
2. Get your connection string (Transaction connection pooler string starting with `postgres://...` or `postgresql://...`).
3. Add it to `.env` as `DATABASE_URL`.
4. Run migrations: `npx prisma db push`

### 2. Google OAuth & Calendar API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the **Google Calendar API**.
4. Go to **APIs & Services > Credentials** and create an **OAuth 2.0 Client ID** (Web application type).
   - Add Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Get your Client ID and Client Secret, and add them to `.env`:
   ```env
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```
6. Set `AUTH_SECRET` in your `.env` (generate using `npx auth secret` or a random string).

### 3. Google Gemini AI

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Add it to `.env`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

### 4. Run the app

```bash
npm install
npm run dev
```

### 5. Canvas LMS (Optional)
To use Canvas syncing, generate an access token in your Canvas Account Settings -> Approved Integrations -> New Access Token. Add it in the App's Settings page along with your school's Canvas URL.

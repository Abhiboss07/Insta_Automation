# InstaAuto — Instagram Comment Automation

A full-stack tool that auto-sends DMs when someone comments on your Reels/Posts.
Uses Meta Graph API (primary) + ManyChat API (backup fallback).

---

## Project structure

```
insta-automation/
├── backend/
│   ├── server.js            ← Express server entry point
│   ├── store.js             ← In-memory data (replace with DB later)
│   ├── .env.example         ← Copy this to .env and fill in keys
│   ├── routes/
│   │   ├── webhook.js       ← Receives Instagram events from Meta
│   │   └── api.js           ← Dashboard REST API
│   └── services/
│       ├── meta.js          ← Meta Graph API (send DM, reply comment)
│       ├── manychat.js      ← ManyChat API (backup)
│       └── automation.js   ← Core: match trigger → send message
└── frontend/
    └── src/
        ├── App.js           ← Full React dashboard
        ├── App.css          ← Styles
        └── api.js           ← API calls to backend
```

---

## STEP 1 — Backend setup

```bash
cd backend
cp .env.example .env        # fill in your keys (see below)
npm install
npm run dev                 # runs on http://localhost:4000
```

---

## STEP 2 — Frontend setup

```bash
cd frontend
npm install
npm start                   # runs on http://localhost:3000
```

---

## STEP 3 — Get your Meta API credentials

### 3a. Create a Meta App
1. Go to https://developers.facebook.com
2. Click "My Apps" → "Create App"
3. Choose "Business" type
4. Add "Instagram" product

### 3b. Get your Access Token
1. Go to your App → Instagram → API Setup
2. Connect your Instagram Business Account
3. Generate a long-lived Page Access Token
4. Paste it as `META_ACCESS_TOKEN` in your .env

### 3c. Get your Instagram Account ID
1. Make a GET request: `https://graph.facebook.com/v19.0/me/accounts?access_token=YOUR_TOKEN`
2. Copy the Instagram account ID → paste as `META_INSTAGRAM_ACCOUNT_ID`

### 3d. Register the Webhook
1. In Meta Developer Console → your App → Webhooks
2. Click "Add Subscription" → Object: `instagram`
3. Callback URL: `https://your-domain.com/webhook`
4. Verify Token: same string as `META_WEBHOOK_VERIFY_TOKEN` in .env
5. Subscribe to fields: `comments`, `messages`

> For local testing, use ngrok:
> ```bash
> npm install -g ngrok
> ngrok http 4000
> # Use the https URL as your callback URL
> ```

---

## STEP 4 — Get ManyChat credentials (optional backup)

1. Go to https://manychat.com → Settings → API
2. Generate an API Key → paste as `MANYCHAT_API_KEY`

---

## STEP 5 — Use the dashboard

Open http://localhost:3000

1. **Templates** tab → Create your auto-reply message
2. **Triggers** tab → Set keyword (e.g. "LINK") → Select template
3. **Dashboard** → Watch activity come in live
4. **Settings** → Test your setup with a mock comment

---

## How the auto-send works

```
Someone comments "LINK" on your Reel
        ↓
Meta sends event to your /webhook
        ↓
automation.js finds matching trigger
        ↓
Tries Meta Graph API sendDM()
        ↓ (if fails)
Falls back to ManyChat sendMessage()
        ↓
Logs result in activity feed
Stats updated on dashboard
```

---

## Notes

- Instagram only allows 1 DM per user per post (Meta rule)
- You need an Instagram **Business** or **Creator** account
- Your Instagram must be linked to a Facebook Page
- For production, replace `store.js` with MongoDB or SQLite

---

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express |
| Webhook | Meta Instagram Graph API v19 |
| Backup sender | ManyChat REST API |
| Frontend | React 18 |
| Styling | Custom CSS (dark theme) |
| HTTP client | Axios |

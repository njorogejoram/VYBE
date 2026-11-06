# VYBE 4.0 — YouTube Edition

VYBE is a glassmorphism music-discovery web app with a local music library and YouTube-powered search.

## What's changed
- Search YouTube videos, artist channels, and playlists using the official YouTube Data API v3.
- Songs use YouTube's actual video title and channel name; you choose the exact upload to play.
- Results marked non-embeddable are filtered out. Videos shorter than 90 seconds are filtered out to reduce preview/clip results.
- Full playback happens inside YouTube's official embedded player. VYBE does not extract audio or bypass YouTube playback restrictions.
- Popular artist shortcuts appear before Recently Added and at the top of the Artists page.
- Local audio playback, playlists, likes, lyrics notes, and the existing charcoal/glass theme remain.

## One-time setup: YouTube API key
1. Open Google Cloud Console: https://console.cloud.google.com/
2. Create or select a project.
3. Enable **YouTube Data API v3**.
4. Create an API key under APIs & Services → Credentials.
5. Restrict the key to **YouTube Data API v3**.
6. Under website/referrer restrictions, add your GitHub Pages origin, for example `https://YOUR-USERNAME.github.io/*` (use your actual Pages address).
7. Open VYBE → Explore, paste the key into **Connect YouTube search**, and press **Save key**.

The key is saved only in that browser's local storage. Do not commit a real API key into `script.js` or share it publicly. Because GitHub Pages is a static site, the browser must call YouTube's public API directly; referrer and API restrictions are important.

## Playback notes
- YouTube videos play in the official embedded player, with YouTube's own controls and branding.
- The video must permit embedding and playback in the user's region. Some uploads may still be unavailable, removed, age-restricted, or blocked by the creator.
- YouTube Data API search has a daily quota. Avoid repeated searches while testing.
- YouTube is not a licensed standalone music-streaming catalogue. This integration does not provide a separate audio stream or guarantee that every commercial song is available.

## Deploy
Replace these four files in your GitHub repository:
- `index.html`
- `style.css`
- `script.js`
- `README.md`

Commit to `main`, wait for GitHub Pages to finish deploying, then refresh the website.
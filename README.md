# VYBE 3.2 — Aurora

A responsive music discovery and local listening web app built with HTML, CSS and JavaScript.

## What's new in 3.2
- Aurora colour system: midnight indigo, electric violet, cyan and magenta.
- Stronger iOS-inspired glass surfaces with layered blur, reflections and ambient lighting.
- New featured home hero and more spacious music cards.
- Mobile bottom navigation.
- Animated ambient background and subtle floating glow elements.
- Online music discovery through the Audius API.
- Full-track in-app playback for Audius tracks that are marked streamable by their creators.
- Artist search with artist-track browsing.
- No 30-second iTunes preview playback or Apple Music redirect buttons.
- Keeps local audio file playback and the existing lyrics, queue, favourites and playlist features.

## Run / deploy
This is a static site. Open `index.html` in a modern browser or deploy the four files to GitHub Pages.

## Online full-track playback
- VYBE searches the Audius public music catalogue and streams tracks through Audius' documented `/tracks/{track_id}/stream` endpoint.
- Playback is full-length when the creator has made the track streamable and the stream endpoint is available. Tracks with access restrictions or unavailable streams will not play.
- Audius is an independent-music catalogue; it does not provide the full mainstream commercial catalogues of Spotify or Apple Music.
- Audius read-only API access is available without credentials for ordinary requests; an API key can be added later if higher rate limits are needed. Never put private credentials in this public GitHub Pages repository.
- A network connection is required for online search and streaming.

## Local music
Use **Add music** to play audio files from your device. Browser object URLs are temporary, so reselect local files after refreshing the page.

## Files
- `index.html` — app structure
- `style.css` — Aurora glass UI and responsive styling
- `script.js` — playback, library, and online catalogue search
- `README.md` — project notes


## VYBE 3.3 — Glass Player Refresh

This release refreshes the expanded Now Playing experience using the supplied full-screen player reference:
- Full-screen mobile player with blurred artwork ambience.
- Large album art, title/artist details, lyric preview and seek timeline.
- Glass controls for play/pause, previous/next, shuffle and repeat.
- Volume slider, lyrics and queue shortcuts.
- Artwork-driven ambient background and existing local-file playback.

**Playback provider note:** this release improves the player interface and keeps the current local-file playback engine. Apple Music full-catalogue playback is not activated yet; it requires a MusicKit developer token delivered securely from a backend, listener authorisation, and an eligible Apple Music subscription. Do not put an Apple private signing key or developer token secret in this public GitHub Pages repository.

## Playback source
VYBE 3.4 uses Audius for online full-track playback. The player uses the track's Audius stream endpoint rather than a short preview URL. The app does not bypass artist stream restrictions or claim that unavailable mainstream tracks can be streamed.

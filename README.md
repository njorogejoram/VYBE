# VYBE 3.2 — Aurora

A responsive music discovery and local listening web app built with HTML, CSS and JavaScript.

## What's new in 3.2
- Aurora colour system: midnight indigo, electric violet, cyan and magenta.
- Stronger iOS-inspired glass surfaces with layered blur, reflections and ambient lighting.
- New featured home hero and more spacious music cards.
- Mobile bottom navigation.
- Animated ambient background and subtle floating glow elements.
- Online catalogue search for songs, artists and albums using Apple's iTunes Search API.
- Catalogue song previews when Apple supplies a preview URL, with a nearby Apple Music destination link.
- Keeps local audio file playback and the existing lyrics, queue, favourites and playlist features.

## Run / deploy
This is a static site. Open `index.html` in a modern browser or deploy the four files to GitHub Pages.

## Online catalogue limitations
- Search results and artwork come from Apple's iTunes Search API.
- Preview clips are short promotional samples, not full-song streaming.
- Some results do not have preview clips.
- Online playlist search and full Apple Music playback are not enabled. Apple's full MusicKit / Apple Music API requires developer-token setup and, for personal library features, user authorization. Do not put private signing keys or long-lived secrets in this public static repository.
- A network connection is required for online search.

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

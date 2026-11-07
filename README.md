# VYBE 6.4

Music app: Deezer charts, playlists, albums and artists; full songs through YouTube's own player (your YouTube key), free full songs from Jamendo, 30s previews as a fallback, synced lyrics from LRCLIB.

## What's new in 6.4
- Cover art fills the whole top of the player, edge to edge, with the title laid over it.
- Less empty space between the header and the first line in full-screen lyrics.
- The "tap the line" lyrics hint is gone.
- Login screen: your name (saved on this device), guest mode, and an optional Last.fm connection that shows your top artists on Home.
- Settings > Account to edit, reconnect or sign out.
- Android app: a GitHub Action builds an installable APK (see below).

## Spotify and Deezer
- Spotify only allows apps that are owned by a Premium account, and playback needs Premium. It can't connect on a free plan.
- Deezer is not accepting new app registrations. Deezer charts and artwork still work without a login.
- Last.fm is free: create an API key at last.fm/api, then connect it from the login screen or Settings. Link Spotify to Last.fm (in Last.fm settings) and your Spotify plays show up in VYBE.

## Publish the website (GitHub Pages)
Upload index.html, style.css and app.js to the root of your VYBE repo.

## Build the Android APK
1. Upload everything in this folder to the repo, including package.json, capacitor.config.json and the .github/workflows/build-apk.yml file.
2. Repo > Actions > "Build APK" > Run workflow (about 5 to 10 minutes).
3. When it finishes, open the repo's Releases page, download VYBE-6.4.apk, open it on your phone and allow "install unknown apps" for your browser.
The app opens your live site, so website updates reach the app without rebuilding. It needs internet. Change the address in capacitor.config.json if your site URL is different.

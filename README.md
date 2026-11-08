# VYBE 6.5

A music streaming web app and Android app built with plain HTML, CSS and JavaScript.
Liquid-glass design, full-screen player with synced lyrics, your own playlists, new releases, community playlists and favourite artists.

**Live site:** https://njorogejoram.github.io/VYBE/
**Android app:** download the latest APK from the [Releases](../../releases) page.

## Features
- Home with a time-of-day greeting, recently played, favourite artists, new releases, recommended playlists, mixes and trending songs
- Explore: new releases, music videos, browse by mood (happy, sad, romance and more) and community playlists
- Search pop-up with recent searches; artist pages list the newest releases first
- Full-screen player: edge-to-edge cover art, tap the cover to play or pause, synced lyrics, queue, volume and seek
- Library: Liked songs folder, your own playlists (create, add, remove, save community playlists), and your own audio files
- Settings: playback speed, sleep timer, autoplay, start screen, listening stats, favourite artists and account
- Login page with a profile on your device and an optional Last.fm connection
- Installable on Android through a GitHub Actions build

## Where the music comes from
- Deezer: charts, covers, artists and 30-second previews
- Openverse: free full songs (Creative Commons)
- YouTube (optional, needs your own API key): full songs and music videos through YouTube's official player
- LRCLIB: lyrics
VYBE does not host any music. Spotify and Deezer sign-in are not available because both services currently block new apps like this one.

## Publish the website
Upload `index.html`, `style.css`, `app.js`, `manifest.webmanifest` and the `icon-*.png` files to the root of the repo and turn on GitHub Pages.

## Build the Android APK
1. Upload everything in this folder, including `package.json`, `capacitor.config.json` and `.github/workflows/build-apk.yml`.
2. Repo > Actions > Build APK > Run workflow.
3. When it turns green, open Releases and download `VYBE-6.5.apk`.

## Copyright
Copyright (c) 2026 Joram Ndungu Njoroge. All rights reserved. See `LICENSE`.

# VYBE 3.0 — Home & Player Refresh

A responsive, artwork-led music library and player built with vanilla HTML, CSS and JavaScript. This release refines the home screen into a Spotify-inspired discovery dashboard while keeping an original VYBE visual identity.

## What's improved
- Cleaner home layout with quick-access tiles, recently added music, mood shortcuts and playlists
- Dark graphite surfaces with muted emerald accents and restrained glass effects
- More consistent spacing, typography, card styling and mobile layouts
- Album-cover cards are playable: select a cover to start that track
- Add custom cover art from your device with the **＋ Art** control
- Artwork-driven accent colours with a more selective colour sampler and smooth theme transitions
- Clearer playback controls with synchronized play/pause state, seek bar, elapsed time and duration
- Full-screen Now Playing view, lyrics panel, queue, likes and artist browsing

## Run locally
Open `index.html` in a modern browser. For best results, use a local development server such as VS Code Live Server.

## Deploy on GitHub Pages
1. Open your existing `VYBE` repository.
2. Upload `index.html`, `style.css`, `script.js` and `README.md` to the repository root, replacing the previous versions.
3. Commit the changes to the `main` branch.
4. GitHub Pages should redeploy automatically using your existing Pages settings.

Your site address remains:
`https://njorogejoram.github.io/VYBE/`

## Important notes
- This build plays audio files selected by the user. It does not connect to Spotify, YouTube Music or Apple Music, and it does not provide their catalogues.
- Audio files are loaded locally in the browser. Re-select your files after refreshing the page.
- Lyrics are not fetched from commercial services. Add only lyrics you wrote or have permission to use.
- The layout takes inspiration from common music-app patterns, but uses an original VYBE design rather than copying BitChord or Spotify assets.

## Project files
- `index.html` — app structure
- `style.css` — responsive visual design
- `script.js` — player and library interactions
- `README.md` — setup and project documentation

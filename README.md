# VYBE 2.0

A responsive, charcoal-themed music library and player built with vanilla HTML, CSS and JavaScript.

## Features
- Add and play audio files stored on your device
- Search your collection by song, artist or album
- Artist browsing based on the metadata you enter
- Liked songs and custom playlist creation
- Playback controls: play, pause, next, previous, shuffle, repeat, seek and volume
- Lyrics side panel for lyrics you provide or have permission to use
- Responsive desktop and mobile layouts
- Glassmorphism panels and a muted charcoal / sage / violet palette

## Run locally
Open `index.html` in a modern browser. For best results, use a local development server such as VS Code Live Server.

## Deploy on GitHub Pages
1. Create a repository named `VYBE`.
2. Upload `index.html`, `style.css`, `script.js` and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under Build and deployment, select **Deploy from a branch**.
5. Select `main` and `/(root)`, then save.

Your site will be available at:
`https://njorogejoram.github.io/VYBE/`

## Important notes
- This version plays audio files selected by the user. It does not connect to Spotify, YouTube Music or Apple Music, and it does not provide their catalogues.
- Audio files are loaded locally in the browser. Re-select your files after refreshing the page.
- Lyrics are not fetched from commercial services. Add only lyrics you wrote or have permission to use.
- This is an original interface inspired by common music-app patterns; it does not use the proprietary branding or assets of other services.

## Project files
- `index.html` — app structure
- `style.css` — responsive visual design
- `script.js` — player and library interactions
- `README.md` — setup and project documentation

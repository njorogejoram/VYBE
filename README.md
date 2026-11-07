# VYBE 5.4

Music app that searches YouTube and plays full songs inside VYBE's own player screen. Home has playlists, albums, artists and genres from Deezer; cover art is playable.
Charts, artist pictures and album covers come from Deezer. Lyrics come from lyrics.ovh.

## Set up
1. Create a YouTube Data API v3 key in Google Cloud Console and restrict it to your site address.
2. Open the app, go to Explore, paste the key and tap Save key (stored only in your browser).
3. Tap a song to play. Tap the player bar to open the full player with lyrics.

## Notes
- YouTube's terms require its player to stay visible, so VYBE shows it inside the player screen (and as a small card above the bar).
- Songs from YouTube cannot be downloaded. Music you add under Library > On this device is saved in the browser and can be downloaded again.
- Each trending-song tap uses one YouTube search (100 of your 10,000 free daily quota units).

## Publish on GitHub Pages
Upload index.html, style.css, app.js (and README.md) to the root of your repo.

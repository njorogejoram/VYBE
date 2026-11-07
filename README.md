# VYBE 5.9

Music app with Deezer charts, playlists, albums and artists. Songs play as 30s previews right inside VYBE (no YouTube, no API key). Tap the cover art to play or pause.

## Lyrics
Synced lyrics come from LRCLIB (free). They sit on a blurred copy of the cover and scroll and highlight as the song plays.
Previews are a 30s clip from the middle of a song, so tap the line you hear once to line the lyrics up (it is remembered). Music you add under Library > On this device plays in full and syncs automatically.
You can also paste your own lyrics (plain or .lrc) with Add lyrics.

## Publish on GitHub Pages
Upload index.html, style.css, app.js (and README.md) to the root of your repo.

## Full songs
Free full-length songs come from Jamendo (independent artists). Get a free client ID at devportal.jamendo.com and paste it in Explore. Songs not on Jamendo fall back to 30s Deezer previews.

## YouTube
Paste a YouTube Data API v3 key in Explore. Mainstream songs play in full through YouTube's own player (YouTube requires the video to stay visible, so VYBE shows it small). Each song looked up by name uses one search of your daily quota; songs found by YouTube search use none.

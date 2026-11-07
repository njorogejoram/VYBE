# VYBE 5.1

Music app that searches YouTube and plays full songs through the official YouTube embedded player.
Artist pictures and album covers come from the Deezer API.

## Set up
1. Create a YouTube Data API v3 key in Google Cloud Console.
2. Open the app, go to Explore, paste the key and tap Save key. It stays in your browser only.
3. Search a song, tap it to play. Tap the heart to keep it in Library.

## Notes
- The YouTube player must stay visible (YouTube's terms). It sits above the player bar.
- Songs from YouTube cannot be downloaded for offline use. "On this device" plays your own audio files.
- Restrict your API key to your site address in Google Cloud Console (HTTP referrers).

## Publish on GitHub Pages
Upload these files to your repo, then Settings > Pages > Deploy from branch > main.

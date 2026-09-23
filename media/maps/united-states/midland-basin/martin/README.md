# Map · United States · Midland Basin · Martin field

Upload **`map.png`** (or `map.jpg`) here. It's shown on the dashboard when the selectors are set to **United States · Midland Basin · Martin field**.
If there's no map here, the app falls back to the next level up (field → region → all regions), and then to the built-in placeholder.

8 SRPs are in this area. Your image must cover at least:

| | Latitude / longitude |
|---|---|
| North-west (top-left) | 32.476, -102.156 |
| South-east (bottom-right) | 32.127, -101.742 |

Open this area in Google Maps: https://www.google.com/maps/@32.3015,-101.9490,12z

## Steps
1. Open the link above, choose the Map or Satellite view, and frame the area so every pump location is visible, with some margin.
2. Take a screenshot of just the map area (landscape, about 16:10 works best).
3. **Get the exact corners of your screenshot:** in Google Maps, right-click the spot that is the screenshot's top-left corner. The first line of the menu shows `lat, lng`; click it to copy. Do the same for the bottom-right corner.
4. Edit **`bounds.json`** in this folder: top-left → `north`, `west`; bottom-right → `south`, `east`.
5. Upload `map.png` here and commit.

The SRP markers are placed using `bounds.json`, so if they look shifted, the corner coordinates are off.
Keep Google's attribution visible in the image and follow the Google Maps Platform terms for how you use it.

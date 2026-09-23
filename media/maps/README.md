# Map images

Each folder matches one selection in the dashboard's Country / Region / Oil field selectors.
Put a `map.png` and fill in `bounds.json` in the folders you need. Most demos only need `all-regions` plus the region you walk through.

| Folder | Dashboard selection | SRPs |
|---|---|---|
| `oman/all-regions/` | Oman · All regions | 8 |
| `oman/south-oman/` | Oman · South Oman · All fields | 8 |
| `oman/south-oman/marmul/` | Oman · South Oman · Marmul field | 5 |
| `oman/south-oman/nimr/` | Oman · South Oman · Nimr field | 3 |
| `united-states/all-regions/` | United States · All regions | 56 |
| `united-states/delaware-basin/` | United States · Delaware Basin · All fields | 25 |
| `united-states/delaware-basin/loving/` | United States · Delaware Basin · Loving field | 7 |
| `united-states/delaware-basin/reeves/` | United States · Delaware Basin · Reeves field | 10 |
| `united-states/delaware-basin/ward/` | United States · Delaware Basin · Ward field | 8 |
| `united-states/midland-basin/` | United States · Midland Basin · All fields | 31 |
| `united-states/midland-basin/andrews/` | United States · Midland Basin · Andrews field | 7 |
| `united-states/midland-basin/martin/` | United States · Midland Basin · Martin field | 8 |
| `united-states/midland-basin/midland/` | United States · Midland Basin · Midland field | 9 |
| `united-states/midland-basin/upton/` | United States · Midland Basin · Upton field | 7 |

The app picks the most specific map available: field → region → all regions → built-in placeholder.

# Media for the demo

Everything you upload here shows up in the app automatically. You don't need to change any code.

```
media/
├── maps/                       Map images (e.g. Google Maps), one folder per country / region / field
│   └── united-states/
│       ├── all-regions/        map.png + bounds.json   ← shown when Region = "All regions"
│       ├── delaware-basin/     map.png + bounds.json   ← shown when Region = "Delaware Basin"
│       │   └── reeves/         map.png + bounds.json   ← shown when Oil field = "Reeves"
│       └── ...
└── srps/                       One folder per pump, named exactly like the SRP in the app
    └── SRP-REEVES-041/
        ├── frames/             Raw camera photos  (001.jpg, 002.jpg, ...)
        ├── annotated/          Annotated photos from the model (optional)
        └── video/              One MP4 clip (optional)
```

## How to upload (GitHub website)

1. Open https://github.com/jamprateek/SRPusecase/tree/claude/bold-knuth-3p1m2g/media
2. Click into the folder you want, e.g. `srps` → `SRP-REEVES-041` → `frames`.
3. Click **Add file → Upload files**, then drag your files in.
4. At the bottom, keep **Commit directly to the `claude/bold-knuth-3p1m2g` branch** selected and click **Commit changes**.
5. Tell Claude (or your developer) that the files are in. The app picks them up on the next build.

## Rules of thumb

| What | Format | Size | Naming |
|---|---|---|---|
| Camera photos | JPG or PNG, landscape 16:9 (e.g. 1280×720) | ≈100–300 KB each | `001.jpg`, `002.jpg`, … (sorted by name) |
| Annotated photos | same as photos | same | same numbering as the raw frames they match |
| Video | MP4 (H.264), 10–60 s | **under 25 MB** (GitHub website limit) | any name, e.g. `burst.mp4` |
| Map image | PNG or JPG, landscape | < 5 MB | `map.png` (or `map.jpg`) + `bounds.json` |

- **Any number of photos works.** A burst is 180 frames (60 s at 3 images/sec). If you upload 6 photos they are spread evenly across the burst; 180 photos map 1:1.
- **Pumps without media keep the placeholder**, so you can start with just 2–3 "hero" pumps.
- **Match the story.** Each SRP folder has a README describing the issue the app shows for that pump (e.g. stuck pump → the rod should not move between frames). Pick images that fit.
- Don't upload anything confidential. The repository and the demo may be shared.
- The empty `.gitkeep` files only exist so Git keeps the empty folders. Leave them or delete them, either is fine.

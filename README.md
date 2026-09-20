# ng-collector-vision

Angular 22 component library that wraps [CollectorVision](https://github.com/HanClinto/CollectorVision) — a camera-based TCG card scanner powered by on-device ONNX inference. Scan Magic: The Gathering, Pokémon, Yu-Gi-Oh!, Lorcana, One Piece, and more without any server-side component.

```html
<cv-card-scanner game="magic" (cardDetected)="onCard($event)" />
```

[![npm version](https://img.shields.io/npm/v/%40hippolink%2Fng-collector-vision.svg)](https://www.npmjs.com/package/@hippolink/ng-collector-vision)
[![license: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

**[Live demo →](https://hippolink-app.github.io/ng-collector-vision/)**

---

## Built on CollectorVision

This library is a thin Angular wrapper around **[CollectorVision](https://github.com/HanClinto/CollectorVision)** by [@HanClinto](https://github.com/HanClinto). CollectorVision provides:

- **Cornelius** — ONNX corner-detection model that locates card boundaries in a live video frame
- **Milo** — ONNX embedding model that produces a 128-d fingerprint of the dewarped card crop
- **Catalogs** — Catalog v2: feed-driven FP16 embedding databases (base + incremental updates) published on [GitHub Pages](https://hanclinto.github.io/CollectorVisionCatalog/catalog-v2/catalog-feed-v2.json)
- **scanner.worker.mjs** + **lib/collectorvision-catalog-v2.mjs** — browser Web Worker that runs the full inference pipeline, and the Catalog v2 client it imports (keep `lib/` next to the worker)

CollectorVision is licensed **AGPL-3.0**. Commercial use of the models and catalogs may require a separate license — see the [CollectorVision repository](https://github.com/HanClinto/CollectorVision) for details.

Try the original web demo at **https://hanclinto.github.io/CollectorVision/**

---

## Installation

```bash
npm install @hippolink/ng-collector-vision
```

## Setup

### 1. Copy runtime assets (`angular.json`)

The package ships the CollectorVision Web Worker, WASM runtime, and a Cross-Origin Isolation service worker. Add them to your app's `angular.json` assets so they are copied at build time:

```json
"assets": [
  {
    "glob": "**/*",
    "input": "node_modules/@hippolink/ng-collector-vision/collectorvision",
    "output": "/collectorvision"
  },
  {
    "glob": "coi-serviceworker.js",
    "input": "node_modules/@hippolink/ng-collector-vision/collectorvision",
    "output": "/"
  }
]
```

> **Why?** The scanner runs ONNX models in a Web Worker using multi-threaded WASM (`SharedArrayBuffer`). Most static hosts cannot set the required `COOP`/`COEP` headers server-side; the included service worker injects them transparently.

### 2. Register the service worker (`index.html`)

Add this to your `<head>` **before** the Angular bootstrap script:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/coi-serviceworker.js').then((reg) => {
      if (reg.installing) {
        reg.installing.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated') location.reload();
        });
      }
    });
  }
</script>
```

On the first visit the service worker installs and triggers one reload so the page runs under the required headers. All subsequent visits are seamless.

### 3. Add the model manifest

The ONNX models are shared by every game, so one manifest covers them all:

```
public/collectorvision/assets/manifest.json
```

```json
{
  "version": "2026-09-20",
  "models": {
    "detector": "https://huggingface.co/HanClinto/cornelius/resolve/9280009f5a66f75f952820d9dadb894909b759b7/cornelius-2.12.onnx",
    "milo": "https://huggingface.co/HanClinto/milo/resolve/9bcc5e809e936b8c5630d1e7101aae1de1e76621/model.onnx"
  },
  "model_hashes": {
    "detector": "650da3cc3e9ac778c6951de631f824ec1e63bdabf3aaa39a35d7435af625612e",
    "milo": "bd13d8d60383c69da04dce261f32e93fdaeaa8fd618fbc991e7385f71b3d45df"
  },
  "model_sizes": { "detector": 4407545, "milo": 5191100 },
  "detector": {
    "family": "cornelius",
    "input_size": 384,
    "preprocess": "imagenet-rgb",
    "outputs": { "corners": "corners", "presence": "presence", "sharpness": "sharpness" }
  },
  "catalog": { "dims": 128 }
}
```

`model_hashes` are used as the IndexedDB cache key, so a new model file always busts the cache. Pin the model URLs to a Hugging Face revision as above (the [CollectorVision model registry](https://huggingface.co/HanClinto/CollectorVision/blob/main/registry.json) lists the current ones) — `resolve/main/…` can change under you.

**Catalogs are not configured here.** The worker loads them by `game` (and `source`) from the [Catalog v2 feed](https://hanclinto.github.io/CollectorVisionCatalog/catalog-v2/catalog-feed-v2.json) — a FP16 base snapshot plus incremental updates, cached in IndexedDB. Supported `game` values:

| `game`                                                                        | Source(s)               | Card ID                      |
| ----------------------------------------------------------------------------- | ----------------------- | ---------------------------- |
| `magic`                                                                       | `tcgplayer`, `scryfall` | TCGplayer id / Scryfall UUID |
| `pokemon`, `pokemon-japan`, `yugioh`, `lorcana`, `onepiece`, `fab`, `digimon` | `tcgplayer`             | TCGplayer id                 |
| `swu`, `union-arena`, `gundam`, `riftbound`                                   | `tcgplayer`             | TCGplayer id                 |

Set the `source` input to `scryfall` (Magic only) to get Scryfall UUIDs and an oracle ID for grouping printings. The default is `tcgplayer`.

Models (~10 MB) and the catalog (~1–30 MB depending on game) download once and are cached in IndexedDB. Subsequent launches are instant, even offline.

### 4. Provide HTTP client (`app.config.ts`)

```ts
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // ...
  ],
};
```

---

## Usage

```html
<cv-card-scanner game="magic" (cardDetected)="onCard($event)" />
```

```ts
import { CardScannerComponent, type CardDetection } from 'ng-collector-vision';

@Component({
  imports: [CardScannerComponent],
  // ...
})
export class MyComponent {
  onCard(detection: CardDetection): void {
    console.log(detection.cardId, detection.score);
  }
}
```

### Inputs

| Input                 | Type                | Default       | Description                                                                                    |
| --------------------- | ------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `game`                | `CardScannerGame`   | **required**  | Active game family. Changing this restarts the scanner.                                        |
| `source`              | `CardScannerSource` | `'tcgplayer'` | Catalog source (`'scryfall'` is Magic only). Read when the scanner starts.                     |
| `minCornerConfidence` | `number`            | `0.02`        | Corner-detector gate threshold `[0–1]`. Lower = more sensitive. Applied live without restart.  |
| `minAcceptanceScore`  | `number`            | `0.5`         | Minimum embedding similarity to pass a frame to the confirmation bucket `[0–1]`. Applied live. |
| `reviewThreshold`     | `number`            | `0.8`         | Score below which a confirmed detection is flagged `needsReview` `[0–1]`. Applied live.        |
| `consecutiveMatches`  | `number`            | `2`           | Consecutive matching frames needed before emitting `cardDetected`. Applied live.               |
| `cooldownMs`          | `number`            | `3500`        | Cooldown (ms) before the same card can be detected again. Applied live.                        |
| `groupBySecondaryId`  | `boolean`           | `true`        | Group alternate printings of the same card by oracle/secondary ID. Applied live.               |
| `scanIntervalMs`      | `number`            | `900`         | Interval between frame captures (ms). Minimum `100`. Applied live.                             |
| `playSounds`          | `boolean`           | `true`        | Enable audio feedback. Set `false` for silent mode.                                            |
| `confidentSoundUrl`   | `string \| null`    | `null`        | WAV URL for confident-scan sound. `null` → synthesized chime.                                  |
| `uncertainSoundUrl`   | `string \| null`    | `null`        | WAV URL for uncertain-scan sound. `null` → synthesized blip.                                   |

### Outputs

| Output          | Payload         | Description                                                                                     |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `cardDetected`  | `CardDetection` | Fired on every confirmed detection (after consecutive-match streak + cooldown).                 |
| `scannerClosed` | `void`          | Fired when `close()` is called, or when the component is destroyed while the scanner is active. |

### Methods

| Method          | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `close()`       | Stop the scanner, release camera + worker, emit `scannerClosed`. |
| `openScanner()` | Re-open after an error or explicit `close()`.                    |

### `CardDetection`

```ts
interface CardDetection {
  cardId: string; // TCGplayer product id or Scryfall UUID, per `source`
  cardName: string | null; // Name from the catalog record
  secondaryId: string | null; // Oracle ID (Scryfall source only)
  secondaryIdField: string | null; // Name of the secondary ID field, e.g. "scryfallOracleId"
  score: number; // Cosine similarity [0, 1]
  confidence: number; // Corner-detector confidence
  corners: [number, number][]; // Normalized corner coordinates
  sharpness: number | null;
  orientation: 'upright' | 'rotated_180' | null;
  needsReview: boolean; // score < reviewThreshold — consumer should flag for verification
  detectedAt: string; // ISO 8601 timestamp
}
```

### `ScannerStatus`

The `status` signal on the component exposes the scanner's current lifecycle state:

```ts
type ScannerStatus =
  | 'idle' // not started or after close()
  | 'requesting-permission' // waiting for getUserMedia permission
  | 'downloading' // fetching models + catalog
  | 'scanning' // live, emitting cardDetected
  | 'error'; // unrecoverable — call openScanner() to retry
```

### Asset base path

`CV_ASSET_BASE_PATH` controls where the model manifest and sound files are fetched from. Override it to serve these from your own platform or CDN:

```ts
import { CV_ASSET_BASE_PATH } from '@hippolink/ng-collector-vision';

providers: [{ provide: CV_ASSET_BASE_PATH, useValue: 'https://platform.example.com' }];
```

The scanner worker and vendor files always load from the **local** origin — cross-origin workers require explicit CORS headers that most hosts don't provide.

### Cloudflare Pages (and other hosts with a per-file size limit)

The bundled ONNX Runtime WASM binary is ~27 MB. Cloudflare Pages has a 25 MB per-file limit. Redirect the WASM to jsDelivr using the pre-built constant:

```ts
import { CV_WASM_BASE_PATH, ORT_CDN_WASM_PATH } from '@hippolink/ng-collector-vision';

providers: [{ provide: CV_WASM_BASE_PATH, useValue: ORT_CDN_WASM_PATH }];
```

Or point at your own R2 bucket:

```ts
providers: [{ provide: CV_WASM_BASE_PATH, useValue: 'https://pub-xxx.r2.dev/wasm/' }];
```

---

## Development

```bash
# 1. Build the library (watch mode)
ng build ng-collector-vision --watch

# 2. Serve the demo (new terminal)
ng serve demo
```

The demo at `projects/demo/` enriches detections via the Scryfall public API for Magic cards.

```bash
# Run library unit tests
ng test ng-collector-vision

# Format check
npx prettier --check .
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full contribution guidelines.

## Upgrading from 0.1.x

0.2.0 moves to CollectorVision **Catalog v2** (the models are unchanged):

- Replace the per-game `assets/<game>/manifest.json` files with a single `assets/manifest.json` (see setup step 3). Catalogs are no longer named in the manifest.
- Copy `collectorvision/lib/` next to `scanner.worker.mjs` (the worker imports the Catalog v2 client from it). The default `**/*` glob does this; a hand-picked asset list must include `lib/**`.
- Allow `https://hanclinto.github.io` in your CSP `connect-src` (the catalog feed) alongside Hugging Face.
- `CardDetection` gains `cardName`. `cardId` is unchanged for the default `tcgplayer` source; use `[source]="'scryfall'"` for Magic Scryfall UUIDs. Oracle-id grouping only applies to the Scryfall source.
- `CardScannerGame` gains `pokemon-japan`, `yugioh`, `fab`, `digimon`, `swu`, `union-arena`, `gundam`, `riftbound`.

---

## How it works

1. **Manifest** — fetched from `/collectorvision/assets/manifest.json`
2. **Models** — Cornelius 2.12 (corner detector) + Milo (embedder) ONNX models fetched from Hugging Face and cached in IndexedDB
3. **Catalog** — Catalog v2 snapshot for the `game` fetched from the feed (checksum-verified, FP16), updated incrementally and cached in IndexedDB
4. **Worker** — every `scanIntervalMs` (default 900 ms) a video frame is sent to `scanner.worker.mjs` via `postMessage`
5. **Confirmation** — `consecutiveMatches` (default 2) matching frames trigger a `cardDetected` event, with a `cooldownMs` (default 3.5 s) cooldown before the same card fires again

---

## License

This package is licensed under **[AGPL-3.0](LICENSE)**.

It bundles runtime assets from [CollectorVision](https://github.com/HanClinto/CollectorVision) (AGPL-3.0, by [@HanClinto](https://github.com/HanClinto)) — the models, worker script, and catalogs that power the scanning pipeline. Because those components are AGPL, the copyleft extends to this package as a whole.

**Commercial use** of the CollectorVision models and catalogs may require a separate commercial license. Contact HanClinto via the [CollectorVision repository](https://github.com/HanClinto/CollectorVision).

The **onnxruntime-web** WASM runtime bundled in `collectorvision/vendor/` is licensed separately under the [MIT License](https://github.com/microsoft/onnxruntime/blob/main/LICENSE).

export const SCAN_INTERVAL_MS = 900;
export const CONSECUTIVE_MATCHES = 2;
export const COOLDOWN_MS = 3500;
export const REVIEW_THRESHOLD = 0.8;
export const MIN_CORNER_CONFIDENCE = 0.02;
export const CORNER_OVERLAY_COLOUR = '#22c55e';

export const WORKER_FILENAME = 'scanner.worker.mjs';

/** Cap the longest edge of an uploaded image before handing it to the worker. */
export const MAX_IMAGE_LONG_EDGE_PX = 2000;

import type { CardScannerGame } from './types';

export const GAME_OPTIONS: { value: CardScannerGame; label: string }[] = [
  { value: 'magic', label: 'Magic' },
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'pokemon-japan', label: 'Pokémon (Japan)' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'fab', label: 'Flesh and Blood' },
  { value: 'digimon', label: 'Digimon' },
  { value: 'swu', label: 'Star Wars: Unlimited' },
  { value: 'union-arena', label: 'Union Arena' },
  { value: 'gundam', label: 'Gundam' },
  { value: 'riftbound', label: 'Riftbound' },
];

/** Games whose id differs from the Catalog v2 game alias. Everything else passes through. */
export const CATALOG_GAME_ALIASES: Partial<Record<CardScannerGame, string>> = {
  magic: 'mtg',
};

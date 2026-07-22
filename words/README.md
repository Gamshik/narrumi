# Bundled vocabulary data

- `oxford-5000.json` is the canonical English vocabulary seed used by the app.
- `oxford-5000-ru.json` is a compact ID-to-Russian-translation sidecar used for offline Story Words selection. Most entries are derived from the FreeDict English-Russian dictionary; unmatched spelling and derived-form entries use a generated machine-translation fallback.

The FreeDict-derived portion is distributed under Creative Commons Attribution-ShareAlike 3.0. The complete license text is in `LICENSE.freedict-eng-rus.txt`. Source: [FreeDict English-Russian dictionary](https://download.freedict.org/generated/eng-rus/), release `2025.11.23`.

Run `node scripts/build-russian-vocabulary.mjs` from the repository root to rebuild both the canonical sidecar and its Expo-bundled copy.

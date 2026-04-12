import type { State } from ".";

// `Project` is the root state object for a session — everything that belongs
// in the `.dcg` file plus the currently-selected media id. Registered in the
// Store alongside `History` by `newSession()` in `../Session.ts`.
//
// `MediaEntry` intentionally stores only the fields that are not derivable
// from `path`. `name`, `url`, and `duration` are runtime-only and live
// outside the proxy:
//   - name = basename(path)     — computed by consumers at read time
//   - url = mediaUrl(path)      — computed by consumers at read time
//   - duration                  — `useState<number | undefined>` inside Frame
//
// Grade slider values are plain numbers. No `Transient<V>` wrapper — drag
// coalescing is handled by `history.mutate`'s `transactionKey` merging, not
// by a second "transient" field on each slider. See design-state.md for the
// rationale.

export type MediaKind = "image" | "video";

export interface GradeProps {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
}

export const NEUTRAL_PROPS: GradeProps = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
};

export interface MediaEntry {
  id: string;
  path: string;
  kind: MediaKind;
  /** For videos: currently-displayed frame time in seconds. Unused for images. */
  frameTime: number;
  props: GradeProps;
}

export interface Project extends State {
  media: Array<MediaEntry>;
  /**
   * Id of the currently-selected media entry. Excluded from history (see
   * design-state.md → Scope of Undoable State) and excluded from `.dcg`
   * serialization.
   */
  selectedId: string | null;
}

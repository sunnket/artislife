// Shared focus state for the hero zoom (Section 6). The choreography sets
// selectedId and animates progress 0->1; Artwork reads it to boost its own
// spotlight + emissive when it is the focused piece.
export const focus = {
  selectedId: null as number | null,
  progress: 0,
}

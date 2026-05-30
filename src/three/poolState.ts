// Slot index → currently-assigned objectID, written by the recycling ArtworkPool
// and read by the CameraRig (for nav.nearestId). Length === number of rail slots.
export const poolSlots: (number | null)[] = []

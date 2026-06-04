/** Apply a reorder of visible pinned rows into the full pinned-id list. */
export function applyVisiblePinReorder(
  fullPinned: number[],
  visibleTopToBottom: number[],
  newVisibleOrder: number[],
) {
  const idxs: number[] = [];
  fullPinned.forEach((id, i) => {
    if (visibleTopToBottom.includes(id)) idxs.push(i);
  });
  if (idxs.length !== newVisibleOrder.length) return fullPinned;
  const out = [...fullPinned];
  idxs.forEach((pos, j) => {
    const nextId = newVisibleOrder[j];
    if (nextId !== undefined) out[pos] = nextId;
  });
  return out;
}

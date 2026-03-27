import { faceOrder, type CubeState, type RenderCubie } from "@/domain/cube/types";
import { faceRowColToWorld, stickerIndexToAddress } from "@/domain/cube/coordinates";

export function toRenderCubies(state: CubeState): RenderCubie[] {
  const cubieMap = new Map<string, RenderCubie>();

  for (let index = 0; index < state.stickers.length; index += 1) {
    const address = stickerIndexToAddress(state.dimension, index);
    const { position } = faceRowColToWorld(state.dimension, address.face, address.row, address.col);
    const id = `${position.x},${position.y},${position.z}`;
    const current = cubieMap.get(id);

    cubieMap.set(id, {
      id,
      position,
      stickers: {
        ...(current?.stickers ?? {}),
        [address.face]: state.stickers[index]
      }
    });
  }

  return [...cubieMap.values()].sort((left, right) => {
    for (const axis of ["x", "y", "z"] as const) {
      const delta = left.position[axis] - right.position[axis];
      if (delta !== 0) {
        return delta;
      }
    }

    for (const face of faceOrder) {
      const leftColor = left.stickers[face] ?? -1;
      const rightColor = right.stickers[face] ?? -1;
      if (leftColor !== rightColor) {
        return leftColor - rightColor;
      }
    }

    return 0;
  });
}

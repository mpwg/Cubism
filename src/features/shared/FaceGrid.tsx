import { cubeColorHex, cubeColorLabels, CubeColor, type FaceCapture } from "@/domain/cube/types";

interface FaceGridProps {
  readonly capture: FaceCapture;
  readonly editable?: boolean;
  readonly selectedColor?: CubeColor;
  readonly highlightedIndices?: readonly number[];
  readonly onStickerClick?: (index: number) => void;
}

export function FaceGrid({ capture, editable = false, selectedColor, highlightedIndices = [], onStickerClick }: FaceGridProps) {
  return (
    <div
      className="face-grid"
      style={{
        gridTemplateColumns: `repeat(${capture.dimension}, minmax(0, 1fr))`
      }}
    >
      {capture.stickers.map((sticker) => {
        const isSelected = editable && selectedColor !== undefined && sticker.color === selectedColor;
        const isHighlighted = highlightedIndices.includes(sticker.index);
        return (
          <button
            key={sticker.index}
            type="button"
            className={`face-grid__sticker${editable ? " face-grid__sticker--editable" : ""}${isSelected ? " face-grid__sticker--selected" : ""}${isHighlighted ? " face-grid__sticker--highlighted" : ""}`}
            style={{
              backgroundColor: cubeColorHex[sticker.color]
            }}
            aria-label={`${capture.face} ${sticker.index + 1}: ${cubeColorLabels[sticker.color]}`}
            title={`${cubeColorLabels[sticker.color]} (${Math.round(sticker.confidence * 100)}%)`}
            onClick={onStickerClick ? () => onStickerClick(sticker.index) : undefined}
            disabled={!editable}
          >
            <span>{Math.round(sticker.confidence * 100)}</span>
          </button>
        );
      })}
    </div>
  );
}

import { useRef } from "react";
import { Canvas, extend, useFrame, useThree, type ThreeElement, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  faceRowColToStickerIndex,
  getFaceNormal,
  isPositionAffectedByMove,
  worldToStickerAddress
} from "@/domain/cube/coordinates";
import { cubeColorHex, type CubeState, type Face, type Move, type RenderCubie } from "@/domain/cube/types";
import { toRenderCubies } from "@/domain/cube/render";

extend({ OrbitControls: ThreeOrbitControls });

declare module "@react-three/fiber" {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof ThreeOrbitControls>;
  }
}

interface CubeViewportProps {
  readonly state: CubeState;
  readonly activeMove?: Move;
  readonly editable?: boolean;
  readonly onStickerSelect?: (selection: { face: Face; index: number }) => void;
}

const faceByMaterialIndex = ["R", "L", "U", "D", "F", "B"] as const;

function CameraControls() {
  const controlsRef = useRef<ThreeOrbitControls | null>(null);
  const { camera, gl } = useThree();

  useFrame(() => {
    controlsRef.current?.update();
  });

  return (
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={7}
      maxDistance={18}
    />
  );
}

function Cubie({
  cubie,
  dimension,
  activeMove,
  editable = false,
  onStickerSelect
}: {
  cubie: RenderCubie;
  dimension: number;
  activeMove?: Move;
  editable?: boolean;
  onStickerSelect?: (selection: { face: Face; index: number }) => void;
}) {
  const highlight = activeMove ? isPositionAffectedByMove(dimension as 3 | 4, cubie.position, activeMove) : false;
  const base = highlight ? "#1f8dff" : "#171717";
  const faceMaterials = [
    cubie.stickers.R !== undefined ? cubeColorHex[cubie.stickers.R] : base,
    cubie.stickers.L !== undefined ? cubeColorHex[cubie.stickers.L] : base,
    cubie.stickers.U !== undefined ? cubeColorHex[cubie.stickers.U] : base,
    cubie.stickers.D !== undefined ? cubeColorHex[cubie.stickers.D] : base,
    cubie.stickers.F !== undefined ? cubeColorHex[cubie.stickers.F] : base,
    cubie.stickers.B !== undefined ? cubeColorHex[cubie.stickers.B] : base
  ];

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!editable || !onStickerSelect) {
      return;
    }

    const materialIndex = event.face?.materialIndex;
    if (materialIndex === undefined) {
      return;
    }

    const face = faceByMaterialIndex[materialIndex];
    if (!face || cubie.stickers[face] === undefined) {
      return;
    }

    const address = worldToStickerAddress(dimension as 3 | 4, cubie.position, getFaceNormal(face));
    event.stopPropagation();
    onStickerSelect({
      face,
      index: faceRowColToStickerIndex(dimension as 3 | 4, face, address.row, address.col) % (dimension * dimension)
    });
  }

  return (
    <mesh
      position={[cubie.position.x * 1.08, cubie.position.y * 1.08, cubie.position.z * 1.08]}
      scale={highlight ? 1.02 : 1}
      onClick={handleClick}
    >
      <boxGeometry args={[0.92, 0.92, 0.92]} />
      {faceMaterials.map((color, index) => (
        <meshStandardMaterial key={`${cubie.id}-${index}`} attach={`material-${index}`} color={color} metalness={0.08} roughness={0.42} />
      ))}
    </mesh>
  );
}

export function CubeViewport({ state, activeMove, editable = false, onStickerSelect }: CubeViewportProps) {
  const cubies = toRenderCubies(state);

  return (
    <div className="cube-viewport">
      <Canvas camera={{ position: [7.5, 7.5, 9], fov: 34 }}>
        <color attach="background" args={["#0f100d"]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[7, 9, 8]} intensity={2.1} />
        <directionalLight position={[-5, -7, -4]} intensity={0.55} color="#8ea6ff" />
        <group rotation={[0.55, -0.72, 0.08]}>
          {cubies.map((cubie) => (
            <Cubie
              key={cubie.id}
              cubie={cubie}
              dimension={state.dimension}
              activeMove={activeMove}
              editable={editable}
              onStickerSelect={onStickerSelect}
            />
          ))}
        </group>
        <CameraControls />
      </Canvas>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, extend, useFrame, useThree, type ThreeElement, type ThreeEvent } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  faceRowColToStickerIndex,
  getFaceNormal,
  isPositionAffectedByMove,
  worldToStickerAddress
} from "@/domain/cube/coordinates";
import { invertMove } from "@/domain/cube/move";
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
  readonly onStickerSelect?: (selection: { face: Face; index: number; clientX: number; clientY: number }) => void;
  readonly playbackMoveIndex?: number;
  readonly playbackMoves?: readonly Move[];
  readonly playbackSpeed?: number;
}

interface PlaybackAnimation {
  readonly move: Move;
  readonly fromState: CubeState;
  readonly durationMs: number;
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
  onStickerSelect?: (selection: { face: Face; index: number; clientX: number; clientY: number }) => void;
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
      index: faceRowColToStickerIndex(dimension as 3 | 4, face, address.row, address.col) % (dimension * dimension),
      clientX: event.nativeEvent.clientX,
      clientY: event.nativeEvent.clientY
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

function Scene({
  state,
  cubies,
  activeMove,
  editable,
  onStickerSelect,
  animation,
  onAnimationComplete
}: {
  state: CubeState;
  cubies: RenderCubie[];
  activeMove?: Move;
  editable: boolean;
  onStickerSelect?: (selection: { face: Face; index: number; clientX: number; clientY: number }) => void;
  animation: PlaybackAnimation | null;
  onAnimationComplete: () => void;
}) {
  const rotatingLayerRef = useRef<Group | null>(null);
  const progressRef = useRef(0);
  const fromCubies = useMemo(() => (animation ? toRenderCubies(animation.fromState) : []), [animation]);
  const animatedCubies = useMemo(
    () => (animation ? fromCubies.filter((cubie) => isPositionAffectedByMove(animation.fromState.dimension, cubie.position, animation.move)) : []),
    [animation, fromCubies]
  );
  const staticCubies = useMemo(
    () => (animation ? cubies.filter((cubie) => !isPositionAffectedByMove(state.dimension, cubie.position, animation.move)) : cubies),
    [animation, cubies, state.dimension]
  );

  useEffect(() => {
    progressRef.current = 0;
    if (!animation && rotatingLayerRef.current) {
      rotatingLayerRef.current.setRotationFromAxisAngle(identityAxis, 0);
    }
  }, [animation]);

  useFrame((_, delta) => {
    if (!animation || !rotatingLayerRef.current) {
      return;
    }

    progressRef.current = Math.min(progressRef.current + (delta * 1000) / animation.durationMs, 1);
    const angle = moveToRotationRadians(animation.move) * easeInOutCubic(progressRef.current);
    rotatingLayerRef.current.setRotationFromAxisAngle(toThreeVector(getFaceNormal(animation.move.face)), angle);

    if (progressRef.current >= 1) {
      rotatingLayerRef.current.setRotationFromAxisAngle(identityAxis, 0);
      onAnimationComplete();
    }
  });

  return (
    <>
      <color attach="background" args={["#0f100d"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[7, 9, 8]} intensity={2.1} />
      <directionalLight position={[-5, -7, -4]} intensity={0.55} color="#8ea6ff" />
      <group rotation={[0.55, -0.72, 0.08]}>
        {staticCubies.map((cubie) => (
          <Cubie
            key={cubie.id}
            cubie={cubie}
            dimension={state.dimension}
            activeMove={animation ? undefined : activeMove}
            editable={editable}
            onStickerSelect={onStickerSelect}
          />
        ))}

        <group ref={rotatingLayerRef}>
          {animatedCubies.map((cubie) => (
            <Cubie
              key={cubie.id}
              cubie={cubie}
              dimension={animation?.fromState.dimension ?? state.dimension}
              activeMove={activeMove}
              editable={false}
            />
          ))}
        </group>
      </group>
    </>
  );
}

const identityAxis = new Vector3(0, 1, 0);

export function CubeViewport({
  state,
  activeMove,
  editable = false,
  onStickerSelect,
  playbackMoveIndex,
  playbackMoves,
  playbackSpeed = 1
}: CubeViewportProps) {
  const [animation, setAnimation] = useState<PlaybackAnimation | null>(null);
  const cubies = useMemo(() => toRenderCubies(state), [state]);
  const previousStateRef = useRef(state);
  const previousMoveIndexRef = useRef<number | undefined>(playbackMoveIndex);

  useEffect(() => {
    const previousMoveIndex = previousMoveIndexRef.current;

    if (
      playbackMoveIndex !== undefined &&
      previousMoveIndex !== undefined &&
      playbackMoves &&
      Math.abs(playbackMoveIndex - previousMoveIndex) === 1
    ) {
      const move =
        playbackMoveIndex > previousMoveIndex
          ? playbackMoves[previousMoveIndex]
          : invertMove(playbackMoves[playbackMoveIndex]);

      if (move) {
        setAnimation({
          move,
          fromState: previousStateRef.current,
          durationMs: 900 / playbackSpeed
        });
      }
    } else {
      setAnimation(null);
    }

    previousStateRef.current = state;
    previousMoveIndexRef.current = playbackMoveIndex;
  }, [state, playbackMoveIndex, playbackMoves, playbackSpeed]);

  return (
    <div className="cube-viewport">
      <Canvas camera={{ position: [7.5, 7.5, 9], fov: 34 }}>
        <Scene
          state={state}
          cubies={cubies}
          activeMove={activeMove}
          editable={editable}
          onStickerSelect={onStickerSelect}
          animation={animation}
          onAnimationComplete={() => setAnimation(null)}
        />
        <CameraControls />
      </Canvas>
    </div>
  );
}

function moveToRotationRadians(move: Move): number {
  if (move.turns === 2) {
    return Math.PI;
  }

  return move.turns === 1 ? -Math.PI / 2 : Math.PI / 2;
}

function easeInOutCubic(progress: number): number {
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }

  return 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function toThreeVector(vector: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(vector.x, vector.y, vector.z);
}

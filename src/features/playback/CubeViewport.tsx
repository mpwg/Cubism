import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { cubeColorHex, type CubeState, type Move, type RenderCubie } from "@/domain/cube/types";
import { toRenderCubies } from "@/domain/cube/render";
import { isPositionAffectedByMove } from "@/domain/cube/coordinates";

interface CubeViewportProps {
  readonly state: CubeState;
  readonly activeMove?: Move;
}

function Cubie({ cubie, dimension, activeMove }: { cubie: RenderCubie; dimension: number; activeMove?: Move }) {
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

  return (
    <mesh position={[cubie.position.x * 1.08, cubie.position.y * 1.08, cubie.position.z * 1.08]} scale={highlight ? 1.02 : 1}>
      <boxGeometry args={[0.92, 0.92, 0.92]} />
      {faceMaterials.map((color, index) => (
        <meshStandardMaterial key={`${cubie.id}-${index}`} attach={`material-${index}`} color={color} metalness={0.08} roughness={0.42} />
      ))}
    </mesh>
  );
}

export function CubeViewport({ state, activeMove }: CubeViewportProps) {
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
            <Cubie key={cubie.id} cubie={cubie} dimension={state.dimension} activeMove={activeMove} />
          ))}
        </group>
        <OrbitControls enablePan={false} minDistance={7} maxDistance={18} />
      </Canvas>
    </div>
  );
}

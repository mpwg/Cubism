import { CubismWorkspace } from "@/features/workspace/CubismWorkspace";
import { useCubismController } from "@/features/workspace/useCubismController";

export function App() {
  const controller = useCubismController();
  return <CubismWorkspace {...controller} />;
}

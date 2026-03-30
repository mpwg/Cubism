import packageJson from "../../package.json";

type DependencyEntry = {
  name: string;
  version: string;
};

type ComponentEntry = {
  name: string;
  license: string;
  url: string;
};

function normalizeRepositoryUrl(repository: unknown): string | null {
  if (typeof repository === "string") {
    return repository.replace(/^git\+/, "").replace(/\.git$/, "");
  }

  if (repository && typeof repository === "object" && "url" in repository && typeof repository.url === "string") {
    return repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
  }

  return null;
}

function toDependencyEntries(record: Record<string, string> | undefined): DependencyEntry[] {
  return Object.entries(record ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, version]) => ({ name, version }));
}

export const appMetadata = {
  version: packageJson.version,
  repositoryUrl: normalizeRepositoryUrl(packageJson.repository),
  licenseName: "AGPL-3.0-or-later",
  licenseUrl: "https://github.com/mpwg/Cubism/blob/main/LICENSE.md",
  dependencies: toDependencyEntries(packageJson.dependencies),
  devDependencies: toDependencyEntries(packageJson.devDependencies),
  components: [
    { name: "React", license: "MIT", url: "https://react.dev" },
    { name: "React DOM", license: "MIT", url: "https://react.dev" },
    { name: "Zustand", license: "MIT", url: "https://github.com/pmndrs/zustand" },
    { name: "Three.js", license: "MIT", url: "https://threejs.org" },
    { name: "React Three Fiber", license: "MIT", url: "https://github.com/pmndrs/react-three-fiber" },
    { name: "Comlink", license: "Apache-2.0", url: "https://github.com/GoogleChromeLabs/comlink" },
    { name: "min2phase.js", license: "(MIT or GPL-3.0)", url: "https://github.com/cs0x7f/min2phase.js" },
    { name: "OpenCV.js", license: "Apache-2.0", url: "https://github.com/TechStark/opencv-js" },
    { name: "Rubik", license: "OFL-1.1", url: "https://github.com/fontsource/font-files" }
  ] as ComponentEntry[]
};

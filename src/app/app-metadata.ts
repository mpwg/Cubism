import packageJson from "../../package.json";

type DependencyEntry = {
  name: string;
  version: string;
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
  dependencies: toDependencyEntries(packageJson.dependencies),
  devDependencies: toDependencyEntries(packageJson.devDependencies)
};

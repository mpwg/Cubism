import { appMetadata } from "@/app/app-metadata";

describe("app metadata", () => {
  it("liest Version, Repository, Lizenz und Komponenten aus package.json und Manifest", () => {
    expect(appMetadata.version).toBe("0.1.0");
    expect(appMetadata.repositoryUrl).toBe("https://github.com/mpwg/Cubism");
    expect(appMetadata.licenseName).toBe("AGPL-3.0-or-later");
    expect(appMetadata.dependencies.length).toBeGreaterThan(0);
    expect(appMetadata.devDependencies.length).toBeGreaterThan(0);
    expect(appMetadata.components.some((component) => component.name === "React")).toBe(true);
    expect(appMetadata.dependencies[0]).toEqual({
      name: "@fontsource-variable/rubik",
      version: "^5.2.8"
    });
  });
});

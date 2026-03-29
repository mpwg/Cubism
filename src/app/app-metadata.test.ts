import { appMetadata } from "@/app/app-metadata";

describe("app metadata", () => {
  it("liest Version, Repository und Dependency-Listen aus package.json", () => {
    expect(appMetadata.version).toBe("0.1.0");
    expect(appMetadata.repositoryUrl).toBe("https://github.com/mpwg/Cubism");
    expect(appMetadata.dependencies.length).toBeGreaterThan(0);
    expect(appMetadata.devDependencies.length).toBeGreaterThan(0);
    expect(appMetadata.dependencies[0]).toEqual({
      name: "@fontsource-variable/rubik",
      version: "^5.2.8"
    });
  });
});

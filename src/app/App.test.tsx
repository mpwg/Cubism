import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";
import { useAppStore } from "@/app/store";

vi.mock("@/features/playback/CubeViewport", () => ({
  CubeViewport: () => <div data-testid="cube-viewport">CubeViewport</div>
}));

describe("App workspace", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
  });

  it("rendert den neuen Hauptscreen mit direkten Aktionen", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Cubism" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Cube scannen" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cube manuell bearbeiten" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Lösen" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tipp" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Zurücksetzen" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Demo laden" })).not.toBeInTheDocument();
    expect(screen.getByText("3D-Viewport lädt …")).toBeVisible();
  });

  it("zeigt Footer-Links und Komponenten ohne Versionsangaben", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "GitHub" })).toBeVisible();
    expect(screen.getByRole("link", { name: /AGPL-3.0-or-later/i })).toBeVisible();
    expect(screen.getByText("React")).toBeVisible();
    expect(screen.queryByText(/^React 19$/)).not.toBeInTheDocument();
  });
});

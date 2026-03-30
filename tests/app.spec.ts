import { expect, test } from "@playwright/test";

test("zeigt die Cubism-Startoberfläche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Cubism$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Cube scannen$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Cube scannen$/i })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Cube manuell bearbeiten$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Lösen$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Tipp$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Zurücksetzen$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^GitHub$/i })).toBeVisible();
});

test("deckt den Hauptflow des neuen Workspace im Browser ab", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /^Lösen$/i }).click();
  await expect(page.getByRole("heading", { name: /Visuelle Abfolge/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Aktueller Zug hervorgehoben/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Play/i })).toBeVisible();

  await page.getByRole("button", { name: /^Tipp$/i }).click();
  await expect(page.getByText(/Der Würfel ist bereits gelöst\.|Nächster Zug:/i)).toBeVisible();

  await page.getByRole("button", { name: /^Cube manuell bearbeiten$/i }).click();
  await expect(page.getByRole("heading", { name: /Sticker und Flächen prüfen/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Zustand prüfen/i })).toBeVisible();

  await expect(page.getByText(/^React$/)).toBeVisible();
  await expect(page.getByText(/^React 19$/)).toHaveCount(0);
});

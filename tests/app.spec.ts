import { expect, test } from "@playwright/test";

test("zeigt die Cubism-Startoberfläche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Lokaler Cube-Solver/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Demo laden/i })).toBeVisible();
  await expect(page.getByText(/3x3 ist der Primärpfad/i)).toBeVisible();
});

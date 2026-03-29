import { expect, test } from "@playwright/test";

test("zeigt die Cubism-Startoberfläche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Cubism$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Würfel fotografieren/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Demo laden/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Edit-Modus/i })).toBeVisible();
});

test("deckt den Kernfluss von Demo bis Playback ab", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Demo laden/i }).click();
  await expect(page.getByRole("heading", { name: /Farben prüfen und korrigieren/i })).toBeVisible();

  await page.getByRole("button", { name: /Zustand prüfen/i }).click();
  await expect(page.getByRole("heading", { name: /Lösungsweg berechnen/i })).toBeVisible();

  await page.getByRole("button", { name: /Lösung berechnen/i }).click();
  await expect(page.getByRole("heading", { name: /Lösungsweg abspielen/i })).toBeVisible();

  await page.getByRole("button", { name: /Schritt vor/i }).click();
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(page.locator(".move-list__item--active")).toHaveCount(1);
});

test("bleibt nach erstem Laden offline im Kernfluss nutzbar", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    return Boolean(registration);
  });

  await page.context().setOffline(true);
  await expect(page.getByTestId("offline-banner")).toBeVisible();

  await page.getByRole("button", { name: /Demo laden/i }).click();
  await page.getByRole("button", { name: /Zustand prüfen/i }).click();
  await page.getByRole("button", { name: /Lösung berechnen/i }).click();

  await expect(page.getByRole("heading", { name: /Lösungsweg abspielen/i })).toBeVisible();
});

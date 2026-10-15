import { expect, test } from "@playwright/test";

test.describe("recipe page", () => {
  test("opens from Contents and shows ingredients and method", async ({ page }) => {
    await page.goto("/");
    await page.locator("#contents").getByRole("link", { name: /^Tiramisu/ }).click();
    await expect(page).toHaveURL(/\/recipes\/tiramisou$/);
    await expect(page.getByRole("heading", { name: "What you’ll need" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Method" })).toBeVisible();
    await expect(page.getByText("Translated from Greek")).toBeVisible();
  });

  test("ticks off ingredients and remembers them after a reload", async ({ page }) => {
    await page.goto("/recipes/keik-portokaliou-me-glaso-portokali");
    await expect(page.getByText("0 of 9")).toBeVisible();

    await page.getByRole("checkbox").first().check();
    await expect(page.getByText("1 of 9")).toBeVisible();

    await page.reload();
    await expect(page.getByText("1 of 9")).toBeVisible();
    await expect(page.getByRole("checkbox").first()).toBeChecked();
  });

  test("country tag opens Contents filtered to that country", async ({ page }) => {
    await page.goto("/recipes/tiramisou");
    await page.getByRole("link", { name: "Italy", exact: true }).click();
    await expect(page).toHaveURL(/\/\?country=IT#contents$/);
    await expect(page.getByText("10 of 44 recipes")).toBeVisible();
  });

  test("shows the Greek original at /el", async ({ page }) => {
    await page.goto("/el/recipes/tiramisou");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Τιραμισού/i);
    await expect(page.getByText("Translated from Greek")).toHaveCount(0);
  });

  test("shows a friendly page for a recipe that doesn't exist", async ({ page }) => {
    await page.goto("/recipes/no-such-recipe");
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
  });
});

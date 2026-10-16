import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("shows the English home with all 44 recipes in Contents", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Cooking Stories/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What are we cooking today?");
    await expect(page.locator("#contents li")).toHaveCount(44);
    await expect(page.getByRole("link", { name: "Open recipe" })).toBeVisible();
  });

  test("shows the Greek home at /el", async ({ page }) => {
    await page.goto("/el");
    await expect(page.locator("html")).toHaveAttribute("lang", "el");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Τι μαγειρεύουμε σήμερα;");
  });

  test("redirects /en to the unprefixed English URL", async ({ page }) => {
    await page.goto("/en/recipes/tiramisou");
    await expect(page).toHaveURL(/\/recipes\/tiramisou$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tiramisu");
  });

  test("lists Greece, Italy, France and the United States under Around the world", async ({ page }) => {
    await page.goto("/");
    const world = page.locator("#world");
    for (const country of ["Greece", "Italy", "France", "United States"]) {
      await expect(world.getByText(country, { exact: true })).toBeVisible();
    }
  });
});

test.describe("language preference", () => {
  test.use({ locale: "el-GR" });

  test("sends a Greek browser from the home page to /el", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/el$/);
  });

  test("leaves deep links in the language they were shared in", async ({ page }) => {
    await page.goto("/recipes/tiramisou");
    await expect(page).toHaveURL(/\/recipes\/tiramisou$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("remembers choosing English in the language switcher", async ({ page }) => {
    await page.goto("/el");
    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("language switcher", () => {
  test("links to the same page in the other language", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "EL", exact: true })).toHaveAttribute("href", "/el");
    await page.goto("/recipes/tiramisou");
    await expect(page.getByRole("link", { name: "EL", exact: true })).toHaveAttribute("href", "/el/recipes/tiramisou");
    await page.goto("/el/recipes/tiramisou");
    await expect(page.getByRole("link", { name: "EN", exact: true })).toHaveAttribute("href", "/recipes/tiramisou");
  });
});

import { expect, test, type Page } from "@playwright/test";

const recipeRow = (page: Page, title: string) =>
  page.locator("#contents li").filter({ has: page.getByRole("link", { name: title, exact: false }) });

/** Faded rows are dimmed themselves, or sit in a dimmed category group. */
async function isDimmed(page: Page, title: string) {
  return recipeRow(page, title).evaluate((li) => Boolean(li.closest('[class*="dimmed"]')));
}

test.describe("Contents filters", () => {
  test("are hidden until the Filters button is pressed", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Filters" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#contents-filters")).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#contents-filters")).toBeVisible();
  });

  test("fade recipes from other countries and keep the choice in the URL", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("button", { name: /^Italy/ }).click();

    await expect(page).toHaveURL(/country=IT/);
    await expect(page.getByText("10 of 44 recipes")).toBeVisible();
    expect(await isDimmed(page, "Carbonara")).toBe(false);
    expect(await isDimmed(page, "Fresh chicken salad")).toBe(true);
    await expect(page.getByRole("button", { name: /Filters\s*1/ })).toBeVisible();
  });

  test("combine category, country and no oven", async ({ page }) => {
    await page.goto("/?country=IT");
    await page.getByRole("button", { name: /^Desserts/ }).click();
    await expect(page.getByText("1 of 44 recipes")).toBeVisible();
    expect(await isDimmed(page, "Tiramisu")).toBe(false);

    await page.getByRole("button", { name: /^No oven/ }).click();
    await expect(page).toHaveURL(/oven=no/);
    await expect(page.getByText("1 of 44 recipes")).toBeVisible();
  });

  test("open already applied when the page is linked with a filter", async ({ page }) => {
    await page.goto("/?oven=no#contents");
    await expect(page.locator("#contents-filters")).toBeVisible();
    await expect(page.getByText("24 of 44 recipes")).toBeVisible();
  });

  test("turn off when the active chip is pressed again", async ({ page }) => {
    await page.goto("/?category=pasta");
    await page.getByRole("button", { name: /^Pasta & risotto/ }).click();
    await expect(page).not.toHaveURL(/category=/);
    expect(await isDimmed(page, "Fresh chicken salad")).toBe(false);
  });
});

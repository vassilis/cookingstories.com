import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, READER_EMAIL, signIn } from "./helpers";

test.describe("admin area", () => {
  test("sends signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("is not found for signed-in readers who aren't admins", async ({ page }) => {
    await signIn(page, READER_EMAIL);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
  });

  test("lets an admin edit a recipe and shows the change on the public page", async ({ page }) => {
    await signIn(page, ADMIN_EMAIL);
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.getByRole("heading", { name: "Recipes" })).toBeVisible();

    await page.getByRole("link", { name: "Fried bananas", exact: true }).click();
    await expect(page.getByText("This text is a machine translation.")).toBeVisible();

    await page.getByLabel("Title").fill("Fried bananas with honey");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await expect(page.getByText("This text is a machine translation.")).toHaveCount(0);

    await page.goto("/recipes/tiganites-mpananes");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fried bananas with honey");
    // Edited by a person, so no longer labelled as a translation.
    await expect(page.getByText("Translated from Greek")).toHaveCount(0);
    await page.goto("/");
    await expect(page.locator("#contents").getByText("Fried bananas with honey")).toBeVisible();
  });

  test("hides a recipe from the public site when an admin makes it private", async ({ page, browser }) => {
    await signIn(page, ADMIN_EMAIL);
    await page.goto("/admin/recipes/zesti-milopita?locale=en");
    await page.getByLabel("Who can see it").selectOption("private");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");

    // Admins can still open it; everyone else gets the not-found page.
    const visitor = await browser.newPage();
    await visitor.goto("/recipes/zesti-milopita");
    await expect(visitor.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
    await visitor.goto("/");
    await expect(visitor.locator("#contents li")).toHaveCount(43);
    await visitor.close();

    // Put it back through the editor (which also refreshes the cache) so other tests see 44.
    await page.goto("/admin/recipes/zesti-milopita?locale=en");
    await page.getByLabel("Who can see it").selectOption("public");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await page.goto("/");
    await expect(page.locator("#contents li")).toHaveCount(44);
  });
});

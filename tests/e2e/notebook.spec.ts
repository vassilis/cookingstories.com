import { expect, test, type Browser } from "@playwright/test";
import { READER_EMAIL, signIn } from "./helpers";

const FRIEND_EMAIL = "e2e-friend@cookingstories.test";

async function signedInPage(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  return { page, close: () => context.close() };
}

test("notebook buttons send signed-out visitors to sign in and remember where they were going", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Write your own" }).first().click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fnotebook%2Fnew$/);

  // Answer the request here so the test doesn't use up the sign-in rate limit.
  await page.route("**/api/auth/sign-in/magic-link", (route) => route.fulfill({ json: { status: true } }));
  const request = page.waitForRequest((r) => r.url().includes("/api/auth/sign-in/magic-link"));
  await page.getByLabel("Email address").fill(READER_EMAIL);
  await page.getByRole("button", { name: "Email me a link" }).click();
  expect((await request).postDataJSON()).toMatchObject({ callbackURL: "/notebook/new" });
});

test("a private recipe stays in its author's notebook, and a share link opens it for friends", async ({ browser }) => {
  const author = await signedInPage(browser, READER_EMAIL);
  const page = author.page;

  await page.getByRole("link", { name: "My notebook" }).click();
  await page.getByRole("link", { name: "New recipe" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Aunt Rena’s lentil soup");
  await page.getByLabel("The story behind the dish").fill("She made it every Wednesday.");
  await page.getByLabel("Ingredients").fill("250 g lentils\n1 onion\n2 bay leaves");
  await page.getByLabel("Method").fill("Rinse the lentils.\nSimmer for 40 minutes.");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const slug = page.url().match(/notebook\/recipes\/([^/]+)\/edit/)![1];

  await page.goto(`/recipes/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aunt Rena’s lentil soup");
  await expect(page.getByText("Only you can see this recipe.")).toBeVisible();
  await expect(page.getByText("She made it every Wednesday.")).toBeVisible();

  await page.goto("/notebook");
  await expect(page.getByRole("link", { name: /Aunt Rena’s lentil soup/ }).first()).toBeVisible();

  // Nobody else can open it.
  const friend = await signedInPage(browser, FRIEND_EMAIL);
  await friend.page.goto(`/recipes/${slug}`);
  await expect(friend.page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  await visitor.goto(`/recipes/${slug}`);
  await expect(visitor.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();

  // Switch it to link-only and share it.
  await page.goto(`/notebook/recipes/${slug}/edit`);
  await page.getByLabel(/Anyone with the link/).check();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const shareUrl = new URL(await page.getByLabel("Share link").inputValue());
  const sharePath = `${shareUrl.pathname}${shareUrl.search}`;
  expect(sharePath).toMatch(new RegExp(`^/recipes/${slug}\\?share=`));

  await visitor.goto(sharePath);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Aunt Rena’s lentil soup");
  await expect(visitor.getByText("Only people with the link can see this recipe.")).toBeVisible();
  await visitor.goto(`/recipes/${slug}?share=nope`);
  await expect(visitor.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();

  // Unlisted recipes never show up on the home page.
  await visitor.goto("/");
  await expect(visitor.getByText("Aunt Rena’s lentil soup")).toHaveCount(0);

  await anonymous.close();
  await friend.close();
  await author.close();
});

test("favourites and margin notes belong to the reader who made them", async ({ browser }) => {
  const reader = await signedInPage(browser, READER_EMAIL);
  const page = reader.page;
  await page.goto("/recipes/tiganites-mpananes");
  const title = await page.getByRole("heading", { level: 1 }).textContent();

  const heart = page.getByRole("button", { name: "Save", exact: true });
  await heart.click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toHaveAttribute("aria-pressed", "true");

  const notes = page.getByLabel("e.g. a little less sugar in the glaze");
  await notes.fill("Two bananas are plenty.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await expect(notes).toHaveValue("Two bananas are plenty.");

  await page.goto("/notebook");
  await expect(page.getByRole("region", { name: "Saved recipes" }).getByText(title!)).toBeVisible();
  await expect(page.getByRole("region", { name: "My notes" }).getByText("Two bananas are plenty.")).toBeVisible();

  const friend = await signedInPage(browser, FRIEND_EMAIL);
  await friend.page.goto("/recipes/tiganites-mpananes");
  await expect(friend.page.getByRole("button", { name: "Save", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(friend.page.getByLabel("e.g. a little less sugar in the glaze")).toHaveValue("");
  await friend.page.goto("/notebook");
  await expect(friend.page.getByText("Two bananas are plenty.")).toHaveCount(0);

  // Un-save for the next run.
  await page.goto("/recipes/tiganites-mpananes");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveAttribute("aria-pressed", "false");

  await friend.close();
  await reader.close();
});

test("cook mode opens in a new tab and walks through the steps with a timer", async ({ page, context }) => {
  await page.goto("/recipes/prasina-fasolakia-me-tono");
  const [cook] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Cook step by step" }).click(),
  ]);
  await cook.waitForLoadState();
  await expect(cook).toHaveURL(/\/recipes\/prasina-fasolakia-me-tono\/cook$/);

  await expect(cook.getByRole("heading", { name: "What you’ll need" })).toBeVisible();
  await cook.getByRole("button", { name: "Start cooking" }).click();

  await expect(cook.getByText("Step 1 of 7", { exact: true })).toBeVisible();
  await expect(cook.getByRole("timer")).toHaveText("10:00");
  await cook.getByRole("button", { name: "Start", exact: true }).click();
  await expect(cook.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(cook.getByRole("timer")).not.toHaveText("10:00");

  await cook.keyboard.press("ArrowRight");
  await expect(cook.getByText("Step 2 of 7", { exact: true })).toBeVisible();
  // The running timer follows you to the next step.
  await expect(cook.getByRole("button", { name: /^Step 1 of 7 · \d+:\d\d$/ })).toBeVisible();

  await cook.getByRole("button", { name: "Back" }).click();
  await expect(cook.getByText("Step 1 of 7", { exact: true })).toBeVisible();
  await cook.getByRole("button", { name: "Reset" }).click();
  await expect(cook.getByRole("timer")).toHaveText("10:00");

  for (let i = 1; i < 7; i++) await cook.getByRole("button", { name: /Next step|Finish/ }).click();
  await cook.getByRole("button", { name: "Finish" }).click();
  await expect(cook.getByRole("heading", { name: "Enjoy!" })).toBeVisible();
  await expect(cook.getByText("Sign in on the recipe page to keep notes.")).toBeVisible();
});

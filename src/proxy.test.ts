import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, { headers });
}

const locationOf = (res: Response) => {
  const location = res.headers.get("location");
  return location ? new URL(location).pathname : null;
};

const rewriteOf = (res: Response) => {
  const target = res.headers.get("x-middleware-rewrite");
  return target ? new URL(target).pathname : null;
};

const greek = { "accept-language": "el-GR,el;q=0.9" };

describe("proxy locale routing", () => {
  it("redirects /en/recipes/x to /recipes/x with a 308", () => {
    const res = proxy(req("/en/recipes/x"));
    expect(res.status).toBe(308);
    expect(locationOf(res)).toBe("/recipes/x");
  });

  it("redirects /en to / with a 308", () => {
    const res = proxy(req("/en"));
    expect(res.status).toBe(308);
    expect(locationOf(res)).toBe("/");
  });

  it("passes /el/recipes/x through", () => {
    const res = proxy(req("/el/recipes/x"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("location")).toBeNull();
    expect(rewriteOf(res)).toBeNull();
  });

  it("rewrites /recipes/x to /en/recipes/x", () => {
    const res = proxy(req("/recipes/x"));
    expect(res.status).toBe(200);
    expect(rewriteOf(res)).toBe("/en/recipes/x");
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects / to /el when the browser prefers Greek", () => {
    const res = proxy(req("/", greek));
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe("/el");
  });

  it("rewrites / to /en when the cs_locale cookie says English", () => {
    const res = proxy(req("/", { ...greek, cookie: "cs_locale=en" }));
    expect(res.headers.get("location")).toBeNull();
    expect(rewriteOf(res)).toBe("/en");
  });

  it("redirects / to /el when the cs_locale cookie says Greek, even without a header", () => {
    const res = proxy(req("/", { cookie: "cs_locale=el" }));
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe("/el");
  });

  it("rewrites / to /en when there is no Accept-Language header", () => {
    const res = proxy(req("/"));
    expect(rewriteOf(res)).toBe("/en");
  });

  it("does not redirect a deep link even when the browser prefers Greek", () => {
    const res = proxy(req("/recipes/x", greek));
    expect(res.headers.get("location")).toBeNull();
    expect(rewriteOf(res)).toBe("/en/recipes/x");
  });

  it("picks Greek when its q-value is higher", () => {
    const res = proxy(req("/", { "accept-language": "en;q=0.5, el;q=0.9" }));
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe("/el");
  });

  it("keeps English when its q-value is higher", () => {
    const res = proxy(req("/", { "accept-language": "el;q=0.3, en;q=0.8" }));
    expect(res.headers.get("location")).toBeNull();
    expect(rewriteOf(res)).toBe("/en");
  });

  it("ignores unsupported languages and falls back to English", () => {
    const res = proxy(req("/", { "accept-language": "fr-FR,fr;q=0.9" }));
    expect(res.headers.get("location")).toBeNull();
    expect(rewriteOf(res)).toBe("/en");
  });
});

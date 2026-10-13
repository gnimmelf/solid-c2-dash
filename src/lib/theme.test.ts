import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getTheme,
  setTheme,
  startThemeSync,
  THEME_STORAGE_KEY,
} from "./theme.ts";

describe("theme synchronization", () => {
  let stopSync: (() => void) | undefined;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute("data-obc-theme", "day");
  });

  afterEach(() => {
    stopSync?.();
    stopSync = undefined;
  });

  it("loads and applies the stored theme when started", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dusk");

    stopSync = startThemeSync();

    expect(getTheme()).toBe("dusk");
  });

  it("persists local theme changes", () => {
    stopSync = startThemeSync();

    setTheme("night");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("night");
  });

  it("reads the stored theme when another window changes it", () => {
    stopSync = startThemeSync();
    localStorage.setItem(THEME_STORAGE_KEY, "bright");

    window.dispatchEvent(
      new StorageEvent("storage", { key: THEME_STORAGE_KEY }),
    );

    expect(getTheme()).toBe("bright");
  });
});
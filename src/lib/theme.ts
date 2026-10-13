export const ThemeNames = ["day", "dusk", "night", "bright"] as const;

export type ThemeName = (typeof ThemeNames)[number];

export const THEME_CHANGE_EVENT = "obc-theme-change";
export const THEME_STORAGE_KEY = "obc-theme";

export function getTheme(): ThemeName {
  const theme = document.documentElement.getAttribute("data-obc-theme");
  return ThemeNames.includes(theme as ThemeName) ? (theme as ThemeName) : "day";
}

export function setTheme(theme: ThemeName, notify = true) {
  document.documentElement.setAttribute("data-obc-theme", theme);
  if (notify) {
    window.dispatchEvent(
      new CustomEvent<ThemeName>(THEME_CHANGE_EVENT, { detail: theme }),
    );
  }
}

export function startThemeSync() {
  const readAndApplyStoredTheme = () => {
    try {
      const theme = localStorage.getItem(THEME_STORAGE_KEY);
      if (ThemeNames.includes(theme as ThemeName)) {
        setTheme(theme as ThemeName, false);
      }
    } catch {
      // Storage can be unavailable in restricted browsing contexts.
    }
  };
  const persistCurrentTheme = () => {
    try {
      const theme = getTheme();
      if (localStorage.getItem(THEME_STORAGE_KEY) !== theme) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch {
      // Storage can be unavailable in restricted browsing contexts.
    }
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) readAndApplyStoredTheme();
  };

  window.addEventListener(THEME_CHANGE_EVENT, persistCurrentTheme);
  window.addEventListener("storage", handleStorage);
  readAndApplyStoredTheme();

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, persistCurrentTheme);
    window.removeEventListener("storage", handleStorage);
  };
}
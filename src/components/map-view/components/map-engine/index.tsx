import type { Layer } from "@deck.gl/core";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { getTheme, THEME_CHANGE_EVENT } from "../../../../lib/theme";
import styles from "./style.module.css";

type MapEngineProps = {
  layers: readonly Layer[];
};

const LIGHT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

async function loadMapStyle(url: string): Promise<StyleSpecification | string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    return (await response.json()) as StyleSpecification;
  } catch {
    return url;
  }
}

export default function MapEngine(props: MapEngineProps) {
  const [localTheme, setLocalTheme] = createSignal(getTheme());
  const [mapElement, setMapElement] = createSignal<HTMLDivElement>();
  const [mapInstance, setMapInstance] = createSignal<MapLibreMap>();
  const [mapOverlay, setMapOverlay] = createSignal<MapLibreOverlay>();
  const preloadedStyles = new Map([
    [LIGHT_MAP_STYLE, loadMapStyle(LIGHT_MAP_STYLE)],
    [DARK_MAP_STYLE, loadMapStyle(DARK_MAP_STYLE)],
  ]);

  const handleThemeChange = () => setLocalTheme(getTheme());
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  onCleanup(() =>
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange),
  );

  const mapStyle = createMemo(() => {
    const theme = localTheme();
    return theme === "day" || theme === "bright"
      ? LIGHT_MAP_STYLE
      : DARK_MAP_STYLE;
  });

  createEffect(
    () => mapElement(),
    (mapElement) => {
      if (!mapElement) return;

      setWorkerUrl(mapLibreWorkerUrl);
      const map = new MapLibreMap({
        container: mapElement,
        style: untrack(mapStyle),
        center: [10.49, 59.425],
        zoom: 14,
        pitch: 42,
        bearing: -18,
        attributionControl: false,
        fadeDuration: 0,
      });
      setMapInstance(map);

      return () => {
        setMapInstance(undefined);
        map.remove();
      };
    },
  );

  createEffect(
    () => mapInstance(),
    (map) => {
      if (!map) return;

      let disposeOverlay: (() => void) | undefined;
      const handleLoad = () => {
        const overlay = new MapLibreOverlay({
          interleaved: true,
          layers: [...untrack(() => props.layers)],
        });
        const navigationControl = new NavigationControl({ showCompass: true });
        const attributionControl = new AttributionControl({ compact: true });

        map.addControl(overlay);
        map.addControl(navigationControl, "top-right");
        map.addControl(attributionControl);
        setMapOverlay(overlay);

        disposeOverlay = () => {
          setMapOverlay(undefined);
          if (map.hasControl(overlay)) map.removeControl(overlay);
          if (map.hasControl(navigationControl)) {
            map.removeControl(navigationControl);
          }
          if (map.hasControl(attributionControl)) {
            map.removeControl(attributionControl);
          }
        };
      };

      if (map.loaded()) handleLoad();
      else map.once("load", handleLoad);

      return () => {
        map.off("load", handleLoad);
        disposeOverlay?.();
      };
    },
  );

  createEffect(
    () => [mapInstance(), mapStyle()] as const,
    ([map, style]) => {
      if (!map) return;

      let cancelled = false;
      void preloadedStyles.get(style)?.then((preloadedStyle) => {
        if (cancelled) return;
        map.setStyle(preloadedStyle, {
          transformStyle: (previousStyle, nextStyle) => {
            return {
              ...nextStyle,
              transition: { duration: 0, delay: 0 },
            };
          },
        });
      });

      return () => {
        cancelled = true;
      };
    },
  );

  createEffect(
    () => [mapOverlay(), props.layers] as const,
    ([overlay, layers]) => {
      overlay?.setProps({ layers: [...layers] });
    },
  );

  return <div class={styles.map} ref={setMapElement} />;
}

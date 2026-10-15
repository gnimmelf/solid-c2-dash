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
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import { getTheme, THEME_CHANGE_EVENT } from "../../../lib/theme";
import styles from "./style.module.css";

type MapEngineProps = {
  layers: readonly Layer[];
};

export default function MapEngine(props: MapEngineProps) {
  const [localTheme, setLocalTheme] = createSignal(getTheme());
  const [mapElement, setMapElement] = createSignal<HTMLDivElement>();
  const [mapInstance, setMapInstance] = createSignal<MapLibreMap>();
  const [mapOverlay, setMapOverlay] = createSignal<MapLibreOverlay>();

  const handleThemeChange = () => setLocalTheme(getTheme());
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  onCleanup(() =>
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange),
  );

  const mapStyle = createMemo(() => {
    const theme = localTheme();
    return theme === "day" || theme === "bright"
      ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
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
      map?.setStyle(style);
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
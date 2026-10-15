import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import { ScatterplotLayer } from "@deck.gl/layers";
import "@oicl/openbridge-webcomponents/dist/components/button/button.js";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./style.module.css";
import { getTheme, THEME_CHANGE_EVENT } from "../../lib/theme";

type Detection = {
  coordinates: [number, number];
  intensity: number;
};

const detections: Detection[] = [
  { coordinates: [10.499587, 59.429763], intensity: 1.0 },
  { coordinates: [10.503477, 59.430613], intensity: 0.81 },
  { coordinates: [10.498948, 59.428223], intensity: 0.66 },
  { coordinates: [10.504738, 59.428661], intensity: 0.95 },
  { coordinates: [10.502014, 59.427308], intensity: 0.56 },
  { coordinates: [10.498293, 59.43007], intensity: 0.0 },
  { coordinates: [10.505344, 59.430985], intensity: 0.46 },
  { coordinates: [10.500307, 59.431462], intensity: 0.6 },
  { coordinates: [10.503812, 59.427663], intensity: 0.91 },
  { coordinates: [10.497144, 59.429117], intensity: 0.71 },
  { coordinates: [10.504832, 59.427309], intensity: 0.52 },
  { coordinates: [10.498217, 59.430916], intensity: 0.85 },
];

/**
 * Note that the `data` prop is referenced, so recreating a layer will reuse the
 * referenced `data` prop, both here and inside Deck.gl. The datasets are considered 
 * independent from the layers in deck.gl’s **declarative, immutable scene-graph philosophy**:
 * - Layer catalog
 * - Dataset repository
 */
function createDemoLayer(visible = true) {
  return new ScatterplotLayer<Detection>({
    id: "detection-points",
    visible,
    data: detections,
    getPosition: (detection) => detection.coordinates,
    getRadius: (detection) => 90 + detection.intensity * 180,
    getFillColor: (detection) => [
      242,
      Math.round(102 + detection.intensity * 108),
      67,
      190,
    ],
    getLineColor: [255, 255, 255, 220],
    getLineWidth: 1.5,
    lineWidthMinPixels: 1,
    radiusMinPixels: 5,
    radiusMaxPixels: 22,
    pickable: true,
  });
}

export default function MapView() {
  const [localTheme, setLocalTheme] = createSignal(getTheme());

  const [mapElement, setMapElement] = createSignal<HTMLDivElement | undefined>();
  const [mapInstance, setMapInstance]  = createSignal<MapLibreMap | undefined>();
  const [mapOverlay, setMapOverlay]  = createSignal<MapLibreOverlay | undefined>();
  const [isDemoLayerShown, setIsDemoLayerShown] = createSignal(true);


  const handleThemeChange = () => setLocalTheme(getTheme());
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  onCleanup(() =>
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange),
  );

  const themedProps = createMemo(() => {
    const theme = localTheme();
    return {
      mapStyle:
        theme === "day" || theme === "bright"
          ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    };
  });

  createEffect(
    () => mapElement(),
    (mapElement) => {
      if (mapElement) {
        setWorkerUrl(mapLibreWorkerUrl);
        const map = initiateMapLibre(mapElement, untrack(themedProps));

        return () => {
          setMapInstance(undefined);
          map.remove();
        };
      }
    },
  );

  createEffect(
    () => mapInstance(),
    (mapInstance) => {
      if (!mapInstance) return;

      let disposeDeckGl: (() => void) | undefined;
      const handleLoad = () => {
        disposeDeckGl = initiateDeckGl(mapInstance);
      };

      if (mapInstance.loaded()) handleLoad();
      else mapInstance.once("load", handleLoad);

      return () => {
        mapInstance.off("load", handleLoad);
        disposeDeckGl?.();
      };
    },
  );

  createEffect(
    () => [mapInstance(), themedProps().mapStyle] as const,
    ([mapInstance, mapStyle]) => {
      mapInstance?.setStyle(mapStyle);
    },
  );

  function initiateMapLibre(
    mapElement: HTMLDivElement,
    initialTheme: ReturnType<typeof themedProps>,
  ) {
    const initialLibreMapInstance = new MapLibreMap({
      container: mapElement,
      style: initialTheme.mapStyle,
      center: [10.49, 59.425],
      zoom: 14,
      pitch: 42,
      bearing: -18,
      attributionControl: false,
    });
    setMapInstance(initialLibreMapInstance);
    return initialLibreMapInstance;
  }

  function initiateDeckGl(mapInstance: MapLibreMap) {
    /* MapLibreOverlay is effectively the MapLibre-aware owner/facade for the internal Deck instance. 
    Use it instead of constructing Deck directly when MapLibre is the base map. */
    const overlay = new MapLibreOverlay({
      interleaved: true,
      layers: [createDemoLayer()],
    });

    mapInstance.addControl(overlay);
    const navigationControl = new NavigationControl({ showCompass: true });
    const attributionControl = new AttributionControl({ compact: true });
    mapInstance.addControl(navigationControl, "top-right");
    mapInstance.addControl(attributionControl);

    setMapOverlay(overlay);

    return () => {
      setMapOverlay(undefined);
      if (mapInstance.hasControl(overlay)) mapInstance.removeControl(overlay);
      if (mapInstance.hasControl(navigationControl)) {
        mapInstance.removeControl(navigationControl);
      }
      if (mapInstance.hasControl(attributionControl)) {
        mapInstance.removeControl(attributionControl);
      }
    };
  }

  function toggleDemoLayer() {
    const overlay = mapOverlay();
    if (!overlay) return;

    const isShown = !isDemoLayerShown();
    overlay.setProps({ layers: [createDemoLayer(isShown)] });
    setIsDemoLayerShown(isShown);
  }

  return (
    <section class={styles.mapView}>
      <aside  class={styles['layers-cataloge']}>
        <obc-button onClick={toggleDemoLayer}>Toggle Demo Layer</obc-button>
      </aside>

      <div class={styles.mapFrame}>
        <div
          class={styles.map}
          ref={(element) => {
            setMapElement(element);
          }}
        />
      </div>
    </section>
  );
}

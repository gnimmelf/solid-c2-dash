import {
  ColorControl,
  RangeControl,
} from "../../components/controls";
import type { ScatterplotLayerUpdates } from "./catalog";
import type { ScatterplotLayerDefinition } from "./definition";
import styles from "./style.module.css";

type ScatterplotSettingsProps = {
  layer: ScatterplotLayerDefinition;
  onUpdate: (updates: ScatterplotLayerUpdates) => void;
};

function colorInputValue(color: ScatterplotLayerDefinition["fillColor"]) {
  return `#${color
    .slice(0, 3)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export default function ScatterplotSettings(props: ScatterplotSettingsProps) {
  return (
    <fieldset class={styles.settings}>
      <legend>{props.layer.name || props.layer.id}</legend>
      <RangeControl
        label="Opacity"
        ariaLabel={`${props.layer.name || props.layer.id} opacity`}
        min={0}
        max={1}
        step={0.01}
        value={props.layer.opacity}
        output={`${Math.round(props.layer.opacity * 100)}%`}
        onInput={(opacity) => props.onUpdate({ opacity })}
      />
      <RangeControl
        label="Base radius (px)"
        ariaLabel={`${props.layer.name || props.layer.id} base radius (px)`}
        min={0}
        max={50}
        step={1}
        value={props.layer.radius.base}
        output={`${props.layer.radius.base} px`}
        onInput={(base) => props.onUpdate({ radius: { base } })}
      />
      <ColorControl
        label="Fill color"
        ariaLabel={`${props.layer.name || props.layer.id} fill color`}
        value={colorInputValue(props.layer.fillColor)}
        onInput={(value) => {
          const hex = value.slice(1);
          const rgb = [0, 2, 4].map((offset) =>
            Number.parseInt(hex.slice(offset, offset + 2), 16),
          );
          props.onUpdate({
            fillColor: [rgb[0], rgb[1], rgb[2], props.layer.fillColor[3]],
          });
        }}
      />
    </fieldset>
  );
}
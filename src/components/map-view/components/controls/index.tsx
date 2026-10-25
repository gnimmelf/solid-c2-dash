import { Show } from "solid-js";
import styles from "./style.module.css";

type BaseControlProps = {
  label: string;
  ariaLabel: string;
};

type NumericControlProps = BaseControlProps & {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onInput: (value: number) => void;
};

type RangeControlProps = NumericControlProps & {
  output?: string;
};

export function RangeControl(props: RangeControlProps) {
  return (
    <label class={styles.control}>
      {props.label}
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        aria-label={props.ariaLabel}
        onInput={(event) => props.onInput(event.currentTarget.valueAsNumber)}
      />
      <Show when={props.output}>{(output) => <output>{output()}</output>}</Show>
    </label>
  );
}

export function NumberControl(props: NumericControlProps) {
  return (
    <label class={styles.control}>
      {props.label}
      <input
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        aria-label={props.ariaLabel}
        onInput={(event) => {
          const value = event.currentTarget.valueAsNumber;
          props.onInput(Number.isFinite(value) ? value : 0);
        }}
      />
    </label>
  );
}

type ColorControlProps = BaseControlProps & {
  value: string;
  onInput: (value: string) => void;
};

export function ColorControl(props: ColorControlProps) {
  return (
    <label class={`${styles.control} ${styles.colorControl}`}>
      {props.label}
      <input
        type="color"
        value={props.value}
        aria-label={props.ariaLabel}
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </label>
  );
}
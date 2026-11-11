interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Radio group name; must be unique on the page. */
  name: string;
  /** Accessible name of the group. */
  legend: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}

/** A single-choice switch built on native radio buttons, so arrow keys work. */
export function SegmentedControl<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="inline-flex gap-0.5 rounded-md border border-line bg-surface p-0.5">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-sm px-3 py-1 text-sm text-ink-muted outline-accent hover:text-ink has-checked:bg-accent has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
        >
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

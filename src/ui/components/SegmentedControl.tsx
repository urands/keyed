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
  /** Options one under another, for narrow places such as the sidebar. */
  vertical?: boolean;
}

/** A single-choice switch built on native radio buttons, so arrow keys work. */
export function SegmentedControl<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  vertical = false,
}: SegmentedControlProps<T>) {
  return (
    <fieldset
      className={`inline-flex gap-1 rounded-xl bg-surface-2 p-1 ${vertical ? 'flex-col' : 'flex-wrap'}`}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-center text-sm text-ink-muted transition-colors hover:text-ink has-checked:bg-accent has-checked:font-medium has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
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

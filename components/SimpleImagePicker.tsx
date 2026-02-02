'use client';

import { useMemo } from 'react';

type Option = { label: string; value: string };

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  options?: Option[];
  label?: string;
};

// Minimal placeholder component (the current QafalaModal keeps its own upload UI).
// Kept to satisfy the import and preserve compatibility with the recovered source.
export default function SimpleImagePicker({ value = '', onChange, options = [], label = 'Image' }: Props) {
  const hasOptions = useMemo(() => Array.isArray(options) && options.length > 0, [options]);
  if (!hasOptions) return null;

  return (
    <div className="form-group">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange?.(e.target.value)}>
        <option value="">(none)</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}


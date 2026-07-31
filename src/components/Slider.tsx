import React from 'react';

export const Slider: React.FC<{ value: number; update: (value: number) => void; label?: string; range?: number[], id: string }> = ({
  id,
  value,
  label,
  update,
  range: [min, max] = [0, 3],
}) => {
  return (
    <>
      {label && (
        <label
          style={{
            display: 'inline-block',
            margin: '10px',
            minWidth: '200px',
          }}
          htmlFor={id}
        >
          {label} {Number(value).toFixed(2)}
        </label>
      )}

      <input
        id={id}
        type="range"
        value={value}
        step={(max - min) / 100}
        min={min}
        max={max}
        onChange={e => update(+e.target.value)}
      />
    </>
  );
};

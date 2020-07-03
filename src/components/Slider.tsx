import React, { useEffect, useState } from 'react';
import { v4 as randomId } from 'uuid';

export const Slider: React.FC<{ value: number; update: (value: number) => void; label?: string; range?: number[] }> = ({
  value,
  label,
  update,
  range: [min, max] = [0, 1],
}) => {
  const [id] = useState<string>(`slider-${randomId()}`);

  console.log({ value });

  return (
    <>
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        type="range"
        value={value}
        step={(max - min) / 100}
        min={min}
        max={max}
        onChange={(e) => update(+e.target.value)}
      />
    </>
  );
};

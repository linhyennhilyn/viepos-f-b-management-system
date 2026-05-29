'use client';

import { useRef } from 'react';
import './pin-code-input.css';

interface PinCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const PIN_LENGTH = 6;

export function PinCodeInput({ value, onChange, disabled, hasError }: PinCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cells = Array.from({ length: PIN_LENGTH }, (_, index) => value[index] ?? '');

  const updateCell = (index: number, nextValue: string): void => {
    if (!/^\d*$/.test(nextValue)) {
      return;
    }

    const nextCells = [...cells];
    nextCells[index] = nextValue.slice(-1);
    onChange(nextCells.join('').slice(0, PIN_LENGTH));

    if (nextValue && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number): void => {
    if (cells[index]) {
      updateCell(index, '');
      return;
    }

    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="pin-code-input" aria-label="Nhập PIN 6 số">
      {cells.map((cell, index) => (
        <input
          aria-label={`PIN số ${index + 1}`}
          className={hasError ? 'pin-cell pin-cell-error' : 'pin-cell'}
          disabled={disabled}
          inputMode="numeric"
          key={`pin-${index}`}
          maxLength={1}
          onChange={(event) => updateCell(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') {
              event.preventDefault();
              handleBackspace(index);
            }
          }}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          type="password"
          value={cell}
        />
      ))}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

export interface SelectOption {
  value: string | number;
  label: React.ReactNode;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  placeholder?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  className = '',
  style,
  disabled = false,
  placeholder,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: string | number) => {
    if (disabled) return;
    onChange(String(optionValue));
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || '');

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className} ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
      style={style}
    >
      <div
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="custom-select-value">{displayLabel}</span>
        <ChevronDown size={14} className="custom-select-icon" />
      </div>

      {isOpen && !disabled && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select-option ${String(opt.value) === String(value) ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

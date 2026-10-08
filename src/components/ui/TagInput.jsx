import React, { useState } from 'react';
import { X, Tag } from 'lucide-react';
import Badge from './Badge';

export default function TagInput({
  id,
  name,
  label,
  value = [], // Array of string tags like ['.pdf', '.docx']
  onChange,
  onBlur,
  placeholder = 'Type extension and press Enter (e.g. .pdf)...',
  required = false,
  error = '',
  hint = '',
  disabled = false,
  className = '',
}) {
  const [inputValue, setInputValue] = useState('');
  const [localError, setLocalError] = useState('');

  const normalizeTag = (raw) => {
    let clean = raw.trim().toLowerCase();
    if (!clean) return '';
    if (!clean.startsWith('.')) {
      clean = `.${clean}`;
    }
    return clean;
  };

  const addTag = (raw) => {
    const clean = normalizeTag(raw);
    if (!clean) return;

    if (!/^\.[a-z0-9]{1,10}$/.test(clean)) {
      setLocalError('Invalid extension format. Must be like .pdf, .docx, or .dwg');
      return;
    }

    if (value.includes(clean)) {
      setLocalError(`'${clean}' is already added.`);
      return;
    }

    setLocalError('');
    setInputValue('');
    const nextTags = [...value, clean];
    if (onChange) {
      onChange({
        target: {
          name: name || id,
          value: nextTags,
        },
      });
    }
  };

  const removeTag = (tagToRemove) => {
    if (disabled) return;
    const nextTags = value.filter((t) => t !== tagToRemove);
    if (onChange) {
      onChange({
        target: {
          name: name || id,
          value: nextTags,
        },
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleInputBlur = (e) => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
    if (onBlur) {
      onBlur(e);
    }
  };

  const hasError = Boolean(error || localError);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-heading leading-none flex items-center gap-1"
        >
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div
        className={`w-full rounded-lg border bg-bg p-2 transition-all flex flex-wrap items-center gap-1.5 min-h-[42px] ${
          hasError
            ? 'border-danger focus-within:ring-2 focus-within:ring-danger/20'
            : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-text-muted/60'
        } ${disabled ? 'bg-surface/50 opacity-70 cursor-not-allowed' : ''}`}
      >
        {/* Render Tag Chips */}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-surface border border-border text-heading shadow-2xs group"
          >
            <Tag size={11} className="text-primary" />
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-danger text-text-muted transition-colors cursor-pointer rounded-full p-0.5"
                title={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}

        {/* Input field */}
        <input
          id={id}
          name={name}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (localError) setLocalError('');
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          placeholder={value.length === 0 ? placeholder : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-text placeholder:text-text-muted/70 px-1 py-0.5"
        />
      </div>

      {/* Error / Hint Messages */}
      {error ? (
        <p className="text-xs text-danger flex items-center gap-1">{error}</p>
      ) : localError ? (
        <p className="text-xs text-danger flex items-center gap-1">{localError}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

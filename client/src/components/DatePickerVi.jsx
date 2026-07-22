import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

/**
 * DatePickerVi - Custom Vietnamese Date Picker & Masked Input (DD/MM/YYYY)
 * Displays strictly in DD/MM/YYYY format (Ngày / Tháng / Năm).
 * Accepts `value` in ISO format (YYYY-MM-DD) or DD/MM/YYYY.
 * Returns `onChange` with ISO format (YYYY-MM-DD).
 */
export const DatePickerVi = ({
  value = '',
  onChange,
  min = '',
  max = '',
  placeholder = 'dd/mm/yyyy',
  className = '',
  style = {},
  required = false,
  disabled = false
}) => {
  const hiddenInputRef = useRef(null);

  // Convert YYYY-MM-DD to DD/MM/YYYY
  const isoToVi = (isoStr) => {
    if (!isoStr) return '';
    const cleanStr = String(isoStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (y.length === 4) return `${d}/${m}/${y}`;
    }
    return isoStr;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const viToIso = (viStr) => {
    if (!viStr) return '';
    const parts = viStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        const numD = parseInt(d, 10);
        const numM = parseInt(m, 10);
        const numY = parseInt(y, 10);
        if (numD >= 1 && numD <= 31 && numM >= 1 && numM <= 12 && numY >= 1900 && numY <= 2100) {
          return `${y}-${m}-${d}`;
        }
      }
    }
    return '';
  };

  const [displayValue, setDisplayValue] = useState(() => isoToVi(value));

  useEffect(() => {
    setDisplayValue(isoToVi(value));
  }, [value]);

  // Handle typing with automatic slash formatting
  const handleInputChange = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, ''); // numbers only
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = '';
    if (raw.length > 0) {
      formatted = raw.slice(0, 2);
      if (raw.length > 2) {
        formatted += '/' + raw.slice(2, 4);
        if (raw.length > 4) {
          formatted += '/' + raw.slice(4, 8);
        }
      }
    }

    setDisplayValue(formatted);

    if (formatted.length === 10) {
      const iso = viToIso(formatted);
      if (iso && onChange) {
        onChange(iso);
      }
    } else if (formatted === '') {
      if (onChange) onChange('');
    }
  };

  const handleHiddenDateChange = (e) => {
    const isoVal = e.target.value; // YYYY-MM-DD
    setDisplayValue(isoToVi(isoVal));
    if (onChange) onChange(isoVal);
  };

  const handleOpenCalendar = () => {
    if (disabled) return;
    if (hiddenInputRef.current) {
      try {
        if (typeof hiddenInputRef.current.showPicker === 'function') {
          hiddenInputRef.current.showPicker();
        } else {
          hiddenInputRef.current.click();
        }
      } catch (err) {
        hiddenInputRef.current.click();
      }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
      {/* Hidden native input for calendar popover picker */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={value ? value.split('T')[0] : ''}
        min={min}
        max={max}
        onChange={handleHiddenDateChange}
        disabled={disabled}
        tabIndex={-1}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
          left: 0,
          bottom: 0
        }}
      />

      {/* Visible Input Box displaying DD/MM/YYYY */}
      <input
        type="text"
        className={className}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder || 'dd/mm/yyyy'}
        required={required}
        disabled={disabled}
        maxLength={10}
        style={{
          width: '100%',
          paddingRight: '40px',
          ...style
        }}
      />

      {/* Calendar Icon trigger */}
      <button
        type="button"
        onClick={handleOpenCalendar}
        disabled={disabled}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: '12px',
          background: 'none',
          border: 'none',
          color: '#00bfa5',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '6px',
          transition: 'all 0.2s'
        }}
        title="Mở lịch chọn ngày (Ngày/Tháng/Năm)"
      >
        <Calendar size={18} />
      </button>
    </div>
  );
};

export default DatePickerVi;

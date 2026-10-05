import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, ChevronDown, Check, Edit3 } from 'lucide-react';
import './SelectWithOther.css';

export default function SelectWithOther({
  value = '',
  onChange,
  options = [],
  placeholder = '-- Select Option --',
  otherLabel = 'Other (Type custom...)',
  otherValue = '__OTHER__',
  showOther = true,
  className = '',
  style = {},
  inputClassName = '',
  name,
  disabled = false,
  children,
  iconLeft,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 200, placement: 'bottom' });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);
  const modeLockedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build standardized options array from props or React children
  const parsedOptions = useMemo(() => {
    let opts = [];
    if (options && options.length > 0) {
      opts = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
      );
    } else if (children) {
      React.Children.forEach(children, child => {
        if (child && child.props) {
          opts.push({
            value: child.props.value !== undefined ? child.props.value : child.props.children,
            label: child.props.children || child.props.value,
            icon: child.props.icon
          });
        }
      });
    }
    return opts;
  }, [options, children]);

  // Check if current value exists in predefined options
  const isPredefined = useMemo(() => {
    if (!value || value === otherValue || value === 'Other' || value === '__OTHER__') return false;
    return parsedOptions.some(
      opt => opt.value !== '' && opt.value !== otherValue && opt.value !== 'Other' && String(opt.value).toLowerCase() === String(value).toLowerCase()
    );
  }, [value, parsedOptions, otherValue]);

  const [isOther, setIsOther] = useState(() => {
    if (value === otherValue || value === 'Other' || value === '__OTHER__') {
      modeLockedRef.current = true;
      return true;
    }
    if (value && !isPredefined) {
      modeLockedRef.current = true;
      return true;
    }
    return false;
  });

  const [customVal, setCustomVal] = useState(() => {
    if (value && value !== otherValue && value !== 'Other' && value !== '__OTHER__' && !isPredefined) {
      return value;
    }
    return '';
  });

  // Sync external value changes when switching records (respect modeLockedRef)
  useEffect(() => {
    if (modeLockedRef.current) return;

    if (value === otherValue || value === 'Other' || value === '__OTHER__') {
      modeLockedRef.current = true;
      setIsOther(true);
    } else if (value && !isPredefined) {
      modeLockedRef.current = true;
      setIsOther(true);
      if (document.activeElement !== inputRef.current) {
        setCustomVal(value);
      }
    } else if (isPredefined) {
      setIsOther(false);
      setCustomVal('');
    }
  }, [value, isPredefined, otherValue]);

  // Focus custom input when entering "Other" mode
  useEffect(() => {
    if (isOther && inputRef.current && document.activeElement !== inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOther]);

  // Calculate popover screen coordinates when opening
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const popoverEstimatedHeight = Math.min(finalOptions.length * 40 + 20, 260);

    const spaceBelow = viewportHeight - rect.bottom;
    const placement = spaceBelow < popoverEstimatedHeight && rect.top > popoverEstimatedHeight ? 'top' : 'bottom';

    setPopoverPos({
      top: placement === 'top' ? rect.top - popoverEstimatedHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
      placement,
      maxHeight: popoverEstimatedHeight
    });
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Close popover on outside click or scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleSelectOption = (optValue) => {
    if (optValue === otherValue || optValue === 'Other' || optValue === '__OTHER__') {
      modeLockedRef.current = true;
      setIsOther(true);
      setIsOpen(false);
      const emitVal = customVal || '';
      if (onChange) {
        onChange({
          target: { name, value: emitVal },
          preventDefault: () => {},
          stopPropagation: () => {}
        });
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      modeLockedRef.current = false;
      setIsOther(false);
      setCustomVal('');
      setIsOpen(false);
      if (onChange) {
        onChange({
          target: { name, value: optValue },
          preventDefault: () => {},
          stopPropagation: () => {}
        });
      }
    }
  };

  const handleCustomInputChange = (e) => {
    const text = e.target.value;
    setCustomVal(text);
    if (onChange) {
      onChange({
        target: { name, value: text },
        preventDefault: () => {},
        stopPropagation: () => {}
      });
    }
  };

  const handleSwitchBack = () => {
    modeLockedRef.current = false;
    setIsOther(false);
    setCustomVal('');
    const firstNonEmpty = parsedOptions.find(o => o.value !== '' && o.value !== otherValue)?.value || '';
    if (onChange) {
      onChange({
        target: { name, value: firstNonEmpty },
        preventDefault: () => {},
        stopPropagation: () => {}
      });
    }
  };

  const finalOptions = useMemo(() => {
    if (!showOther) {
      return parsedOptions;
    }
    const hasOther = parsedOptions.some(
      opt => opt.value === otherValue || String(opt.label).toLowerCase().includes('other')
    );
    if (!hasOther) {
      return [...parsedOptions, { value: otherValue, label: otherLabel }];
    }
    return parsedOptions;
  }, [parsedOptions, otherLabel, otherValue, showOther]);

  const selectedItem = parsedOptions.find(
    opt => String(opt.value).toLowerCase() === String(value).toLowerCase()
  );

  const displayLabel = isOther
    ? customVal || 'Custom Option'
    : selectedItem?.label || value || placeholder;

  if (isOther) {
    return (
      <div className={`swo-wrap swo-custom-mode ${className}`} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', ...style }}>
        {iconLeft}
        <input
          ref={inputRef}
          type="text"
          name={name}
          disabled={disabled}
          value={customVal}
          onChange={handleCustomInputChange}
          placeholder="Type custom value..."
          className={`swo-custom-input ${inputClassName}`}
        />
        <button
          type="button"
          onClick={handleSwitchBack}
          title="Switch back to dropdown list"
          className="swo-btn-back"
        >
          <RotateCcw size={13} />
          <span>List</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`swo-wrap ${className}`} style={{ width: '100%', position: 'relative', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`swo-trigger-btn ${inputClassName} ${isOpen ? 'is-active' : ''}`}
      >
        <div className="swo-trigger-content">
          {iconLeft && <span className="swo-trigger-icon">{iconLeft}</span>}
          <span className="swo-trigger-text">{displayLabel}</span>
        </div>
        <ChevronDown size={14} className={`swo-trigger-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={popoverRef}
          className="swo-popover-portal animate-scale-up"
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            width: popoverPos.width,
            zIndex: 999999,
          }}
        >
          <div className="swo-popover-card">
            <div className="swo-popover-scroll" style={{ maxHeight: popoverPos.maxHeight || 250 }}>
              {finalOptions.map((opt, idx) => {
                const isSelected = String(opt.value).toLowerCase() === String(value).toLowerCase();
                const isOtherOpt = opt.value === otherValue || opt.value === 'Other';

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(opt.value)}
                    className={`swo-option-item ${isSelected ? 'selected' : ''} ${isOtherOpt ? 'is-other-opt' : ''}`}
                  >
                    <div className="swo-option-label-wrap">
                      {opt.icon && <span className="swo-option-icon">{opt.icon}</span>}
                      {isOtherOpt && <Edit3 size={14} className="swo-option-icon-other" />}
                      <span className="swo-option-label-text">{opt.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="swo-option-check" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

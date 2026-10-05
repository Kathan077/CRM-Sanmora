import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import './ProFilterDropdown.css';

export default function ProFilterDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  iconLeft = null,
  style = {},
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 200, placement: 'bottom' });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOpt = options.find(o => String(o.value) === String(value)) || options[0];
  const displayLabel = selectedOpt ? selectedOpt.label : placeholder;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const estimatedHeight = Math.min(options.length * 40 + 16, 260);

    const spaceBelow = viewportHeight - rect.bottom;
    const placement = spaceBelow < estimatedHeight && rect.top > estimatedHeight ? 'top' : 'bottom';

    setPopoverPos({
      top: placement === 'top' ? rect.top - estimatedHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 180),
      placement,
      maxHeight: estimatedHeight
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };

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

  const handleSelect = (val) => {
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  return (
    <div className={`pro-filter-wrap ${className}`} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`pro-filter-btn ${isOpen ? 'is-active' : ''}`}
      >
        <div className="pro-filter-content">
          {iconLeft && <span className="pro-filter-left-icon">{iconLeft}</span>}
          <span className="pro-filter-label">{displayLabel}</span>
        </div>
        <ChevronDown size={14} className={`pro-filter-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={popoverRef}
          className="pro-filter-portal animate-scale-up"
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            width: popoverPos.width,
            zIndex: 999999
          }}
        >
          <div className="pro-filter-card">
            <div className="pro-filter-scroll" style={{ maxHeight: popoverPos.maxHeight || 250 }}>
              {options.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(opt.value)}
                    className={`pro-filter-option ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="pro-option-left">
                      {opt.icon && <span className="pro-option-icon">{opt.icon}</span>}
                      <span className="pro-option-label">{opt.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="pro-option-check" />}
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

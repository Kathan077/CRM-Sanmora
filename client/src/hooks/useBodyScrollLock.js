import { useEffect } from 'react';

// Global reference counter for open modals across the entire CRM
let openModalCount = 0;

export function lockBodyScroll() {
  if (typeof window === 'undefined') return;
  openModalCount++;
  if (openModalCount === 1) {
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
  }
}

export function unlockBodyScroll() {
  if (typeof window === 'undefined') return;
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
  }
}

export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}

export default useBodyScrollLock;

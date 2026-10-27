import React, { useEffect, useRef } from 'react';
interface AccessibleDialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}
/** Native modal restores focus, traps Tab and closes with Escape. */
export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({ title, onClose, children, size = 'md' }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={'m-auto w-[min(100vw,100%)] max-h-[95dvh] max-w-none overflow-y-auto rounded-t-2xl border border-white/15 bg-[#101010] p-0 text-white shadow-2xl backdrop:bg-black/85 sm:w-[calc(100vw-2rem)] sm:rounded-2xl ' + (size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
      {children}
    </dialog>
  );
};

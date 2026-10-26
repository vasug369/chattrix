import { useEffect, useRef, useState } from 'react';
import { Button } from './Glass';

/**
 * A "⋯" button with a small dropdown of actions. Closes on outside click and
 * on Escape.
 *
 * items: [{ label, onSelect, danger? }]
 */
export default function MoreMenu({ items, label = 'More actions', size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        size={size}
        variant="ghost"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </Button>
      {open && (
        <div role="menu" className="glass-panel absolute right-0 top-full z-20 mt-2 w-56 p-2 animate-scale-in">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
              style={{ color: item.danger ? 'var(--danger)' : 'var(--text)' }}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

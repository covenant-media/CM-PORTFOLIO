'use client';

/**
 * A dark, design-matched dropdown.
 *
 * Why this exists: a native `<select>` popup is painted by the operating system, so no class
 * can reach its background, radius or option states, and on a dark page it opens as a plain
 * white panel. `color-scheme: dark` helps, but it still leaves the platform's own typography
 * and spacing in charge. This component renders the panel itself, so it matches the rest of
 * the surface exactly, and it stays a real form control:
 *
 *  - The native `<select>` is still rendered (visually hidden) and still posts its value, which
 *    keeps the form working without JavaScript. Callers only swap the *presentation*, and only
 *    after hydration, so the no-JS path keeps the plain functional control.
 *  - The trigger is a `role="combobox"` button and the panel is a `role="listbox"`, wired with
 *    `aria-activedescendant`, so the whole thing is reachable and operable from the keyboard.
 *  - The panel is portalled to `<body>` and positioned from the trigger's rect, so it is never
 *    clipped by an ancestor's `overflow` and flips above the trigger when there is no room below.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';

export interface SelectMenuOption {
  value: string;
  label: string;
}

interface Props {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  /** Field shell classes from the form, so the closed control matches its neighbours. */
  className?: string;
}

/** Panel height budget, kept in sync with the flip decision below. */
const PANEL_MAX = 300;

export function SelectMenu({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  required,
  invalid,
  describedBy,
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; above: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const typed = useRef({ buffer: '', at: 0 });
  const listId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const selectedIndex = options.findIndex((option) => option.value === value);
  const label = options.find((option) => option.value === value)?.label ?? '';

  /** True when the event came from inside the portalled panel. */
  function panelRootContains(target: EventTarget | Node | null) {
    return target instanceof Node ? Boolean(listRef.current?.parentElement?.contains(target)) : false;
  }

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - box.bottom;
    const above = spaceBelow < Math.min(PANEL_MAX, window.innerHeight * 0.4) && box.top > spaceBelow;
    setRect({ left: box.left, top: above ? box.top : box.bottom, width: box.width, above });
  }, []);

  const openPanel = useCallback(() => {
    place();
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }, [place, selectedIndex]);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      onChange(option.value);
      close(true);
    },
    [close, onChange, options],
  );

  // Keep the open panel glued to its trigger, and close it if the trigger leaves the viewport.
  useEffect(() => {
    if (!open) return;
    const onScroll = (event: Event) => {
      if (panelRootContains(event.target)) return; // scrolling the panel itself is fine
      place();
    };
    const onResize = () => place();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRootContains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keep the highlighted option in view so keyboard navigation never scrolls off the panel.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id, open]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((current) => (current + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((current) => (current - 1 + options.length) % options.length);
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        commit(active);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default: {
        // Type-ahead: pressing "F" jumps to the first option starting with F.
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
        const now = Date.now();
        typed.current = { buffer: now - typed.current.at > 700 ? event.key : typed.current.buffer + event.key, at: now };
        const query = typed.current.buffer.toLowerCase();
        const found = options.findIndex((option) => option.label.toLowerCase().startsWith(query));
        if (found >= 0) setActive(found);
      }
    }
  }

  return (
    <>
      {/* The real control: posts with the form, and is what a no-JS visitor uses. */}
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        aria-hidden
        tabIndex={-1}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-label`}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onKeyDown}
        className={cx(
          className,
          'flex items-center justify-between gap-2 text-left',
          value ? '' : 'text-fg-dim/80',
          open && 'border-[var(--accent)]',
        )}
      >
        <span className="truncate">{label || placeholder}</span>
        <Icon
          name="chevron-down"
          size={14}
          className={cx('shrink-0 transition-transform duration-300', open ? 'rotate-180 text-[var(--accent)]' : 'text-fg-dim')}
        />
      </button>

      {open && rect
        ? createPortal(
            <>
              {/* Mobile scrim: the panel sits over the page like a sheet, so tapping outside closes it. */}
              <div className="fixed inset-0 z-[69] bg-[rgba(6,6,9,.55)] backdrop-blur-[2px] sm:hidden" aria-hidden onClick={() => close()} />
              <div
                className="fixed z-[70]"
                style={{
                  left: rect.width < window.innerWidth - 32 ? rect.left : 16,
                  width: rect.width < window.innerWidth - 32 ? rect.width : window.innerWidth - 32,
                  ...(rect.above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.top + 6 }),
                }}
              >
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  aria-labelledby={`${id}-label`}
                  tabIndex={-1}
                  className="max-h-[min(20rem,52vh)] overflow-y-auto overscroll-contain rounded-3 border border-[rgba(243,241,236,.14)] bg-[rgba(17,17,22,.98)] p-1.5 shadow-[0_30px_80px_-28px_rgba(0,0,0,.95)] backdrop-blur-xl"
                >
                  {options.map((option, index) => {
                    const isSelected = option.value === value;
                    const isActive = index === active;
                    return (
                      <li
                        key={option.value}
                        id={optionId(index)}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => commit(index)}
                        className={cx(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-2 px-3.5 py-2.5 text-[0.9375rem] transition-colors duration-150',
                          isSelected
                            ? 'bg-[rgba(228,190,107,.13)] text-[var(--accent)]'
                            : isActive
                              ? 'bg-[rgba(243,241,236,.07)] text-fg'
                              : 'text-fg-muted',
                        )}
                      >
                        <span>{option.label}</span>
                        {isSelected ? <Icon name="check" size={14} className="shrink-0" /> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

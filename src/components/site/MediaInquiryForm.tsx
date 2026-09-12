'use client';

/**
 * The media enquiry form.
 *
 * Wraps the shared `PublicForm` (behaviour untouched, so the brand and tech surfaces keep
 * theirs) and adds the two things the Media Portfolio needs from it:
 *
 * 1. **Design-matched dropdowns.** A native `<select>` popup is painted by the operating system
 *    and cannot be styled, so on a dark page it opens as a plain white panel. After hydration
 *    this switches the two dropdowns (Service needed, Budget range, Delivery needed by) to the
 *    portalled `SelectMenu` panel, which matches the surface exactly. Before hydration, and with
 *    JavaScript off, the native control is still there and still works.
 * 2. **Dark native controls** for the date field's picker and as a fallback while the native
 *    selects are on screen, scoped to `.media-inquiry` so nothing outside this form changes.
 */
import { useEffect, useState } from 'react';
import { PublicForm } from '@/components/forms/PublicForm';
import type { PublicFormConfig } from '@/lib/cms/forms';

export function MediaInquiryForm({
  config,
  action,
  token,
  successMessage,
  submitNote,
}: {
  config: PublicFormConfig;
  action: string;
  token: string;
  successMessage?: string | null;
  submitNote?: string | null;
}) {
  // Progressive enhancement: native controls stay the default until we know the browser runs JS,
  // which keeps the form usable if hydration never happens.
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);

  return (
    <div className="media-inquiry">
      <style>{`
        .media-inquiry { color-scheme: dark; }
        .media-inquiry select option {
          background-color: #14141a;
          color: #f3f1ec;
        }
        .media-inquiry input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.85) sepia(0.2) saturate(0.6);
          cursor: pointer;
        }
      `}</style>
      <PublicForm
        config={config}
        action={action}
        token={token}
        successMessage={successMessage}
        submitNote={submitNote}
        selects={enhanced ? 'menu' : 'native'}
      />
    </div>
  );
}

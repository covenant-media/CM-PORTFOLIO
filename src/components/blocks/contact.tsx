import { Section, Eyebrow } from '@/components/ui/Section';
import { PublicForm, ContactDetails } from '@/components/forms/PublicForm';
import { Icon } from '@/components/ui/Icon';
import { blockProps } from '@/lib/cms/blocks';
import { FORM_CONFIGS, type FormVariant } from '@/lib/cms/forms';
import { contactDetails, siteContext } from '@/lib/cms/content';
import { getSetting } from '@/lib/cms/settings';
import { issueFormToken } from '@/lib/security/forms';
import { socialIconName } from '@/components/ui/Icon';
import type { SectionData } from '@/lib/types/content';
import { pb, type Division } from './helpers';

/**
 * Contact section — form + direct channels. The form fields differ per
 * experience (PRD §18): media asks for event date/location, tech for scope.
 */
export async function ContactBlock({
  block,
  division,
  variant,
}: {
  block: SectionData;
  division: Division;
  variant?: FormVariant;
}) {
  const props = blockProps('contact_block', block.props);
  const formVariant: FormVariant = variant ?? (division === 'media' ? 'media' : division === 'tech' ? 'tech' : 'main');
  const config = FORM_CONFIGS[formVariant] ?? FORM_CONFIGS.main;
  const details = await contactDetails();
  const site = await siteContext();
  const token = issueFormToken();
  const turnstileKey = await getSetting('forms.turnstile_site_key').catch(() => null);
  const successMessage = await getSetting(config.successSetting).catch(() => null);
  const showForm = pb(props, 'showForm', true);
  const withWhatsApp = pb(props, 'showWhatsApp', division === 'media');

  const items = [
    details.email ? { label: 'Email', value: details.email, href: `mailto:${details.email}`, icon: 'mail' } : null,
    details.whatsapp && withWhatsApp
      ? { label: 'WhatsApp', value: details.whatsappLabel ?? details.whatsapp, href: details.whatsappHref, icon: 'whatsapp' }
      : null,
    details.phone ? { label: 'Phone', value: details.phone, href: details.telHref, icon: 'phone' } : null,
    details.location ? { label: 'Based in', value: details.location, icon: 'pin' } : null,
    details.serviceAreas ? { label: 'Where we work', value: details.serviceAreas, icon: 'folder' } : null,
    details.hours ? { label: 'Hours', value: details.hours, icon: 'clock' } : null,
    details.responseTime ? { label: 'Typical reply', value: details.responseTime, icon: 'send' } : null,
    details.availability ? { label: 'Current availability', value: details.availability, icon: 'calendar' } : null,
  ].filter(Boolean) as { label: string; value: string; href?: string | null; icon?: string }[];

  return (
    <Section id="contact" tone="sunken" className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-0 h-64 opacity-70"
        style={{ background: 'radial-gradient(55% 60% at 50% 0%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 72%)' }}
      />
      <div className="container-page relative">
        <div className={showForm ? 'grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16' : ''}>
          <div className="min-w-0">
            <Eyebrow>{block.eyebrow ?? 'Enquiries'}</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.4rem)] font-light leading-[1.03] tracking-[-0.03em] [text-wrap:balance]">
              {block.headline ?? config.title}
            </h2>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-[1.65] text-fg-muted [text-wrap:pretty]">{block.body ?? config.intro}</p>

            {showForm ? (
              <div className="mt-10">
                <PublicForm
                  config={config}
                  action="/api/forms"
                  token={token}
                  turnstileSiteKey={turnstileKey || null}
                  successMessage={successMessage}
                  submitNote={
                    site.settings['system.show_sample_badges']
                      ? 'Sample build — submissions are stored in the CMS so the whole flow can be tested.'
                      : 'This goes straight to Covenant — no lists, no tracking pixels.'
                  }
                />
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap gap-3">
                {details.email ? (
                  <a href={`mailto:${details.email}`} className="inline-flex h-11 items-center gap-2 rounded-pill border border-[rgba(243,241,236,.18)] px-5 text-[0.9375rem] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                    <Icon name="mail" size={16} /> {details.email}
                  </a>
                ) : null}
                {details.whatsappHref ? (
                  <a href={details.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-pill bg-[var(--accent)] px-5 text-[0.9375rem] text-[var(--accent-ink)] transition hover:brightness-105">
                    <Icon name="whatsapp" size={16} /> {details.whatsappLabel ?? 'WhatsApp'}
                  </a>
                ) : null}
              </div>
            )}
          </div>

          {showForm && items.length ? (
            <aside className="lg:pt-3">
              <ContactDetails title={formVariant === 'tech' ? 'Prefer email?' : 'Prefer to talk?'} items={items} />
              {site.social.length ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {site.social.slice(0, 6).map((item) => (
                    <li key={`${item.network}-${item.url}`}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer me"
                        aria-label={`${item.label ?? item.network} — opens in a new tab`}
                        className="grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.14)] text-fg-muted transition hover:border-[var(--accent)] hover:text-fg"
                      >
                        <Icon name={socialIconName(item.network)} size={15} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

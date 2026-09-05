/**
 * Icon set: one inline SVG component, no icon runtime shipped to the client.
 * UI marks are 24×24 stroke geometry; brand marks use extracted simple-icons paths.
 */
import { BRAND_ICONS } from '@/lib/icons/brands';
import { cx } from '@/lib/utils/text';

const UI: Record<string, string[]> = {
  'arrow-right': ['M4 12h15', 'M13 6l6 6-6 6'],
  'arrow-up-right': ['M7 17 17 7', 'M8 7h9v9'],
  'arrow-down': ['M12 4v15', 'M6 13l6 6 6-6'],
  'arrow-left': ['M20 12H5', 'M11 18l-6-6 6-6'],
  'chevron-right': ['M9 5l7 7-7 7'],
  'chevron-down': ['M5 9l7 7 7-7'],
  'chevron-up': ['M19 15l-7-7-7 7'],
  play: ['M7 4.5v15l12-7.5-12-7.5Z'],
  pause: ['M8 5v14', 'M16 5v14'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.3-4.3'],
  expand: ['M4 9V4h5', 'M20 15v5h-5', 'M15 4h5v5', 'M9 20H4v-5'],
  minimize: ['M9 4v5H4', 'M15 20v-5h5', 'M20 9h-5V4', 'M4 15h5v5'],
  external: ['M14 4h6v6', 'M20 4l-8 8', 'M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4'],
  download: ['M12 4v11', 'M7 11l5 5 5-5', 'M4 20h16'],
  upload: ['M12 20V9', 'M7 13l5-5 5 5', 'M4 4h16'],
  check: ['M4 12.5l5 5L20 6.5'],
  alert: ['M12 3.5 22 20H2L12 3.5Z', 'M12 10v4', 'M12 17.2v.1'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 7.8v.1'],
  star: ['M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  'eye-off': ['M3 3l18 18', 'M10.6 6.1A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.3 3.9', 'M6.3 8.1A16.7 16.7 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 3.6-.7', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  drag: ['M9 5h.1', 'M9 12h.1', 'M9 19h.1', 'M15 5h.1', 'M15 12h.1', 'M15 19h.1'],
  refresh: ['M20 12a8 8 0 1 1-2.4-5.7', 'M20 4v4h-4'],
  calendar: ['M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z', 'M8 3v4', 'M16 3v4', 'M4 12h16'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5V12l3.2 2'],
  pin: ['M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  mail: ['M3.5 6.5h17v11h-17z', 'M3.5 7l8.5 6 8.5-6'],
  phone: ['M7 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z'],
  chat: ['M4 5h16v11H9l-5 4V5Z'],
  send: ['M4 12 20 4l-6 16-3.2-6L4 12Z'],
  sparkle: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z', 'M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  list: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  filter: ['M3.5 5h17l-6.5 8v5.5l-4 1.5V13L3.5 5Z'],
  lock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3'],
  shield: ['M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3Z', 'M9 12l2.2 2.2L15.5 10'],
  layers: ['M12 3l9 5-9 5-9-5 9-5Z', 'M3 13l9 5 9-5', 'M3 17l9 5 9-5'],
  camera: ['M3 8.5h4l1.5-2.5h7L17 8.5h4v10.5H3z', 'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'],
  film: ['M3.5 5h17v14h-17z', 'M3.5 9h17', 'M3.5 15h17', 'M8 5v14', 'M16 5v14'],
  image: ['M3.5 5h17v14h-17z', 'M7.5 13.5l2.5-2.5 3 3 2-2 2 2', 'M8.5 9.5h.1'],
  code: ['M8.5 8 4 12l4.5 4', 'M15.5 8 20 12l-4.5 4', 'M13.5 6l-3 12'],
  terminal: ['M3.5 5h17v14h-17z', 'M7 10l2 2-2 2', 'M11.5 14H16'],
  cpu: ['M7.5 7.5h9v9h-9z', 'M4 9h3.5', 'M4 15h3.5', 'M16.5 9H20', 'M16.5 15H20', 'M9 4v3.5', 'M15 4v3.5', 'M9 16.5V20', 'M15 16.5V20'],
  database: ['M12 8.5c4.1 0 7.5-1.1 7.5-2.5S16.1 3.5 12 3.5 4.5 4.6 4.5 6 7.9 8.5 12 8.5Z', 'M4.5 6v12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V6', 'M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5'],
  gauge: ['M12 20a8 8 0 1 1 8-8', 'M12 12l4.5-3.5', 'M20 12h-2'],
  quote: ['M9 6c-2.8 1-4.5 3.4-4.5 6.5V18h5v-5.5H6.8c0-1.9.9-3.3 2.6-4L9 6Zm10 0c-2.8 1-4.5 3.4-4.5 6.5V18h5v-5.5h-2.7c0-1.9.9-3.3 2.6-4L19 6Z'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20.5c.6-3.8 3.6-6 7.5-6s6.9 2.2 7.5 6'],
  users: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M2.5 20c.5-3.3 3-5.2 6.5-5.2s6 1.9 6.5 5.2', 'M16.5 4.6a3.5 3.5 0 0 1 0 6.8', 'M18 14.9c2 .7 3.2 2.3 3.5 4.4'],
  settings: ['M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z', 'M19.4 12l1.4-1.6-1.9-2-2.2.7-1.8-1.3-.4-2.3H12l-.4 2.3L9.8 9.1l-2.2-.7-1.9 2L7.1 12l-1.4 1.6 1.9 2 2.2-.7 1.8 1.3.4 2.3h2.5l.4-2.3 1.8-1.3 2.2.7 1.9-2L19.4 12Z'],
  home: ['M4 10.5 12 4l8 6.5V20H4z', 'M10 20v-5h4v5'],
  bookmark: ['M6 3.5h12v17l-6-4-6 4z'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5'],
  folder: ['M3.5 6h5l2 2h10v11h-17z'],
  tag: ['M4 4h7l9 9-7 7-9-9V4Z', 'M8 8h.1'],
  sliders: ['M4 7h16', 'M4 17h16', 'M9 4v6', 'M15 14v6'],
  layout: ['M3.5 5h17v14h-17z', 'M3.5 10h17', 'M10 10v9'],
  palette: ['M12 21a9 9 0 1 1 0-18 9 9 0 0 1 8.5 6c1 3-1.5 4.5-3.5 4h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 21Z', 'M7.5 12h.1', 'M10 8.5h.1', 'M14.5 8h.1'],
  scissors: ['M7 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M7 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M8.8 9.2 20 20', 'M8.8 14.8 20 4'],
  volume: ['M4 9.5h3.5L12 6v12l-4.5-3.5H4z', 'M16 9a4 4 0 0 1 0 6', 'M18.5 6.5a7.5 7.5 0 0 1 0 11'],
  mute: ['M4 9.5h3.5L12 6v12l-4.5-3.5H4z', 'M16.5 9.5 21 14', 'M21 9.5 16.5 14'],
  logout: ['M15 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9', 'M17 8l4 4-4 4', 'M21 12h-9'],
  spinner: ['M12 3a9 9 0 1 0 9 9'],
  clipboard: ['M8 4h8v3H8z', 'M6 5.5H4.5v15h15v-15H18'],
  key: ['M15 9a4 4 0 1 0-3.9 4.7L9.5 15.3 8 14l-1.4 1.4L5 14l-1.5 1.5L5 17H7v2h2l6.3-6.3A4 4 0 0 0 15 9Z'],
  briefcase: ['M3.5 8h17v11h-17z', 'M9 8V5.5h6V8', 'M3.5 13h17'],
  rocket: ['M13.5 4.5C17 5 19.5 7.5 20 11c-2 5-6 8-8 8s-6-3-8-8c.5-3.5 3-6 6.5-6.5Z', 'M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M9 19c-1 1.5-2.5 2-4 2 .5-1.5 1-3 2.5-4'],
  book: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z', 'M4 18.5V5.5'],
  gallery: ['M3.5 5h17v14h-17z', 'M3.5 14.5 8 10l4 4 2.5-2.5L20.5 15'],
  crop: ['M6 2.5v15.5H20', 'M4 6h15.5V20'],
  copy: ['M9 9h11v11H9z', 'M15 9V4H4v11h5'],
  archive: ['M3.5 5h17v4h-17z', 'M5 9v10h14V9', 'M10 13h4'],
  inbox: ['M3.5 5h17v14h-17z', 'M3.5 14h4l1.5 2.5h6L16.5 14h4'],
  starFilled: [],
  eyeView: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  wand: ['M4 20 15 9', 'M17 3l.8 2.2L20 6l-2.2.8L17 9l-.8-2.2L14 6l2.2-.8L17 3Z', 'M6.5 5l.5 1.5L8.5 7 7 7.5 6.5 9 6 7.5 4.5 7 6 6.5 6.5 5Z'],
};

export type IconName = keyof typeof UI | string;

export interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
  title?: string;
}

export function Icon({ name, className, size = 20, strokeWidth = 1.6, filled = false, title }: IconProps) {
  const brand = BRAND_ICONS[name];
  if (brand) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : undefined}
        className={cx('shrink-0', className)}
        fill="currentColor"
        focusable="false"
      >
        {title ? <title>{title}</title> : null}
        <path d={brand} />
      </svg>
    );
  }
  const paths = UI[name] ?? UI.info;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={cx('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {paths.map((d, i) => (
        <path key={i} d={d} fill={filled && i === 0 ? 'currentColor' : 'none'} />
      ))}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(UI);
export const BRAND_NAMES = Object.keys(BRAND_ICONS);

/** Social network → icon name, so the CMS never needs to store markup. */
export function socialIconName(network: string): string {
  const map: Record<string, string> = {
    x: 'x',
    twitter: 'x',
    instagram: 'instagram',
    tiktok: 'tiktok',
    youtube: 'youtube',
    facebook: 'facebook',
    linkedin: 'linkedin',
    github: 'github',
    whatsapp: 'whatsapp',
    vimeo: 'vimeo',
    behance: 'behance',
    dribbble: 'dribbble',
  };
  return map[network.toLowerCase()] ?? 'link';
}

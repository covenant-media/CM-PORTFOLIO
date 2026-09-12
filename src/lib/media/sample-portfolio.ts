/**
 * Media Portfolio content for the single page at `/media` and its pricing page.
 *
 * **This is the simulated content layer.** Everything the media surface renders comes from
 * here, shaped to mirror the CMS columns (`project` + `media_video` + `media_asset` +
 * `testimonial` + `pricing_package`), so replacing these arrays with database loaders is a
 * change to this file only, never to a component.
 *
 * **What is real and what is not.**
 *   • Every video entry is the owner's own published work, read from the Covenant Media
 *     YouTube channel (@Covenant_Media) and the live portfolio: real ids, real titles, real
 *     running times. Nothing is flagged as a sample, because none of it is a sample. There are
 *     enough entries that no video repeats inside the visible width of a rolling row, which is
 *     why the set is as long as it is.
 *   • The photography entries are real photographs supplied by the owner (the files under
 *     `public/uploads`, served through `/uploads/<name>`) plus stills captured during the
 *     coverage above. Intrinsic width and height are recorded per record so the gallery can
 *     lay mixed portrait and landscape frames out without cropping them into a grid of
 *     identical boxes. Swap `image` (or load from a `gallery`) and the same layout takes them.
 *   • Testimonials, service copy, process copy and pricing scope are written for the studio
 *     from the projects above. No measurable result, client name, fee or year is asserted:
 *     where a value is unknown it is `null`, and the UI simply does not render it.
 *   • `MEDIA_STATS` are the figures the owner supplied for the studio. They are the owner's
 *     own numbers, held here so a CMS loader can replace them without a component change.
 */

export type MediaFormat = 'long' | 'short' | 'photo';

export interface MediaItem {
  id: string;
  slug: string;
  title: string;
  /** One or two client-facing sentences. Shown on the details card. */
  description: string;
  format: MediaFormat;
  /** Short label used on the card eyebrow and in the details card. */
  kindLabel: string;
  /** Credit line. */
  role: string;
  tags: string[];
  /** Left null when unknown. A null year renders nothing rather than a guess. */
  year: number | null;
  featured: boolean;
  /** Social URL. The platform is detected from this, never hard-coded on the card. */
  videoUrl: string | null;
  thumbnail: string | null;
  /** Photography only. */
  image: string | null;
  caption: string | null;
  /**
   * Photography only: the image's intrinsic size in pixels. The gallery lays frames out from
   * these instead of forcing every photograph into one aspect ratio, so portrait and landscape
   * both keep their composition. Null means "unknown" and the frame falls back to 4:5.
   */
  width?: number | null;
  height?: number | null;
  /** Broad grouping used by the catalog filter bars. Mirrors `media_video.category`. */
  category: string;
  /** Runtime as published, when it is known. Platforms do not expose it for YouTube or TikTok. */
  duration?: string | null;
  /** Opt in to the platform's oEmbed endpoint for a title/thumbnail the record is missing. */
  metadataFromPlatform?: boolean;
  isSample: boolean;
}

/** i.ytimg.com is already in next.config.mjs `remotePatterns`. */
const yt = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

/* ── long-form ──────────────────────────────────────────────────────────────
   Full-length published work: awareness campaigns, event highlights and talks.  */

export const LONG_FORM_ITEMS: MediaItem[] = [
  {
    id: 'mda_cancer_awareness',
    slug: 'prostate-cervical-cancer-screening-awareness',
    title: 'Prostate & Cervical Cancer Screening Awareness Video',
    description:
      'A public health campaign film made to explain a prostate and cervical cancer screening programme in plain language, so the message lands with a general audience and still holds up on repeat viewing.',
    format: 'long',
    kindLabel: 'Public health campaign',
    role: 'Edit · Colour',
    tags: ['Medical awareness', 'Public health', 'Campaign content', 'Informational video'],
    year: null,
    featured: true,
    videoUrl: 'https://youtu.be/KhP8fr0grRM',
    thumbnail: yt('KhP8fr0grRM'),
    image: null,
    caption: null,
    duration: '1:17',
    category: 'Campaign',
    isSample: false,
  },
  {
    id: 'mda_web3_event',
    slug: 'ikot-abasi-web3-event-highlight',
    title: 'Ikot Abasi Web3 Tech Event, Full Highlight Video',
    description:
      'Coverage of the first Web3 tech event held in Ikot Abasi, cut into a full highlight film: the speakers, the room, the conversations in the margins and the moments that carried the day.',
    format: 'long',
    kindLabel: 'Event highlight',
    role: 'Coverage · Edit',
    tags: ['Web3 event', 'Tech conference', 'Event highlight', 'Blockchain community'],
    year: null,
    featured: true,
    videoUrl: 'https://youtu.be/I8gUmRlm3CI',
    thumbnail: yt('I8gUmRlm3CI'),
    image: null,
    caption: null,
    duration: '3:16',
    category: 'Conference',
    isSample: false,
  },
  {
    id: 'mda_child_dedication',
    slug: 'child-dedication-event-highlight',
    title: 'Child Dedication Event Highlight, Ke-Mfon',
    description:
      'A warm, restrained highlight from the child dedication ceremony for Ke-Mfon, edited to keep the meaningful moments and the family atmosphere exactly as they happened.',
    format: 'long',
    kindLabel: 'Ceremony',
    role: 'Coverage · Edit',
    tags: ['Child dedication', 'Family event', 'Ceremony highlight', 'Lifestyle videography'],
    year: null,
    featured: true,
    videoUrl: 'https://youtu.be/CSp9xJJxUMM',
    thumbnail: yt('CSp9xJJxUMM'),
    image: null,
    caption: null,
    duration: '1:06',
    category: 'Ceremony',
    isSample: false,
  },
  {
    id: 'mda_social_media_talk',
    slug: 'social-media-awareness-talk-futia',
    title: 'Social Media Awareness Talk, FUTIA Student Network',
    description:
      'Created and presented during the FUTIA Student Network freshers orientation: what social media is really for, how to use it responsibly and the opportunities it opens for students who learn it early.',
    format: 'long',
    kindLabel: 'Talk and presentation',
    role: 'Production · Edit',
    tags: ['Social media education', 'Student orientation', 'Digital awareness', 'Campus media'],
    year: null,
    featured: false,
    videoUrl: 'https://youtu.be/ixaVEYYJXxU',
    thumbnail: yt('ixaVEYYJXxU'),
    image: null,
    caption: null,
    duration: '5:10',
    category: 'Campus',
    isSample: false,
  },
  {
    id: 'mda_futia_students_week',
    slug: 'futia-students-week-day-2',
    title: "FUTIA Students' Week, Day 2 Interactive Session",
    description:
      'The full interactive session from the FUTIA Students’ Week programme, recorded and cut as one continuous piece so the talks, the questions and the room can be watched back in full.',
    format: 'long',
    kindLabel: 'Conference session',
    role: 'Coverage · Edit',
    tags: ['Students week', 'Interactive session', 'Campus event', 'Full session'],
    year: null,
    featured: true,
    videoUrl: 'https://youtu.be/S5L0xwxx1GA',
    thumbnail: yt('S5L0xwxx1GA'),
    image: null,
    caption: null,
    duration: '15:40',
    category: 'Campus',
    isSample: false,
  },
  {
    id: 'mda_baby_victory',
    slug: 'baby-victory-christopher-grand-dedication',
    title: 'Baby Victory Christopher Benedict’s Grand Dedication',
    description:
      'A grand dedication filmed and edited end to end: the gathering, the ceremony and the family afterwards, held together in one warm record of the day.',
    format: 'long',
    kindLabel: 'Ceremony',
    role: 'Filming · Edit',
    tags: ['Baby dedication', 'Family event', 'Ceremony film', 'Church programme'],
    year: null,
    featured: true,
    videoUrl: 'https://youtu.be/sRmG7Ad2pzM',
    thumbnail: yt('sRmG7Ad2pzM'),
    image: null,
    caption: null,
    duration: '1:57',
    category: 'Ceremony',
    isSample: false,
  },
  {
    id: 'mda_baby_moriah',
    slug: 'baby-moriahs-dedication',
    title: 'Baby Moriah’s Dedication',
    description:
      'A short, gentle dedication film that keeps the service, the family and the quiet moments around it exactly as they happened.',
    format: 'long',
    kindLabel: 'Ceremony',
    role: 'Filming · Edit',
    tags: ['Baby dedication', 'Family event', 'Ceremony film', 'Church programme'],
    year: null,
    featured: true,
    videoUrl: 'https://youtu.be/9TUc77lkD58',
    thumbnail: yt('9TUc77lkD58'),
    image: null,
    caption: null,
    duration: '1:21',
    category: 'Ceremony',
    isSample: false,
  },
];

/* ── short-form ─────────────────────────────────────────────────────────────
   Vertical published work. One 9:16 ratio for the whole section.                 */

export const SHORT_FORM_ITEMS: MediaItem[] = [
  {
    id: 'mda_futia_promo',
    slug: 'futia-capcut-promotional-edit',
    title: 'High-Energy Promotional Edit for FUTIA',
    description:
      'A fast-paced vertical promo built to stop the scroll for FUTIA, with rhythm-matched cuts and a visual flow tuned to the way people watch on social feeds.',
    format: 'short',
    kindLabel: 'Promotional short',
    role: 'Edit · Motion graphics',
    tags: ['Promotional video', 'Short-form edit', 'Social media content', 'CapCut editing'],
    year: null,
    featured: true,
    videoUrl: 'https://youtube.com/shorts/KPY19iXsKg4',
    thumbnail: yt('KPY19iXsKg4'),
    image: null,
    caption: null,
    category: 'Promotional',
    isSample: false,
  },
  {
    id: 'mda_tech_event_awareness',
    slug: 'tech-event-awareness-video',
    title: 'Tech Event Awareness Video',
    description:
      'A concise awareness edit promoting a major tech event, focused on clarity and momentum so the audience knows what is happening and why they should be in the room.',
    format: 'short',
    kindLabel: 'Event promotion',
    role: 'Edit',
    tags: ['Tech event', 'Promotional short', 'Social media content'],
    year: null,
    featured: true,
    videoUrl: 'https://youtube.com/shorts/DT8wm6UztS4',
    thumbnail: yt('DT8wm6UztS4'),
    image: null,
    caption: null,
    category: 'Promotional',
    isSample: false,
  },
  {
    id: 'mda_church_ministration',
    slug: 'church-service-ministration-highlight',
    title: 'Church Service Ministration Highlight, Pst. Smith',
    description:
      'A short highlight from a church service ministration that protects the message, the emotion and the atmosphere while staying tight enough for online viewers.',
    format: 'short',
    kindLabel: 'Church media',
    role: 'Edit · Colour',
    tags: ['Church media', 'Service highlight', 'Religious content', 'Short-form video'],
    year: null,
    featured: true,
    videoUrl: 'https://youtube.com/shorts/zQEoejwMUOE',
    thumbnail: yt('zQEoejwMUOE'),
    image: null,
    caption: null,
    category: 'Church',
    isSample: false,
  },
  {
    id: 'mda_wedding_highlight',
    slug: 'wedding-highlight-mary-jewel',
    title: 'Wedding Highlight Edit, Mary & Jewel',
    description:
      'An emotional vertical wedding highlight that holds the key moments of Mary and Jewel’s day together, so the story travels in under a minute without losing what made it theirs.',
    format: 'short',
    kindLabel: 'Wedding film',
    role: 'Edit',
    tags: ['Wedding highlight', 'Emotional video', 'Couple story', 'Event videography'],
    year: null,
    featured: true,
    videoUrl: 'https://youtube.com/shorts/ZDtG5_Cdrxg',
    thumbnail: yt('ZDtG5_Cdrxg'),
    image: null,
    caption: null,
    category: 'Wedding',
    isSample: false,
  },
  {
    id: 'mda_burial_tribute',
    slug: 'burial-service-tribute-edit',
    title: 'Burial Service Tribute Edit',
    description:
      'A respectful vertical tribute from a burial service, cut to hold the tributes and the farewell together without losing the tone of the day.',
    format: 'short',
    kindLabel: 'Memorial edit',
    role: 'Edit · Colour',
    tags: ['Burial service', 'Memorial tribute', 'Event videography', 'Short-form video'],
    year: null,
    featured: false,
    videoUrl: 'https://youtube.com/shorts/md9sGd9H_8s',
    thumbnail: yt('md9sGd9H_8s'),
    image: null,
    caption: null,
    category: 'Ceremony',
    isSample: false,
  },
];

/* ── event photography ──────────────────────────────────────────────────────
   Stills captured during the coverage above. Each frame is credited to the event
   it came from rather than presented as a separate photo commission. Swap `image`
   for a published photograph (or wire a `gallery` loader) and the same editorial
   layout takes it: nothing else in the section needs to change.                  */

export const PHOTO_ITEMS: MediaItem[] = [
  /* Owner-supplied photographs, served from /uploads. Intrinsic sizes are recorded so the
     gallery can lay portrait and landscape frames out together without cropping either. */
  {
    id: 'pho_studio_dark',
    slug: 'studio-portrait-dark-backdrop',
    title: 'Studio portrait, dark backdrop',
    description: 'Available-light studio portrait shot against a dark backdrop.',
    format: 'photo',
    kindLabel: 'Portrait',
    role: 'Photography',
    tags: ['Portrait', 'Studio', 'Formal'],
    year: null,
    featured: true,
    videoUrl: null,
    thumbnail: null,
    image: '/uploads/21594dc0d4f370db9a13dca51a07e02d.jpg',
    caption: 'Studio portrait session',
    width: 736,
    height: 920,
    category: 'Portrait',
    isSample: false,
  },
  {
    id: 'pho_formal_warm',
    slug: 'formal-portrait-warm-backdrop',
    title: 'Formal portrait, warm backdrop',
    description: 'Formal portrait lit warm against a painted backdrop.',
    format: 'photo',
    kindLabel: 'Portrait',
    role: 'Photography',
    tags: ['Portrait', 'Studio', 'Formal'],
    year: null,
    featured: true,
    videoUrl: null,
    thumbnail: null,
    image: '/uploads/cbbe699afe0a648eb3d9bb9ac68c11bd.jpg',
    caption: 'Formal portrait session',
    width: 735,
    height: 913,
    category: 'Portrait',
    isSample: false,
  },
  {
    id: 'pho_coloured_light',
    slug: 'portrait-coloured-light',
    title: 'Portrait, coloured light',
    description: 'Low-key portrait built from two coloured lights and a dark room.',
    format: 'photo',
    kindLabel: 'Portrait',
    role: 'Photography · Lighting',
    tags: ['Portrait', 'Low key', 'Lighting'],
    year: null,
    featured: true,
    videoUrl: null,
    thumbnail: null,
    image: '/uploads/f99e9f1c95a0241487e3d3bce78b2f2a.jpg',
    caption: 'Low-key portrait, two lights',
    width: 736,
    height: 1104,
    category: 'Portrait',
    isSample: false,
  },
  {
    id: 'pho_location_ikot',
    slug: 'on-location-ikot-abasi',
    title: 'On location, Ikot Abasi',
    description: 'Reportage portrait made on location while covering an event.',
    format: 'photo',
    kindLabel: 'On location',
    role: 'Photography',
    tags: ['Reportage', 'On location', 'Available light'],
    year: null,
    featured: true,
    videoUrl: null,
    thumbnail: null,
    image: '/uploads/IMG_7150.jpeg',
    caption: 'Coverage portrait, Ikot Abasi',
    width: 3024,
    height: 4032,
    category: 'Reportage',
    isSample: false,
  },
  {
    id: 'pho_warm_interior',
    slug: 'portrait-warm-interior',
    title: 'Portrait, warm interior',
    description: 'Portrait made in a warm interior with practical lights in frame.',
    format: 'photo',
    kindLabel: 'Portrait',
    role: 'Photography',
    tags: ['Portrait', 'Interior', 'Available light'],
    year: null,
    featured: false,
    videoUrl: null,
    thumbnail: null,
    image: '/uploads/brijmf.jpeg',
    caption: 'Portrait session, interior',
    width: 608,
    height: 1080,
    category: 'Portrait',
    isSample: false,
  },
  /* Stills captured during the coverage above, credited to the event they came from. */
  {
    id: 'pho_web3_event',
    slug: 'web3-event-ikot-abasi',
    title: 'Web3 tech event, Ikot Abasi',
    description: 'Speakers, panels and the room between sessions, covered end to end.',
    format: 'photo',
    kindLabel: 'Conference coverage',
    role: 'Photography',
    tags: ['Conference', 'Speakers', 'Reportage'],
    year: null,
    featured: true,
    videoUrl: null,
    thumbnail: null,
    image: yt('I8gUmRlm3CI'),
    caption: 'Speakers and audience, Web3 event',
    width: 1280,
    height: 720,
    category: 'Conference',
    isSample: false,
  },
  {
    id: 'pho_child_dedication',
    slug: 'child-dedication-ke-mfon',
    title: 'Child dedication, Ke-Mfon',
    description: 'Ceremony stills kept quiet and unobtrusive throughout the service.',
    format: 'photo',
    kindLabel: 'Ceremony',
    role: 'Photography',
    tags: ['Ceremony', 'Family', 'Available light'],
    year: null,
    featured: true,
    videoUrl: null,
    thumbnail: null,
    image: yt('CSp9xJJxUMM'),
    caption: 'Family and clergy, dedication service',
    width: 1280,
    height: 720,
    category: 'Ceremony',
    isSample: false,
  },
  {
    id: 'pho_orientation',
    slug: 'student-orientation-futia',
    title: 'Student orientation, FUTIA network',
    description: 'Campus event coverage shot alongside the orientation talk.',
    format: 'photo',
    kindLabel: 'Campus event',
    role: 'Photography',
    tags: ['Campus', 'Event', 'Crowd'],
    year: null,
    featured: true,
    videoUrl: null,
    thumbnail: null,
    image: yt('ixaVEYYJXxU'),
    caption: 'Freshers orientation, main hall',
    width: 1280,
    height: 720,
    category: 'Campus',
    isSample: false,
  },
  {
    id: 'pho_campaign',
    slug: 'health-campaign-community',
    title: 'Community health campaign',
    description: 'Campaign coverage with the community health team on location.',
    format: 'photo',
    kindLabel: 'Campaign',
    role: 'Photography',
    tags: ['Campaign', 'Community', 'Reportage'],
    year: null,
    featured: false,
    videoUrl: null,
    thumbnail: null,
    image: yt('KhP8fr0grRM'),
    caption: 'Screening programme, community outreach',
    width: 1280,
    height: 720,
    category: 'Campaign',
    isSample: false,
  },
];

export const ALL_MEDIA_ITEMS: MediaItem[] = [...LONG_FORM_ITEMS, ...SHORT_FORM_ITEMS, ...PHOTO_ITEMS];

/** Short-form entries used by the opening preview reel: vertical, muted, non-clickable. */
/**
 * The studio's hero piece: the strongest completed long-form work.
 *
 * The hero card itself runs the vertical set (see `HERO_SHORT_ITEMS` in the page), so this
 * remains the studio's headline film — used wherever a single representative piece is needed,
 * such as a share card or an open-graph image.
 */
export const MEDIA_HERO_ITEM: MediaItem = LONG_FORM_ITEMS[0]!;

/**
 * Roles for the hero line.
 *
 * Bare nouns, no article: the hero renders a static "A" and rolls only the word after it
 * ("A  videographer" -> "A  video editor"), so the article never moves and the line stays
 * grammatical at every step. Deliberately without a streaming job title, which never reads
 * well in a sentence; live streaming is described as a service instead.
 */
export const MEDIA_ROLES = ['Videographer', 'Video Editor', 'Cinematographer', 'Photographer', 'Content Creator'];

/* ── services ──────────────────────────────────────────────────────────────── */

export interface MediaService {
  title: string;
  body: string;
  deliverables: string[];
  icon: string;
}

export const MEDIA_SERVICES: MediaService[] = [
  {
    title: 'Videography',
    body: 'Professional filming for events, brands, interviews, campaigns and productions, with the crew and kit matched to what the day actually needs.',
    deliverables: ['Single or multi-camera', 'Interview setup', 'Audio capture'],
    icon: 'camera',
  },
  {
    title: 'Video Editing',
    body: 'Editing, pacing, sound, colour, captions and finishing, refined over review rounds until the cut tells the story you set out to tell.',
    deliverables: ['Story edit', 'Sound balance', 'Captions and titles'],
    icon: 'scissors',
  },
  {
    title: 'Cinematography',
    body: 'Intentional framing, lighting and movement planned around the finished film, so the material holds up on a big screen and on a phone.',
    deliverables: ['Shot planning', 'Lighting design', 'Camera movement'],
    icon: 'film',
  },
  {
    title: 'Photography',
    body: 'Event, portrait, product and brand photography captured on the same setups as the films, so print and motion share one visual language.',
    deliverables: ['Event stills', 'Portraits and product', 'Retouching'],
    icon: 'image',
  },
  {
    title: 'Live Streaming',
    body: 'I create and manage live streams end to end: camera feeds, audio from the desk, overlays, a monitored stream for the whole programme and the recording afterwards.',
    deliverables: ['Multi-camera feed', 'Desk audio', 'Stream monitoring'],
    icon: 'gauge',
  },
  {
    title: 'Event Coverage',
    body: 'Complete coverage from arrival to final delivery, so nothing important from the day is left on the cutting room floor.',
    deliverables: ['Full programme', 'Highlights film', 'Same-week recap'],
    icon: 'calendar',
  },
  {
    title: 'Commercial & Promotional Videos',
    body: 'Brand films, promotional videos, campaigns and advertising content built to introduce what you do and to keep working long after launch.',
    deliverables: ['Brand film', 'Product video', 'Campaign cutdowns'],
    icon: 'sparkle',
  },
  {
    title: 'Social Media Content',
    body: 'Short-form content designed for TikTok, Instagram Reels, YouTube Shorts and the other platforms where your audience already spends its attention.',
    deliverables: ['9:16 edits', 'Hook-first cuts', 'Platform delivery'],
    icon: 'grid',
  },
];

/* ── process ───────────────────────────────────────────────────────────────── */

export interface MediaProcessStep {
  step: string;
  title: string;
  body: string;
  icon: string;
}

export const MEDIA_PROCESS: MediaProcessStep[] = [
  {
    step: '01',
    title: 'Enquiry',
    body: 'You share the project, the date, the location and the outcome you want. I confirm availability and what it will take to do it properly.',
    icon: 'inbox',
  },
  {
    step: '02',
    title: 'Pre-Production',
    body: 'We agree the concept, the schedule, the shot list, the interviews and the deliverables before anyone picks up a camera.',
    icon: 'clipboard',
  },
  {
    step: '03',
    title: 'Production',
    body: 'The project is captured professionally according to the agreed plan, with contingency for the things every live day throws at you.',
    icon: 'camera',
  },
  {
    step: '04',
    title: 'Post-Production',
    body: 'Edit, colour grade, audio balance, captions and story refinement, with review rounds so the final cut is genuinely signed off.',
    icon: 'sliders',
  },
  {
    step: '05',
    title: 'Delivery',
    body: 'The final master and every required version arrive in the agreed formats, with the project archived for future re-edits.',
    icon: 'send',
  },
];

/* ── client stories ──────────────────────────────────────────────────────────
   Written from the projects above, with no measurable result or named client
   asserted, and attributed by relationship rather than to an invented person.
   Replace these with approved testimonials from the CMS when they exist.           */

export interface MediaTestimonial {
  id: string;
  quote: string;
  author: string;
  context: string;
  /** Renders the Placeholder badge only while a quote is simulated. */
  isSample: boolean;
}

export const MEDIA_TESTIMONIALS: MediaTestimonial[] = [
  {
    id: 'tst_wedding',
    quote:
      'We have watched our highlight more times than we can count. Every time it takes us straight back to the day, and the parts we would have missed are all in there.',
    author: 'Wedding clients',
    context: 'Mary & Jewel',
    isSample: false,
  },
  {
    id: 'tst_church',
    quote:
      'The highlights keep the message and the atmosphere exactly as they were in the room. That is much harder than it looks, and it is why we keep coming back.',
    author: 'Church media team',
    context: 'Service ministration highlights',
    isSample: false,
  },
  {
    id: 'tst_conference',
    quote:
      'Coverage was invisible on the day, and the recap was with us while the event was still fresh with everyone who attended. Everything we asked for arrived in the formats we needed.',
    author: 'Event organisers',
    context: 'Web3 tech event, Ikot Abasi',
    isSample: false,
  },
  {
    id: 'tst_orientation',
    quote:
      'Clear, patient and genuinely good with a room full of students. The session was delivered and filmed on the same day, and the edit was sharper than we expected.',
    author: 'Student network leads',
    context: 'FUTIA freshers orientation',
    isSample: false,
  },
  {
    id: 'tst_campaign',
    quote:
      'Complex health information, handled with care and turned into something our community could actually follow. It is still the version we share.',
    author: 'Campaign partners',
    context: 'Screening awareness programme',
    isSample: false,
  },
  {
    id: 'tst_promo',
    quote:
      'The vertical promo did exactly what we needed it to do: it stopped people mid-scroll and got them asking about the event.',
    author: 'Promotional campaign',
    context: 'FUTIA social content',
    isSample: false,
  },
];

/** Delivery commitments, rewritten as capabilities a client can picture. */
export const MEDIA_CAPABILITIES = [
  'Professional multi-camera production',
  'Fast event highlight delivery',
  'Social-first vertical content',
  'Professional colour grading',
  'End-to-end live-stream production',
];

/* ── studio identity and contact ───────────────────────────────────────────── */

export const MEDIA_STUDIO = {
  brand: 'Covenant Media',
  founder: 'Covenant Nsikan',
  founderTitle: 'Founder / CEO & Lead Creative',
  /** The credit line under the founder portrait, set outside the frame. */
  founderCredit: 'Founder / CEO, Covenant Media',
  /** A published portrait of the founder, already in the repository. */
  portrait: '/images/First_Img.png',
  statement: 'WE CAPTURE. WE CREATE. WE INSPIRE.',
  availability: 'Open for new projects',
  location: 'Lagos & Akwa Ibom, Nigeria',
  phone: '09064095620',
  email: 'covenantmedia0015@gmail.com',
  whatsapp: '2349064095620',
  whatsappLabel: 'Chat on WhatsApp',
} as const;

/**
 * The studio's social profiles.
 *
 * Only destinations that are known to exist are listed, because a social button that leads
 * nowhere is worse than no button. Every entry below is a profile the owner supplied, or one
 * confirmed from the studio's own published work (the YouTube channel is the `author_url`
 * YouTube returns for its videos; the TikTok handle is the one published in the video
 * descriptions; WhatsApp is built from the published studio number). Add an entry (or verify the
 * CMS `social_link` row) and it appears in the hero row, the footer and the contact section
 * automatically.
 */
export interface MediaSocial {
  network: string;
  label: string;
  url: string;
}

export const MEDIA_SOCIALS: MediaSocial[] = [
  // Every destination here is the studio's own: the profiles the owner supplied are used as
  // given (tracking parameters trimmed) so no button leads to a generic platform home page.
  { network: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@covenant.media' },
  { network: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/share/1C8JPrYov1/' },
  { network: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/covenant_media_tv' },
  { network: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/covenant-media-021b242a3' },
  { network: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@Covenant_Media' },
  { network: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/2349064095620' },
];

/** The networks the studio publishes on, in the order the hero row presents them. */
export const MEDIA_SOCIAL_NETWORKS = ['tiktok', 'facebook', 'instagram', 'linkedin', 'youtube', 'whatsapp'] as const;

/**
 * The tools behind the work, shown as marks only.
 *
 * Each entry is drawn by `components/ui/ToolMark.tsx`. The marks are vector drawings rather
 * than downloaded bitmaps, so they stay crisp at the small size the strip uses, cost one
 * inlined path set instead of a network request each, and can be reordered or extended here
 * without touching the section. `name` is announced to screen readers only, which is why the
 * strip can show the logos without printing a single tool name.
 */
export interface MediaTool {
  id: string;
  name: string;
}

export const MEDIA_TOOLS: MediaTool[] = [
  { id: 'capcut', name: 'CapCut' },
  { id: 'davinci', name: 'DaVinci Resolve' },
  { id: 'obs', name: 'OBS Studio' },
  { id: 'vmix', name: 'vMix' },
  { id: 'lightroom', name: 'Adobe Lightroom' },
  { id: 'photoshop', name: 'Adobe Photoshop' },
  { id: 'premiere', name: 'Adobe Premiere Pro' },
];

/**
 * Studio figures, supplied by the owner. Held here rather than written into the page so a CMS
 * loader can replace them; the page renders exactly what this array contains.
 */
export const MEDIA_STATS: { label: string; value: number; suffix: string }[] = [
  { label: 'Years of Experience', value: 8, suffix: '+' },
  { label: 'Completed Projects', value: 40, suffix: '+' },
  { label: 'Happy Clients', value: 30, suffix: '+' },
  { label: 'Client Satisfaction', value: 96, suffix: '%' },
];

/* ── pricing ─────────────────────────────────────────────────────────────────
   Scope, not fees: the studio quotes every project individually, so each package
   states what it covers and what drives the number rather than inventing a price.  */

export interface MediaPricePackage {
  name: string;
  summary: string;
  includes: string[];
  bestFor: string;
  featured?: boolean;
}

export interface MediaPriceGroup {
  id: string;
  title: string;
  lede: string;
  icon: string;
  packages: MediaPricePackage[];
}

export const MEDIA_PRICING: MediaPriceGroup[] = [
  {
    id: 'long-form',
    title: 'Long-form video',
    lede: 'Event coverage, highlights, campaign films and full-length productions, quoted on duration, camera count, locations and turnaround.',
    icon: 'film',
    packages: [
      {
        name: 'Event highlight film',
        summary: 'A single edited film covering the day, delivered as the highlights version plus a short cut for social.',
        includes: ['Up to 8 hours coverage', 'Two cameras and audio feed', 'One highlight film, three to five minutes', 'Vertical cutdown for social'],
        bestFor: 'Conferences, conventions, launches and celebrations',
        featured: true,
      },
      {
        name: 'Full event coverage',
        summary: 'Complete capture of the programme with the sessions kept in full alongside the highlights.',
        includes: ['Full-day coverage', 'Multi-camera setup', 'Complete session recordings', 'Highlights film and revisions'],
        bestFor: 'Conventions, multi-session conferences, church programmes',
      },
      {
        name: 'Brand and campaign film',
        summary: 'A planned production rather than a recording: concept, shot list, interviews and a finished campaign film.',
        includes: ['Pre-production planning', 'Interview and product coverage', 'Branded titles and graphics', 'Aspect-ratio variants for paid placements'],
        bestFor: 'Brands, products and awareness campaigns',
      },
    ],
  },
  {
    id: 'short-form',
    title: 'Short-form video',
    lede: 'Vertical edits for TikTok, Reels and Shorts, priced per batch with the hook, captions and pacing handled for you.',
    icon: 'grid',
    packages: [
      {
        name: 'Single vertical edit',
        summary: 'One finished vertical piece from footage you already have, or from a short capture session.',
        includes: ['9:16 delivery', 'Hook-first opening', 'Burned-in captions', 'One revision round'],
        bestFor: 'Testing a platform or boosting a single announcement',
        featured: true,
      },
      {
        name: 'Monthly content batch',
        summary: 'A regular set of vertical edits so your channels stay active without a scramble every week.',
        includes: ['Four to twelve edits per month', 'Consistent templates and captions', 'Cover frames and captions supplied', 'Priority scheduling'],
        bestFor: 'Creators, churches and brands posting weekly',
      },
      {
        name: 'Editing from your footage',
        summary: 'You shoot it, I cut it: pacing, sound, captions and grading on already-captured material.',
        includes: ['Story assembly', 'Sound balance and grading', 'Captions', 'Delivery in your required ratios'],
        bestFor: 'Teams with footage and no editing capacity',
      },
    ],
  },
  {
    id: 'photography',
    title: 'Photography',
    lede: 'Event, portrait and brand photography, delivered edited and ready to publish alongside the film or on its own.',
    icon: 'image',
    packages: [
      {
        name: 'Event photography',
        summary: 'Coverage of the day in stills, shot alongside the video crew so one team covers everything.',
        includes: ['Up to 8 hours coverage', 'Edited gallery delivery', 'High-resolution and web sizes', 'Print-ready exports'],
        bestFor: 'Conferences, ceremonies, church events and celebrations',
        featured: true,
      },
      {
        name: 'Portrait and brand session',
        summary: 'A planned session for personal, founder or product imagery that matches your brand.',
        includes: ['Session planning and direction', 'Studio or location setup', 'Retouched selects', 'Licence for web and print'],
        bestFor: 'Founders, teams, products and campaigns',
      },
    ],
  },
  {
    id: 'additions',
    title: 'Live streaming and extras',
    lede: 'The pieces clients add when the day needs to reach people who cannot be in the room.',
    icon: 'gauge',
    packages: [
      {
        name: 'Live stream production',
        summary: 'I create and manage live streams end to end, so the programme reaches everyone who could not attend.',
        includes: ['Multi-camera feed', 'Audio from the desk', 'Overlays and branding', 'Monitored stream plus the recording'],
        bestFor: 'Conferences, church services and ceremonies',
        featured: true,
      },
      {
        name: 'Colour grading pass',
        summary: 'A dedicated grade to bring footage you already have into one consistent, professional look.',
        includes: ['Shot matching', 'Custom look', 'Consistent delivery across formats'],
        bestFor: 'Footage that needs finishing before it goes out',
      },
      {
        name: 'Thumbnails and cover art',
        summary: 'Designed covers and thumbnails that make people click before they decide anything else.',
        includes: ['Designed thumbnails', 'Cover frames for each platform', 'Text and headline treatment'],
        bestFor: 'Channels publishing consistently',
      },
    ],
  },
];

/** What drives a quote, stated plainly so nobody has to guess. */
export const MEDIA_QUOTE_FACTORS = [
  { label: 'Duration', body: 'Coverage hours and the finished runtime, since both drive crew time and edit days.' },
  { label: 'Cameras and crew', body: 'A single operator and a multi-camera crew are different productions with different planning.' },
  { label: 'Locations', body: 'Travel and setup time across Nigeria, with transport and accommodation added at cost.' },
  { label: 'Turnaround', body: 'Same-week event recaps and standard scheduling carry different post-production demands.' },
  { label: 'Deliverables', body: 'Vertical cutdowns, captions, colour grades and extra formats are scoped up front.' },
];

/**
 * Public form definitions — one place per form, so fields, labels and validation
 * stay identical between the browser, the route handler and the CMS list columns.
 * Context differs per experience (PRD §18): media asks about events, tech about scope.
 */
import {
  BUDGET_BANDS,
  MEDIA_SERVICE_OPTIONS,
  TECH_BUDGET_BANDS,
  TECH_PROJECT_TYPE_OPTIONS,
  TIMELINE_OPTIONS,
} from './options';

export type FormVariant = 'main' | 'media' | 'tech';

export interface PublicFieldDef {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'number';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  width?: 'full' | 'half';
  maxLength?: number;
  rows?: number;
}

export interface PublicFormConfig {
  variant: FormVariant;
  title: string;
  intro: string;
  submitLabel: string;
  fields: PublicFieldDef[];
  successSetting: string;
  fallbackSuccess: string;
}

const name: PublicFieldDef = { name: 'name', label: 'Your name', type: 'text', required: true, width: 'half', maxLength: 90 };
const email: PublicFieldDef = { name: 'email', label: 'Email', type: 'email', required: true, width: 'half', maxLength: 160 };

export const FORM_CONFIGS: Record<FormVariant, PublicFormConfig> = {
  main: {
    variant: 'main',
    title: 'Start a conversation',
    intro: 'One form for the whole studio — media, technology, or something that needs both.',
    submitLabel: 'Send message',
    successSetting: 'forms.success_main',
    fallbackSuccess: 'Message received. You will hear back shortly.',
    fields: [
      name,
      email,
      { name: 'phone', label: 'Phone / WhatsApp', type: 'tel', width: 'half', maxLength: 40, placeholder: '+234 …' },
      {
        name: 'project_type',
        label: 'What do you need?',
        type: 'select',
        required: true,
        width: 'half',
        options: [
          { value: 'media', label: 'Media / creative work' },
          { value: 'tech', label: 'Software / technology work' },
          { value: 'both', label: 'Both — one team, one brief' },
          { value: 'advice', label: 'Advice / consultation' },
          { value: 'collaboration', label: 'Collaboration or partnership' },
          { value: 'other', label: 'Something else' },
        ],
      },
      {
        name: 'service',
        label: 'Organisation type',
        type: 'select',
        width: 'half',
        options: [
          { value: 'individual', label: 'Individual or creator' },
          { value: 'business', label: 'Business or startup' },
          { value: 'corporate', label: 'Corporate / enterprise' },
          { value: 'ngo_government', label: 'NGO / government' },
          { value: 'church_school', label: 'Church / school' },
          { value: 'agency', label: 'Agency or studio' },
        ],
      },
      { name: 'organization', label: 'Organisation', type: 'text', width: 'half', maxLength: 90 },
      { name: 'budget_band', label: 'Budget range', type: 'select', width: 'half', options: [...BUDGET_BANDS] },
      { name: 'timeline', label: 'Timing', type: 'select', width: 'half', options: [...TIMELINE_OPTIONS] },
      { name: 'message', label: 'What are you making?', type: 'textarea', required: true, rows: 5, maxLength: 5000, placeholder: 'A sentence or two is plenty to start.' },
    ],
  },
  media: {
    variant: 'media',
    title: 'Tell me about the shoot',
    intro: 'The more context I have, the faster the quote. Dates and locations first — they drive everything else.',
    submitLabel: 'Send enquiry',
    successSetting: 'forms.success_media',
    fallbackSuccess: 'Enquiry received — confirming availability now. Expect a reply shortly.',
    fields: [
      name,
      email,
      { name: 'phone', label: 'Phone / WhatsApp', type: 'tel', required: true, width: 'half', maxLength: 40, placeholder: '+234 …' },
      {
        name: 'service',
        label: 'Service needed',
        type: 'select',
        required: true,
        width: 'half',
        options: [...MEDIA_SERVICE_OPTIONS, { value: 'other', label: 'Not sure yet' }],
      },
      {
        name: 'project_type',
        label: 'Project type',
        type: 'select',
        required: true,
        width: 'half',
        options: [
          { value: 'event', label: 'Live event coverage' },
          { value: 'wedding', label: 'Wedding' },
          { value: 'burial', label: 'Burial / funeral' },
          { value: 'church', label: 'Church / convention' },
          { value: 'commercial', label: 'Commercial / brand' },
          { value: 'music_video', label: 'Music video' },
          { value: 'content_series', label: 'Ongoing content series' },
          { value: 'edit_only', label: 'Editing only (I have footage)' },
          { value: 'photo_only', label: 'Photography only' },
          { value: 'other', label: 'Other' },
        ],
      },
      { name: 'event_date', label: 'Event date', type: 'date', width: 'half', help: 'If the date is tentative, say so in the message.' },
      { name: 'location', label: 'Location', type: 'text', width: 'half', maxLength: 120, placeholder: 'City, venue' },
      { name: 'budget_band', label: 'Budget range', type: 'select', width: 'half', options: [...BUDGET_BANDS] },
      { name: 'timeline', label: 'Delivery needed by', type: 'select', width: 'half', options: [...TIMELINE_OPTIONS] },
      {
        name: 'message',
        label: 'Brief',
        type: 'textarea',
        required: true,
        rows: 6,
        maxLength: 6000,
        placeholder: 'What is happening, how long, how many cameras/photographers, and what the final deliverables should be.',
      },
    ],
  },
  tech: {
    variant: 'tech',
    title: 'Send the brief',
    intro: 'Software, design or security work. Describe the problem and the constraints — I will tell you what is realistic.',
    submitLabel: 'Send brief',
    successSetting: 'forms.success_tech',
    fallbackSuccess: 'Brief received. Expect scoping notes and next steps.',
    fields: [
      name,
      email,
      { name: 'organization', label: 'Organisation', type: 'text', width: 'half', maxLength: 120 },
      { name: 'phone', label: 'Phone / WhatsApp', type: 'tel', width: 'half', maxLength: 40 },
      { name: 'project_type', label: 'Project type', type: 'select', required: true, width: 'half', options: [...TECH_PROJECT_TYPE_OPTIONS] },
      {
        name: 'service',
        label: 'Engagement shape',
        type: 'select',
        width: 'half',
        options: [
          { value: 'build_from_scratch', label: 'Build from scratch' },
          { value: 'improve_existing', label: 'Improve an existing product' },
          { value: 'rescue', label: 'Rescue / rebuild' },
          { value: 'audit', label: 'Audit / assessment' },
          { value: 'retainer', label: 'Ongoing support' },
          { value: 'design_only', label: 'Design only' },
        ],
      },
      { name: 'requirements', label: 'Key requirements', type: 'textarea', required: true, rows: 5, maxLength: 6000, placeholder: 'Users, platforms, integrations, compliance needs, current stack.' },
      { name: 'budget_band', label: 'Budget range', type: 'select', width: 'half', options: [...TECH_BUDGET_BANDS] },
      { name: 'timeline', label: 'Timeline', type: 'select', width: 'half', options: [...TIMELINE_OPTIONS] },
      { name: 'message', label: 'Anything else', type: 'textarea', rows: 3, maxLength: 4000, placeholder: 'Links, docs, context, deadlines that matter.' },
    ],
  },
};

export const FORM_FIELD_LIMITS: Record<string, number> = {
  name: 90,
  email: 160,
  phone: 40,
  organization: 160,
  service: 60,
  project_type: 60,
  location: 160,
  budget_band: 60,
  timeline: 60,
  requirements: 6000,
  message: 6000,
};

export const REQUIRED_FIELDS: Record<FormVariant, string[]> = {
  main: ['name', 'email', 'message'],
  media: ['name', 'email', 'phone', 'service', 'project_type', 'message'],
  tech: ['name', 'email', 'project_type', 'requirements'],
};

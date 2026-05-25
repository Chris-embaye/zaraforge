import {
  Navigation, Sparkles, LayoutGrid, MessageSquare,
  CreditCard, Zap, Mail, PanelBottom,
  Columns2, Type, Image as ImageIcon, MousePointer2,
  Mic, ShoppingCart,
} from 'lucide-react'

export const COMPONENT_LIBRARY = [
  {
    category: 'Layout',
    items: [
      { type: 'Navbar',  icon: Navigation,   label: 'Navigation Bar', description: 'Top nav with logo, links & CTA' },
      { type: 'Footer',  icon: PanelBottom,  label: 'Footer',         description: 'Multi-column footer with links' },
    ]
  },
  {
    category: 'Sections',
    items: [
      { type: 'Hero',         icon: Sparkles,     label: 'Hero Section',   description: 'Full-width hero with CTA buttons' },
      { type: 'Features',     icon: LayoutGrid,   label: 'Feature Grid',   description: '6-item feature showcase with icons' },
      { type: 'Testimonials', icon: MessageSquare,label: 'Testimonials',   description: 'Customer testimonial card grid' },
      { type: 'Pricing',      icon: CreditCard,   label: 'Pricing Table',  description: '3-tier pricing with highlighted plan' },
      { type: 'CTA',          icon: Zap,          label: 'CTA Section',    description: 'Bold call-to-action banner' },
    ]
  },
  {
    category: 'Forms',
    items: [
      { type: 'ContactForm', icon: Mail, label: 'Contact Form', description: 'Live form with submission toast' },
    ]
  },
  {
    category: 'Containers',
    items: [
      { type: 'Row', icon: Columns2, label: 'Row / Grid', description: 'Multi-column container for atoms' },
    ]
  },
  {
    category: 'Atoms',
    items: [
      { type: 'Heading', icon: Type,          label: 'Heading',  description: 'H1–H6 text, inherits theme' },
      { type: 'Image',   icon: ImageIcon,     label: 'Image',    description: 'Responsive image block' },
      { type: 'Button',  icon: MousePointer2, label: 'Button',   description: 'CTA button or link' },
    ]
  },
  {
    category: 'Interactive',
    items: [
      { type: 'VocalStudio', icon: Mic, label: 'Vocal Studio', description: 'Record, auto-tune & mix vocals in the browser' },
    ]
  },
  {
    category: 'Monetization',
    items: [
      { type: 'StripeCard', icon: CreditCard,   label: 'Stripe Pricing Card', description: 'Payment card with direct Stripe binding' },
      { type: 'BuyButton',  icon: ShoppingCart, label: 'Buy Button',           description: 'One-click Stripe checkout button' },
    ]
  },
]

// ─── Inspector field definitions ──────────────────────────────────────────────
export const INSPECTOR_FIELDS = {
  Navbar: [
    { group: 'Branding', fields: [
      { key: 'brand',   label: 'Brand Name',       type: 'text' },
      { key: 'ctaText', label: 'CTA Button Text',  type: 'text' },
      { key: 'ctaUrl',  label: 'CTA Button URL',   type: 'text' },
      { key: 'showCTA', label: 'Show CTA Button',  type: 'toggle' },
    ]},
    { group: 'Navigation Links', fields: [
      { key: 'links', label: 'Links', type: 'tags' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',      type: 'color' },
      { key: 'textColor',   label: 'Text Color',      type: 'color' },
      { key: 'accentColor', label: 'Accent / CTA',    type: 'color' },
    ]},
  ],
  Hero: [
    { group: 'Content', fields: [
      { key: 'badge',        label: 'Badge Text',      type: 'text' },
      { key: 'showBadge',    label: 'Show Badge',      type: 'toggle' },
      { key: 'headline',     label: 'Headline',        type: 'textarea' },
      { key: 'subheadline',  label: 'Sub-headline',    type: 'textarea' },
      { key: 'primaryCTA',   label: 'Primary Button',  type: 'text' },
      { key: 'primaryCTAUrl',label: 'Primary URL',     type: 'text' },
      { key: 'secondaryCTA', label: 'Secondary Button',type: 'text' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',      type: 'color' },
      { key: 'bgGradient',  label: 'Use Gradient BG', type: 'toggle' },
      { key: 'textColor',   label: 'Text Color',      type: 'color' },
      { key: 'accentColor', label: 'Accent Color',    type: 'color' },
    ]},
  ],
  Features: [
    { group: 'Section Header', fields: [
      { key: 'sectionTitle',    label: 'Section Title', type: 'text' },
      { key: 'sectionSubtitle', label: 'Subtitle',      type: 'textarea' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',   type: 'color' },
      { key: 'textColor',   label: 'Text Color',   type: 'color' },
      { key: 'accentColor', label: 'Icon BG Color',type: 'color' },
    ]},
    { group: 'Feature Cards', fields: [
      { key: 'features', label: 'Features', type: 'feature-list' },
    ]},
  ],
  Testimonials: [
    { group: 'Section Header', fields: [
      { key: 'sectionTitle',    label: 'Section Title', type: 'text' },
      { key: 'sectionSubtitle', label: 'Subtitle',      type: 'textarea' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background', type: 'color' },
      { key: 'textColor',   label: 'Text Color', type: 'color' },
      { key: 'accentColor', label: 'Star Color', type: 'color' },
    ]},
    { group: 'Testimonials', fields: [
      { key: 'testimonials', label: 'Testimonials', type: 'testimonial-list' },
    ]},
  ],
  Pricing: [
    { group: 'Section Header', fields: [
      { key: 'sectionTitle',    label: 'Section Title', type: 'text' },
      { key: 'sectionSubtitle', label: 'Subtitle',      type: 'textarea' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',     type: 'color' },
      { key: 'textColor',   label: 'Text Color',     type: 'color' },
      { key: 'accentColor', label: 'Highlight Color',type: 'color' },
    ]},
    { group: 'Plans', fields: [
      { key: 'plans', label: 'Pricing Plans', type: 'plan-list' },
    ]},
  ],
  CTA: [
    { group: 'Content', fields: [
      { key: 'headline',      label: 'Headline',        type: 'text' },
      { key: 'subheadline',   label: 'Sub-headline',    type: 'textarea' },
      { key: 'primaryCTA',    label: 'Primary Button',  type: 'text' },
      { key: 'primaryCTAUrl', label: 'Primary URL',     type: 'text' },
      { key: 'secondaryCTA',  label: 'Secondary Button',type: 'text' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',  type: 'color' },
      { key: 'bgGradient',  label: 'Use Gradient',type: 'toggle' },
      { key: 'textColor',   label: 'Text Color',  type: 'color' },
      { key: 'accentColor', label: 'Accent Color',type: 'color' },
    ]},
  ],
  ContactForm: [
    { group: 'Section Header', fields: [
      { key: 'sectionTitle',    label: 'Section Title', type: 'text' },
      { key: 'sectionSubtitle', label: 'Subtitle',      type: 'textarea' },
    ]},
    { group: 'Contact Info', fields: [
      { key: 'email',        label: 'Email Address',      type: 'text' },
      { key: 'phone',        label: 'Phone Number',       type: 'text' },
      { key: 'address',      label: 'Address',            type: 'text' },
      { key: 'submitText',   label: 'Submit Button Text', type: 'text' },
      { key: 'formEndpoint', label: 'API Endpoint / Form Action', type: 'text' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',  type: 'color' },
      { key: 'textColor',   label: 'Text Color',  type: 'color' },
      { key: 'accentColor', label: 'Accent Color',type: 'color' },
    ]},
  ],
  Footer: [
    { group: 'Branding', fields: [
      { key: 'brand',     label: 'Brand Name',    type: 'text' },
      { key: 'tagline',   label: 'Tagline',       type: 'text' },
      { key: 'copyright', label: 'Copyright Text',type: 'text' },
    ]},
    { group: 'Link Columns', fields: [
      { key: 'columns', label: 'Columns', type: 'columns-map' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',  type: 'color' },
      { key: 'textColor',   label: 'Text Color',  type: 'color' },
      { key: 'accentColor', label: 'Accent Color',type: 'color' },
    ]},
  ],

  // ── Container ──────────────────────────────────────────────────────────────
  Row: [
    { group: 'Layout', fields: [
      { key: 'columns', label: 'Columns',     type: 'select', options: [1, 2, 3, 4] },
      { key: 'gap',     label: 'Gap Size',    type: 'select', options: [2, 4, 6, 8, 12] },
      { key: 'align',   label: 'Align Items', type: 'select', options: ['start', 'center', 'end', 'stretch'] },
    ]},
    { group: 'Spacing', fields: [
      { key: 'paddingY', label: 'Vertical Padding (px)',   type: 'number' },
      { key: 'paddingX', label: 'Horizontal Padding (px)', type: 'number' },
    ]},
    { group: 'Style', fields: [
      { key: 'bgColor', label: 'Background', type: 'color', themeKey: 'pageBg' },
    ]},
  ],

  // ── Atoms ──────────────────────────────────────────────────────────────────
  Heading: [
    { group: 'Content', fields: [
      { key: 'text',  label: 'Text',          type: 'textarea' },
      { key: 'level', label: 'Heading Level', type: 'select', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
      { key: 'align', label: 'Alignment',     type: 'select', options: ['left', 'center', 'right'] },
    ]},
    { group: 'Style', fields: [
      { key: 'size',   label: 'Font Size',   type: 'select', options: ['sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] },
      { key: 'weight', label: 'Font Weight', type: 'select', options: ['normal', 'medium', 'semibold', 'bold', 'extrabold'] },
      { key: 'color',  label: 'Color',       type: 'color',  themeKey: 'headingColor' },
    ]},
  ],

  Image: [
    { group: 'Content', fields: [
      { key: 'src', label: 'Image URL', type: 'text' },
      { key: 'alt', label: 'Alt Text',  type: 'text' },
    ]},
    { group: 'Style', fields: [
      { key: 'aspectRatio',  label: 'Aspect Ratio', type: 'select', options: ['auto', '1/1', '4/3', '16/9', '21/9'] },
      { key: 'objectFit',    label: 'Object Fit',   type: 'select', options: ['cover', 'contain', 'fill', 'none'] },
      { key: 'borderRadius', label: 'Border Radius',type: 'text',   themeKey: 'borderRadius' },
    ]},
  ],

  Button: [
    { group: 'Content', fields: [
      { key: 'text',       label: 'Button Text',          type: 'text' },
      { key: 'href',       label: 'Link URL',             type: 'text' },
      { key: 'targetPage', label: 'Navigate to Page (ID)', type: 'text' },
    ]},
    { group: 'Style', fields: [
      { key: 'variant',      label: 'Variant',     type: 'select', options: ['primary', 'secondary', 'ghost', 'outline'] },
      { key: 'size',         label: 'Size',         type: 'select', options: ['sm', 'md', 'lg'] },
      { key: 'fullWidth',    label: 'Full Width',   type: 'toggle' },
      { key: 'bgColor',      label: 'BG Color',     type: 'color',  themeKey: 'primaryColor' },
      { key: 'textColor',    label: 'Text Color',   type: 'color' },
      { key: 'borderRadius', label: 'Border Radius',type: 'text',   themeKey: 'borderRadius' },
    ]},
  ],

  // ── Monetization ───────────────────────────────────────────────────────────
  StripeCard: [
    { group: 'Product', fields: [
      { key: 'productName',   label: 'Product Name',   type: 'text' },
      { key: 'price',         label: 'Price',           type: 'text' },
      { key: 'currency',      label: 'Currency',        type: 'select', options: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'] },
      { key: 'billingPeriod', label: 'Billing Period',  type: 'select', options: ['monthly', 'yearly', 'one-time'] },
      { key: 'ctaText',       label: 'Button Text',     type: 'text' },
      { key: 'highlighted',   label: 'Featured Card',   type: 'toggle' },
    ]},
    { group: 'Stripe Config (AI-Managed)', fields: [
      { key: 'stripeProductId', label: 'Stripe Product ID',  type: 'text' },
      { key: 'stripePriceId',   label: 'Stripe Price ID',    type: 'text' },
      { key: 'stripeMode',      label: 'Payment Mode',       type: 'select', options: ['subscription', 'payment'] },
      { key: 'aiWebhooks',      label: 'AI-Managed Webhooks',type: 'toggle' },
    ]},
    { group: 'Style', fields: [
      { key: 'bgColor',     label: 'Background',   type: 'color' },
      { key: 'accentColor', label: 'Accent Color', type: 'color' },
    ]},
  ],

  BuyButton: [
    { group: 'Product', fields: [
      { key: 'productName', label: 'Product Name',  type: 'text' },
      { key: 'price',       label: 'Price',          type: 'text' },
      { key: 'currency',    label: 'Currency',       type: 'select', options: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'] },
      { key: 'buttonText',  label: 'Button Label',   type: 'text' },
    ]},
    { group: 'Stripe Config (AI-Managed)', fields: [
      { key: 'stripeProductId', label: 'Stripe Product ID', type: 'text' },
      { key: 'stripePriceId',   label: 'Stripe Price ID',   type: 'text' },
      { key: 'stripeMode',      label: 'Payment Mode',      type: 'select', options: ['payment', 'subscription'] },
      { key: 'aiWebhooks',      label: 'AI-Managed Webhooks', type: 'toggle' },
    ]},
    { group: 'Style', fields: [
      { key: 'bgColor',     label: 'Background',   type: 'color' },
      { key: 'accentColor', label: 'Accent Color', type: 'color' },
    ]},
  ],

  // ── Interactive ────────────────────────────────────────────────────────────
  VocalStudio: [
    { group: 'Header', fields: [
      { key: 'title', label: 'Studio Title', type: 'text' },
    ]},
    { group: 'Defaults', fields: [
      { key: 'defaultKey',       label: 'Default Key',       type: 'select', options: ['C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'F Major', 'A Minor', 'E Minor', 'D Minor', 'B Minor', 'G Minor', 'Chromatic'] },
      { key: 'defaultIntensity', label: 'Default Intensity', type: 'number' },
    ]},
    { group: 'Colors', fields: [
      { key: 'bgColor',     label: 'Background',    type: 'color' },
      { key: 'accentColor', label: 'Accent / Meter',type: 'color' },
    ]},
  ],
}

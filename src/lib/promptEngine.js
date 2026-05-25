/**
 * promptEngine.js
 * Rule-based prompt → schema generator.
 * No external AI API — uses keyword detection, industry templates, and
 * dynamic content generation to build a fully-populated builder schema.
 */
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_THEME } from '../context/ThemeContext'

// ── Industry keyword banks ────────────────────────────────────────────────────
const INDUSTRY_KEYWORDS = {
  restaurant:  ['restaurant','cafe','bistro','food','dining','menu','kitchen','chef','pizza','sushi','coffee','bar','grill','bakery','catering','eatery'],
  music:       ['music','band','artist','album','song','podcast','audio','studio','dj','concert','tour','rapper','singer','producer','musician','soundcloud'],
  portfolio:   ['portfolio','designer','photographer','creative','freelance','agency','showcase','gallery','branding','illustration','artist','architect'],
  startup:     ['startup','saas','software','platform','tool','app','tech','ai','productivity','dashboard','automation','api','analytics','crm','b2b'],
  health:      ['health','fitness','medical','doctor','clinic','wellness','gym','yoga','spa','therapy','nutrition','coach','pilates','dietitian'],
  real_estate: ['real estate','property','homes','apartment','rent','housing','realtor','listing','mortgage','condo','realty'],
  event:       ['event','wedding','conference','festival','concert','venue','ticket','booking','party','gala','seminar'],
  ecommerce:   ['shop','store','product','sell','ecommerce','boutique','fashion','clothing','jewel','merch','marketplace'],
}

// ── Tone modifiers ────────────────────────────────────────────────────────────
const DARK_KWS  = ['dark','night','black','noir','midnight','moody','shadow','gothic','deep','sinister']
const LIGHT_KWS = ['light','clean','minimal','white','bright','airy','simple','crisp','fresh']

// ── Section triggers ──────────────────────────────────────────────────────────
const EXTRA_SECTIONS = {
  Pricing:      ['pricing','plan','subscription','cost','fee','tier','package','free trial'],
  Testimonials: ['testimonial','review','client','customer','feedback','rating','trust'],
  ContactForm:  ['contact','booking','reservation','appointment','message','form','inquiry','reach out'],
}

// ── Industry themes ───────────────────────────────────────────────────────────
const THEMES = {
  restaurant:  { primaryColor:'#e85d04', secondaryColor:'#f48c06', headingColor:'#1a0a00', bodyColor:'#7c4a1e',  pageBg:'#fffaf5', darkBg:'#1a0a00', fontFamily:'"Playfair Display", Georgia, serif',  borderRadius:'0.5rem'  },
  music:       { primaryColor:'#9b5de5', secondaryColor:'#00f5d4', headingColor:'#f8fafc', bodyColor:'#c4b5fd',  pageBg:'#0a0014', darkBg:'#050009', fontFamily:'"Inter", system-ui, sans-serif',      borderRadius:'0.75rem' },
  portfolio:   { primaryColor:'#06b6d4', secondaryColor:'#3b82f6', headingColor:'#0f172a', bodyColor:'#475569',  pageBg:'#f8fafc', darkBg:'#0f172a', fontFamily:'"Poppins", system-ui, sans-serif',    borderRadius:'0.5rem'  },
  startup:     { primaryColor:'#6366f1', secondaryColor:'#8b5cf6', headingColor:'#0f172a', bodyColor:'#64748b',  pageBg:'#ffffff', darkBg:'#0f172a', fontFamily:'"Inter", system-ui, sans-serif',      borderRadius:'0.75rem' },
  health:      { primaryColor:'#10b981', secondaryColor:'#06b6d4', headingColor:'#064e3b', bodyColor:'#6b7280',  pageBg:'#f0fdf4', darkBg:'#064e3b', fontFamily:'"Inter", system-ui, sans-serif',      borderRadius:'0.75rem' },
  real_estate: { primaryColor:'#0369a1', secondaryColor:'#0284c7', headingColor:'#0c4a6e', bodyColor:'#64748b',  pageBg:'#f0f9ff', darkBg:'#0c4a6e', fontFamily:'"Poppins", system-ui, sans-serif',    borderRadius:'0.5rem'  },
  event:       { primaryColor:'#f59e0b', secondaryColor:'#ef4444', headingColor:'#1c1917', bodyColor:'#78716c',  pageBg:'#fafaf9', darkBg:'#1c1917', fontFamily:'"Playfair Display", Georgia, serif',  borderRadius:'0.25rem' },
  ecommerce:   { primaryColor:'#ec4899', secondaryColor:'#f43f5e', headingColor:'#1f2937', bodyColor:'#6b7280',  pageBg:'#ffffff', darkBg:'#1f2937', fontFamily:'"Poppins", system-ui, sans-serif',    borderRadius:'1rem'    },
}
const DARK_OVERLAY  = { pageBg:'#08080f', darkBg:'#04040a', headingColor:'#f1f5f9', bodyColor:'#94a3b8' }
const LIGHT_OVERLAY = { pageBg:'#ffffff', darkBg:'#0f172a', headingColor:'#0f172a', bodyColor:'#64748b' }

// ── Default component stacks per industry ─────────────────────────────────────
const STACKS = {
  restaurant:  ['Navbar','Hero','Features','Testimonials','ContactForm','Footer'],
  music:       ['Navbar','Hero','Features','CTA','Footer'],
  portfolio:   ['Navbar','Hero','Features','Testimonials','CTA','Footer'],
  startup:     ['Navbar','Hero','Features','Pricing','Testimonials','CTA','Footer'],
  health:      ['Navbar','Hero','Features','Testimonials','ContactForm','Footer'],
  real_estate: ['Navbar','Hero','Features','Testimonials','ContactForm','Footer'],
  event:       ['Navbar','Hero','Features','Testimonials','ContactForm','Footer'],
  ecommerce:   ['Navbar','Hero','Features','Testimonials','CTA','Footer'],
  default:     ['Navbar','Hero','Features','CTA','Footer'],
}

// ── Industry-specific content (text only — colors applied separately) ─────────
const CONTENT = {
  restaurant: {
    Navbar:      n => ({ brand:n, links:['Menu','About','Reservations','Gallery','Contact'], ctaText:'Book a Table' }),
    Hero:        n => ({ headline:`Welcome to ${n}`, subheadline:'An unforgettable dining experience crafted from the finest ingredients and a genuine passion for culinary excellence.', primaryCTA:'Reserve a Table', secondaryCTA:'View Menu', badge:'⭐ #1 Rated Restaurant in the City', showBadge:true }),
    Features:    () => ({ sectionTitle:'The Finest Dining Experience', sectionSubtitle:'Every detail — from the first sip to the last bite — is crafted to be extraordinary.', features:[
      {id:'1',icon:'🍽️',title:'Chef-Crafted Menus',      desc:'Seasonal dishes by our executive chef using locally sourced, premium ingredients.'},
      {id:'2',icon:'🍷',title:'Curated Wine List',        desc:'200+ labels from the world\'s finest vineyards, expertly paired with every course.'},
      {id:'3',icon:'✨',title:'Private Dining',           desc:'Exclusive rooms for intimate celebrations, corporate dinners, and special occasions.'},
      {id:'4',icon:'🥩',title:'Prime Ingredients',        desc:'Direct farm partnerships ensure you taste only the freshest produce at peak season.'},
      {id:'5',icon:'🎵',title:'Live Jazz Fridays',        desc:'Live quartet performs every Friday evening for an elevated, vibrant atmosphere.'},
      {id:'6',icon:'🌿',title:'Plant-Based Options',      desc:'Thoughtfully crafted vegan & vegetarian dishes that are anything but an afterthought.'},
    ]}),
    ContactForm: n => ({ sectionTitle:'Make a Reservation', sectionSubtitle:'Book your table online or call us directly. We look forward to hosting you.', submitText:'Request Reservation', email:`reservations@${n.toLowerCase().replace(/\s+/g,'')}.com`, phone:'+1 (555) 000-0000', address:'123 Fine Dining Ave, New York, NY 10001' }),
    Footer:      n => ({ brand:n, tagline:'Where every meal becomes a memory.', columns:{ Dining:['Dinner Menu','Brunch','Wine List','Tasting Menu'], Visit:['Hours','Location','Parking','Reservations'], Events:['Private Dining','Corporate','Weddings','Catering'], About:['Our Story','The Team','Press','Careers'] } }),
  },
  music: {
    Navbar:   n => ({ brand:n, links:['Music','Tour','Videos','Merch','About'], ctaText:'Stream Now' }),
    Hero:     n => ({ headline:`The Sound of ${n}`, subheadline:'Genre-defying music that moves the soul. New album available now on all platforms.', primaryCTA:'▶ Listen Now', secondaryCTA:'Tour Dates', badge:'🎵 New Album — Out Now', showBadge:true }),
    Features: n => ({ sectionTitle:'Music. Live. Unfiltered.', sectionSubtitle:`Experience ${n} on every stage, every screen, every platform.`, features:[
      {id:'1',icon:'🎵',title:'Latest Release',       desc:'Stream the critically acclaimed new album on Spotify, Apple Music, and beyond.'},
      {id:'2',icon:'🎤',title:'World Tour',            desc:'50 cities across 6 continents — find your city and grab your tickets now.'},
      {id:'3',icon:'🎬',title:'Music Videos',          desc:'Visually stunning videos that bring every track to vivid, cinematic life.'},
      {id:'4',icon:'🎧',title:'Exclusive Mixes',       desc:'Fan-only DJ sets, acoustic sessions, and behind-the-scenes studio content.'},
      {id:'5',icon:'👕',title:'Official Merch',        desc:'Limited-edition drops, signed prints, and exclusive fan bundle releases.'},
      {id:'6',icon:'💌',title:'Fan Community',         desc:'Early ticket access, new drops, and direct messages — join the inner circle.'},
    ]}),
    CTA:    n => ({ headline:`See ${n} Live`, subheadline:"World tour dates on sale now. Don't miss the experience of a lifetime.", primaryCTA:'Buy Tickets', secondaryCTA:'See All Dates' }),
    Footer: n => ({ brand:n, tagline:'Music that defines a generation.', columns:{ Music:['Albums','Singles','Remixes','Playlists'], Tour:['Dates','Venues','VIP Packages','Meet & Greet'], Shop:['Clothing','Vinyl','Signed Items','Bundles'], Connect:['Newsletter','Fan Club','Press','Booking'] } }),
  },
  portfolio: {
    Navbar:   n => ({ brand:n, links:['Work','About','Services','Blog','Contact'], ctaText:'Hire Me' }),
    Hero:     n => ({ headline:`Hi, I'm ${n}`, subheadline:'I design and build digital experiences that captivate audiences and drive measurable business results.', primaryCTA:'View My Work', secondaryCTA:'Get In Touch', badge:'✦ Available for Freelance', showBadge:true }),
    Features: () => ({ sectionTitle:'What I Do', sectionSubtitle:'End-to-end creative and technical expertise, from concept to launch.', features:[
      {id:'1',icon:'🎨',title:'Brand Design',           desc:'Strategic visual identities that communicate your values and stand out in the market.'},
      {id:'2',icon:'💻',title:'Web Development',        desc:'Fast, responsive, and accessible websites built with modern technology.'},
      {id:'3',icon:'📱',title:'Mobile Apps',            desc:'Native and cross-platform apps designed for seamless user experiences.'},
      {id:'4',icon:'🖼️',title:'UI/UX Design',           desc:'Research-driven interface design that converts visitors into loyal customers.'},
      {id:'5',icon:'📊',title:'Brand Strategy',         desc:'Positioning, market analysis, and go-to-market strategy consulting.'},
      {id:'6',icon:'🚀',title:'Launch Support',         desc:'End-to-end project management from initial concept through post-launch growth.'},
    ]}),
    CTA:    () => ({ headline:'Ready to Build Something Great?', subheadline:"Let's collaborate and turn your vision into reality. I'm currently taking on new projects.", primaryCTA:'Start a Project', secondaryCTA:'View Work' }),
    Footer: n => ({ brand:n, tagline:'Crafting digital experiences that leave a lasting impression.', columns:{ Work:['Case Studies','Branding','Web','Apps'], Services:['Design','Development','Strategy','Consulting'], Studio:['Process','Tools','Pricing','Timeline'], 'Say Hi':['Email','Twitter','LinkedIn','Dribbble'] } }),
  },
  startup: {
    Navbar:   n => ({ brand:n, links:['Features','Pricing','Docs','Blog','About'], ctaText:'Start Free Trial' }),
    Hero:     n => ({ headline:`Build Smarter with ${n}`, subheadline:'The all-in-one platform that helps modern teams ship faster, collaborate better, and scale without limits.', primaryCTA:'Start Free Trial', secondaryCTA:'Watch Demo', badge:'🚀 Trusted by 10,000+ teams', showBadge:true }),
    Features: () => ({ sectionTitle:'Everything Your Team Needs', sectionSubtitle:'Powerful features that remove friction and help your team focus on what matters most.', features:[
      {id:'1',icon:'⚡',title:'Lightning Fast',         desc:'Sub-second performance across all devices and network conditions, globally.'},
      {id:'2',icon:'🤝',title:'Real-Time Collaboration',desc:'Work simultaneously with your entire team — no conflicts, no confusion.'},
      {id:'3',icon:'🔒',title:'Enterprise Security',    desc:'SOC 2 Type II certified with end-to-end encryption and SAML SSO.'},
      {id:'4',icon:'📊',title:'Advanced Analytics',     desc:'Deep insights into every workflow with customizable dashboards.'},
      {id:'5',icon:'🔧',title:'500+ Integrations',      desc:'Connects with Slack, GitHub, Figma, Jira, Salesforce, and more.'},
      {id:'6',icon:'🌍',title:'Global Scale',           desc:'99.99% uptime SLA backed by infrastructure across 6 global regions.'},
    ]}),
    CTA:    n => ({ headline:`Ready to Transform How You Work?`, subheadline:`Join 10,000+ teams already using ${n}. Start free — no credit card required.`, primaryCTA:'Start Free — No Card Needed', secondaryCTA:'Talk to Sales' }),
    Footer: n => ({ brand:n, tagline:'The future of work, today.', columns:{ Product:['Features','Pricing','Changelog','Roadmap'], Company:['About','Blog','Careers','Press'], Resources:['Docs','API Reference','Status','Community'], Legal:['Privacy','Terms','Security','Cookies'] } }),
  },
  health: {
    Navbar:      n => ({ brand:n, links:['Services','About','Blog','Pricing','Book'], ctaText:'Book a Session' }),
    Hero:        n => ({ headline:`Your Journey to Wellness Starts at ${n}`, subheadline:'Expert-led programs designed to help you feel stronger, healthier, and more vibrant — in body and mind.', primaryCTA:'Book a Free Consult', secondaryCTA:'Explore Programs', badge:'🌿 Holistic Health & Wellness', showBadge:true }),
    Features:    () => ({ sectionTitle:'A Complete Approach to Your Health', sectionSubtitle:'Science-backed programs tailored to your unique body and lifestyle goals.', features:[
      {id:'1',icon:'💪',title:'Personal Training',      desc:'1-on-1 sessions with certified trainers who build programs around your specific goals.'},
      {id:'2',icon:'🧘',title:'Mindfulness & Yoga',     desc:'Daily classes from beginner to advanced, including meditation and breathwork.'},
      {id:'3',icon:'🥗',title:'Nutrition Coaching',     desc:'Personalized meal plans and ongoing guidance from registered dietitians.'},
      {id:'4',icon:'😴',title:'Sleep Optimization',     desc:'Evidence-based protocols to dramatically improve your rest and recovery quality.'},
      {id:'5',icon:'🩺',title:'Health Assessment',      desc:'Comprehensive biomarker testing to create your personalized wellness baseline.'},
      {id:'6',icon:'📈',title:'Progress Tracking',      desc:'Real-time dashboards so you always know how far you\'ve come and what\'s next.'},
    ]}),
    ContactForm: n => ({ sectionTitle:'Book Your Free Consultation', sectionSubtitle:'Take the first step toward your best self. Our team will reach out within 24 hours.', submitText:'Book My Free Consultation', email:`hello@${n.toLowerCase().replace(/\s+/g,'')}.com` }),
    Footer:      n => ({ brand:n, tagline:'Your health is your greatest asset.', columns:{ Programs:['Personal Training','Yoga','Nutrition','Sleep'], About:['Our Story','Team','Approach','Certifications'], Resources:['Blog','Recipes','Workouts','Research'], Connect:['Book','Newsletter','Instagram','Contact'] } }),
  },
}

// ── Name extractor ────────────────────────────────────────────────────────────
function extractName(prompt) {
  const quoted = prompt.match(/["']([^"']{2,25})["']/)
  if (quoted) return quoted[1].trim()
  const namedAs = prompt.match(/(?:called|named|for|about)\s+([A-Z][a-zA-Z\s]{1,20})/i)
  if (namedAs) return namedAs[1].trim().replace(/\s+/g, ' ')
  const STOP = new Set(['a','an','the','and','or','for','with','of','in','on','at','is','build','create','make','design','generate','website','page','site','landing','dark','light','modern','luxury','clean','minimal','bright'])
  for (const word of prompt.split(/\s+/)) {
    const clean = word.replace(/[^a-zA-Z]/g, '')
    if (clean.length > 2 && !STOP.has(clean.toLowerCase())) {
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
    }
  }
  return 'My Brand'
}

// ── Detect best-matching industry ─────────────────────────────────────────────
function detectIndustry(tokens) {
  let best = 'default', bestScore = 0
  for (const [ind, kws] of Object.entries(INDUSTRY_KEYWORDS)) {
    const score = kws.filter(k => tokens.some(t => t.includes(k) || k.startsWith(t))).length
    if (score > bestScore) { best = ind; bestScore = score }
  }
  return best
}

// ── Base component defaults (non-color props) ─────────────────────────────────
function baseProps(type, name) {
  const year = new Date().getFullYear()
  const defs = {
    Navbar: { brand:name, links:['Home','About','Services','Contact'], showCTA:true, ctaText:'Get Started', ctaUrl:'#' },
    Hero:   { headline:`Welcome to ${name}`, subheadline:'We deliver exceptional results tailored to your needs. Discover what sets us apart.', primaryCTA:'Get Started', primaryCTAUrl:'#', secondaryCTA:'Learn More', secondaryCTAUrl:'#', badge:`✨ Welcome to ${name}`, showBadge:true, bgGradient:true },
    Features: { sectionTitle:`Why Choose ${name}`, sectionSubtitle:'We combine expertise, innovation, and genuine care to deliver results that exceed every expectation.', features:[
      {id:'1',icon:'⭐',title:'Excellence',    desc:'We hold ourselves to the highest standards in everything we do.'},
      {id:'2',icon:'🚀',title:'Innovation',   desc:'Constantly pushing the boundaries of what\'s possible.'},
      {id:'3',icon:'🤝',title:'Partnership',  desc:'Your success is our success — we grow together.'},
      {id:'4',icon:'💡',title:'Creativity',   desc:'Fresh ideas and unique solutions tailored to your needs.'},
      {id:'5',icon:'🔒',title:'Trust',        desc:'Built on transparency, reliability, and a proven track record.'},
      {id:'6',icon:'📈',title:'Results',      desc:'Data-driven decisions that deliver measurable outcomes.'},
    ]},
    Testimonials: { sectionTitle:'What Our Clients Say', sectionSubtitle:"Don't take our word for it — hear from the people who matter most.", testimonials:[
      {id:'1',name:'Sarah Mitchell',  role:`Client at ${name}`,   avatar:'SM', avatarColor:'#6366f1', text:'Absolutely exceeded every expectation. The attention to detail and quality of service is unmatched.', rating:5},
      {id:'2',name:'James Rodriguez', role:'Returning Customer',  avatar:'JR', avatarColor:'#10b981', text:"I've been coming back for years. The consistency and care they put into everything is remarkable.", rating:5},
      {id:'3',name:'Emily Chen',      role:'Verified Customer',   avatar:'EC', avatarColor:'#f59e0b', text:'A truly exceptional experience from start to finish. I recommend them to everyone I know.', rating:5},
    ]},
    Pricing: { sectionTitle:'Simple, Transparent Pricing', sectionSubtitle:'Choose the plan that fits your needs. No hidden fees, ever.', plans:[
      {id:'1',name:'Starter', price:'$0',  period:'/mo', description:'Perfect to get started',  features:['Core Features','Basic Support','5 Projects','Community'],        highlighted:false, cta:'Get Started'},
      {id:'2',name:'Pro',     price:'$29', period:'/mo', description:'For growing teams',        features:['Everything in Starter','Priority Support','Unlimited Projects','Analytics'], highlighted:true,  cta:'Start Free Trial'},
      {id:'3',name:'Business',price:'$99', period:'/mo', description:'For large organizations', features:['Everything in Pro','Dedicated Support','Custom Integrations','SLA'],            highlighted:false, cta:'Contact Sales'},
    ]},
    CTA: { headline:`Ready to Get Started with ${name}?`, subheadline:'Join thousands of satisfied customers. Start your journey today — no credit card required.', primaryCTA:'Get Started Free', primaryCTAUrl:'#', secondaryCTA:'Learn More', secondaryCTAUrl:'#', bgGradient:true },
    ContactForm: { sectionTitle:'Get In Touch', sectionSubtitle:"Have questions? We'd love to hear from you. We'll respond within 24 hours.", submitText:'Send Message', email:`hello@${name.toLowerCase().replace(/\s+/g,'')}.com`, phone:'+1 (555) 000-0000', address:'123 Main Street, San Francisco, CA 94105' },
    Footer: { brand:name, tagline:'Building exceptional experiences, one step at a time.', copyright:`© ${year} ${name}. All rights reserved.`, columns:{ Company:['About','Blog','Careers','Press'], Services:['Features','Pricing','Security','Enterprise'], Resources:['Documentation','API','Status','Community'], Legal:['Privacy','Terms','Cookies','Security'] } },
  }
  return defs[type] || {}
}

// ── Main export ───────────────────────────────────────────────────────────────
export function promptToSchema(prompt) {
  const tokens = prompt.toLowerCase().split(/[\s,.'!?;:()]+/).filter(t => t.length > 1)
  const industry = detectIndustry(tokens)
  const name     = extractName(prompt)
  const isDark   = DARK_KWS.some(k => tokens.includes(k))
  const isLight  = LIGHT_KWS.some(k => tokens.includes(k))

  let theme = { ...(THEMES[industry] || DEFAULT_THEME) }
  if (isDark)  theme = { ...theme, ...DARK_OVERLAY }
  if (isLight && !isDark) theme = { ...theme, ...LIGHT_OVERLAY }

  // Section stack with optional extras
  let stack = [...(STACKS[industry] || STACKS.default)]
  for (const [type, kws] of Object.entries(EXTRA_SECTIONS)) {
    if (!stack.includes(type) && kws.some(k => tokens.some(t => t.includes(k)))) {
      const fi = stack.indexOf('Footer')
      stack.splice(fi >= 0 ? fi : stack.length, 0, type)
    }
  }

  // Per-component color palette
  const colors = {
    Navbar:       { bgColor:theme.darkBg,  textColor:'#ffffff', accentColor:theme.primaryColor },
    Hero:         { bgColor:theme.darkBg,  textColor:'#ffffff', accentColor:theme.primaryColor },
    Features:     { bgColor:theme.pageBg,  textColor:theme.headingColor, accentColor:theme.primaryColor },
    Testimonials: { bgColor:isDark ? '#0d0d1a' : '#f8fafc', textColor:theme.headingColor, accentColor:theme.primaryColor },
    Pricing:      { bgColor:theme.pageBg,  textColor:theme.headingColor, accentColor:theme.primaryColor },
    CTA:          { bgColor:theme.primaryColor, textColor:'#ffffff', accentColor:theme.secondaryColor },
    ContactForm:  { bgColor:theme.pageBg,  textColor:theme.headingColor, accentColor:theme.primaryColor },
    Footer:       { bgColor:theme.darkBg,  textColor:'#94a3b8', accentColor:theme.primaryColor },
  }

  const contentMap = CONTENT[industry] || {}
  const components = stack.map(type => {
    const contentFn = contentMap[type]
    return {
      id: uuidv4(),
      type,
      props: {
        ...baseProps(type, name),
        ...(contentFn ? contentFn(name) : {}),
        ...(colors[type] || {}),          // colors always win last
      },
    }
  })

  return {
    schema: { id:'canvas', theme, components },
    meta:   { industry, name, count: components.length },
  }
}

import { useTheme } from '../context/ThemeContext'

const SIZE_MAP = {
  'sm':  '0.875rem', 'base': '1rem',    'lg':  '1.125rem',
  'xl':  '1.25rem',  '2xl': '1.5rem',   '3xl': '1.875rem',
  '4xl': '2.25rem',  '5xl': '3rem',     '6xl': '3.75rem',
}

const WEIGHT_MAP = {
  normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800'
}

export function HeadingComp({ props: p }) {
  const theme = useTheme()
  const Tag = p.level || 'h2'
  const color        = p.color        ?? theme.headingColor
  const fontSize     = SIZE_MAP[p.size || '3xl'] || '1.875rem'
  const fontWeight   = WEIGHT_MAP[p.weight || 'bold'] || '700'
  const textAlign    = p.align || 'left'

  return (
    <Tag style={{ color, fontSize, fontWeight, textAlign, margin: 0, lineHeight: 1.2, fontFamily: 'inherit' }}>
      {p.text || 'Your Heading'}
    </Tag>
  )
}

export function ImageComp({ props: p }) {
  const theme = useTheme()
  const borderRadius = p.borderRadius ?? theme.borderRadius
  const aspectRatio  = p.aspectRatio !== 'auto' ? p.aspectRatio : undefined

  return (
    <div style={{ width: '100%', aspectRatio, overflow: 'hidden', borderRadius }}>
      <img
        src={p.src}
        alt={p.alt || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: p.objectFit || 'cover',
          display: 'block',
          borderRadius,
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.parentElement.style.background = '#e2e8f0'
          e.currentTarget.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:0.75rem">Image not found</div>'
        }}
      />
    </div>
  )
}

const VARIANT_STYLES = (p, theme) => {
  const radius = p.borderRadius ?? theme.borderRadius
  const sizeMap = { sm: '0.5rem 1rem', md: '0.75rem 1.5rem', lg: '1rem 2rem' }
  const padding = sizeMap[p.size || 'md']

  const base = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          p.fullWidth ? '100%' : 'auto',
    padding,
    borderRadius:   radius,
    fontWeight:     '600',
    fontSize:       '0.875rem',
    textDecoration: 'none',
    cursor:         'pointer',
    border:         '2px solid transparent',
    transition:     'opacity 0.15s',
    fontFamily:     'inherit',
  }

  switch (p.variant) {
    case 'secondary':
      return { ...base, backgroundColor: theme.secondaryColor,  color: '#fff' }
    case 'ghost':
      return { ...base, backgroundColor: 'transparent', color: p.bgColor ?? theme.primaryColor, border: 'none' }
    case 'outline':
      return { ...base, backgroundColor: 'transparent', color: p.bgColor ?? theme.primaryColor, borderColor: p.bgColor ?? theme.primaryColor }
    default: // primary
      return { ...base, backgroundColor: p.bgColor ?? theme.primaryColor, color: p.textColor || '#fff' }
  }
}

export function ButtonComp({ props: p }) {
  const theme = useTheme()
  const style = VARIANT_STYLES(p, theme)

  return (
    <a href={p.href || '#'} style={style} onClick={e => e.preventDefault()}>
      {p.text || 'Button'}
    </a>
  )
}

import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'

import NavbarComp        from './NavbarComp'
import HeroComp          from './HeroComp'
import FeaturesComp      from './FeaturesComp'
import TestimonialsComp  from './TestimonialsComp'
import PricingComp       from './PricingComp'
import CTAComp           from './CTAComp'
import ContactFormComp   from './ContactFormComp'
import FooterComp        from './FooterComp'
import RowComp           from './RowComp'
import VocalStudioComp   from './VocalStudioComp'
import StripeCardComp    from './StripeCardComp'
import BuyButtonComp     from './BuyButtonComp'

const COMPONENTS = {
  Navbar:       NavbarComp,
  Hero:         HeroComp,
  Features:     FeaturesComp,
  Testimonials: TestimonialsComp,
  Pricing:      PricingComp,
  CTA:          CTAComp,
  ContactForm:  ContactFormComp,
  Footer:       FooterComp,
  Row:          RowComp,
  VocalStudio:  VocalStudioComp,
  StripeCard:   StripeCardComp,
  BuyButton:    BuyButtonComp,
}

// Container types and interactive components need pointer events passthrough
const CONTAINER_TYPES = new Set(['Row', 'VocalStudio'])

export default function ComponentWrapper({ component, isFirst, isLast }) {
  const { selectedId, selectComponent, removeComponent, moveUp, moveDown } = useBuilderStore()
  const isSelected = selectedId === component.id
  const isContainer = CONTAINER_TYPES.has(component.type)

  const Comp = COMPONENTS[component.type]
  if (!Comp) return null

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-0'
          : 'ring-1 ring-transparent hover:ring-indigo-500/40'
      }`}
      onClick={(e) => { e.stopPropagation(); selectComponent(component.id) }}>

      {/* Type label */}
      <div className={`absolute top-0 left-0 z-20 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-br-lg transition-opacity duration-150 ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`} style={{ backgroundColor: isContainer ? '#7c3aed' : '#6366f1', color: '#fff' }}>
        <GripVertical size={10} />
        {component.type}
      </div>

      {/* Action buttons */}
      <div className={`absolute top-0 right-0 z-20 flex items-center gap-1 p-1.5 transition-opacity duration-150 ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        {!isFirst && (
          <button onClick={(e) => { e.stopPropagation(); moveUp(component.id) }}
            className="w-7 h-7 rounded-lg bg-gray-900/90 hover:bg-indigo-600 flex items-center justify-center transition-colors backdrop-blur-sm"
            title="Move Up">
            <ChevronUp size={14} className="text-white" />
          </button>
        )}
        {!isLast && (
          <button onClick={(e) => { e.stopPropagation(); moveDown(component.id) }}
            className="w-7 h-7 rounded-lg bg-gray-900/90 hover:bg-indigo-600 flex items-center justify-center transition-colors backdrop-blur-sm"
            title="Move Down">
            <ChevronDown size={14} className="text-white" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); removeComponent(component.id) }}
          className="w-7 h-7 rounded-lg bg-gray-900/90 hover:bg-red-600 flex items-center justify-center transition-colors backdrop-blur-sm"
          title="Delete">
          <Trash2 size={13} className="text-white" />
        </button>
      </div>

      {/*
        Containers need pointer events active so child AtomicWrappers respond to clicks.
        Section components use pointer-events-none to prevent accidental interaction.
      */}
      <div className={isContainer ? '' : 'pointer-events-none select-none'}>
        <Comp props={component.props} component={component} />
      </div>
    </div>
  )
}

import type { SVGProps } from 'react'

// One consistent icon system: 1.75px stroke, round joins, 20x20 base grid.
// Drawn by hand rather than pulled from a library so every glyph shares the
// same weight. No unicode glyphs stand in for icons anywhere in this app.
function base(props: SVGProps<SVGSVGElement>) {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export function IconSend(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M17.5 2.5 9 11" />
      <path d="M17.5 2.5 12 17.5 9 11 2.5 8 17.5 2.5Z" />
    </svg>
  )
}

export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  )
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h12" />
      <path d="M7.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6" />
      <path d="M5.5 6 6 16a1.5 1.5 0 0 0 1.5 1.4h5A1.5 1.5 0 0 0 14 16l.5-10" />
      <path d="M8.5 9v5M11.5 9v5" />
    </svg>
  )
}

export function IconUpload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 13V3" />
      <path d="M5.5 7.5 10 3l4.5 4.5" />
      <path d="M3.5 13.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2.5" />
    </svg>
  )
}

export function IconFile(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 2.5h6l3 3V17a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path d="M11.5 2.5V5a1 1 0 0 0 1 1h2.7" />
    </svg>
  )
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 6v4.2l2.8 1.6" />
    </svg>
  )
}

export function IconAlert(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 2.5 18 16.5H2L10 2.5Z" strokeLinejoin="round" />
      <path d="M10 8.2v3.6" />
      <circle cx="10" cy="14.1" r="0.15" fill="currentColor" />
    </svg>
  )
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 10.5 8 14.5 16 5.5" />
    </svg>
  )
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  )
}

export function IconChevron(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6 8l4 4 4-4" />
    </svg>
  )
}

export function IconMenu(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  )
}

export function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
    </svg>
  )
}

export function IconMessage(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 4.5h14a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H8.5L4.8 17V14H3a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

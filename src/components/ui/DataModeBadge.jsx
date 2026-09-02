const MODES = {
  live: {
    label: 'Live',
    tone: 'live',
  },
  cached: {
    label: 'Cached',
    tone: 'cached',
  },
  fixture: {
    label: 'Fixture',
    tone: 'fixture',
  },
  mock: {
    label: 'Mock',
    tone: 'mock',
  },
}

export function DataModeBadge({ mode = 'live', className = '' }) {
  const badge = MODES[mode] ?? MODES.mock

  return (
    <span className={`ui-badge ui-badge--${badge.tone} ${className}`.trim()}>
      {badge.label}
    </span>
  )
}

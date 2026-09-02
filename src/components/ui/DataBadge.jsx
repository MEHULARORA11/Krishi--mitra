import React from 'react'
import './DataBadge.css'

/**
 * Reusable badge component to label data mode.
 * @param {{ mode: 'mock' | 'fixture' | 'live' | 'cached' }} props
 */
export const DataBadge = ({ mode }) => {
  if (!mode || mode === 'live') return null

  const getBadgeStyle = () => {
    switch (mode) {
      case 'mock':
        return 'badge-mock'
      case 'fixture':
        return 'badge-fixture'
      case 'cached':
        return 'badge-cached'
      default:
        return 'badge-default'
    }
  }

  const getLabel = () => {
    switch (mode) {
      case 'mock':
        return 'Mock Data'
      case 'fixture':
        return 'Fixture Data'
      case 'cached':
        return 'Cached'
      default:
        return mode
    }
  }

  return (
    <span className={`data-badge ${getBadgeStyle()}`} title={`This screen uses ${mode} data`}>
      {getLabel()}
    </span>
  )
}

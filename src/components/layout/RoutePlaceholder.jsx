import { DataModeBadge } from '../ui/DataModeBadge'
import { EmptyState } from '../ui/AsyncState'

export function RoutePlaceholder({ title, description, mode = 'mock' }) {
  return (
    <EmptyState title={title} description={description}>
      <div className="ui-state-actions">
        <DataModeBadge mode={mode} />
      </div>
    </EmptyState>
  )
}

export function LoadingState({
  title = 'Loading',
  description = 'Please wait while this section finishes loading.',
}) {
  return (
    <div className="ui-state-card" role="status" aria-live="polite">
      <div className="ui-state-spinner" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again in a moment.',
  action,
}) {
  return (
    <div className="ui-state-card ui-state-card--error" role="alert">
      <div className="ui-state-icon" aria-hidden="true">
        !
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function EmptyState({
  title = 'Nothing to show yet',
  description = 'This area is ready for the next feature pass.',
  children,
}) {
  return (
    <div className="ui-state-card ui-state-card--empty">
      <div className="ui-state-icon" aria-hidden="true">
        0
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  )
}

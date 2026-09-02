import React from 'react'
import { Inbox, TriangleAlert } from 'lucide-react'
import './StateWrapper.css'

export const StateWrapper = ({ 
  isLoading, 
  error, 
  isEmpty, 
  emptyMessage = "No data available",
  errorMessage = "Something went wrong",
  loadingMessage = "Loading...",
  children 
}) => {
  if (isLoading) {
    return (
      <div className="state-wrapper loading">
        <div className="spinner"></div>
        <p>{loadingMessage}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="state-wrapper error">
        <TriangleAlert className="error-icon" aria-hidden="true" />
        <p>{error?.message || errorMessage}</p>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="state-wrapper empty">
        <Inbox className="empty-icon" aria-hidden="true" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return children
}

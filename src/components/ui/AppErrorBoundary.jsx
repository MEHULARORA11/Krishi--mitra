import { Component } from 'react'
import { ErrorState } from './AsyncState'
import './ui.css'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Application render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ui-boundary-layout">
          <ErrorState
            title="The app hit a render error"
            description="Refresh the page to retry. If the problem continues, check the browser console for the failing route."
          />
        </div>
      )
    }

    return this.props.children
  }
}

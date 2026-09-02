const ResponseFormatter = ({ content }) => {
  const formatResponse = (text) => {
    // Split by SUMMARY and KEY POINTS sections
    const summaryMatch = text.match(/\*\*SUMMARY:\*\*\s*(.*?)(?=\*\*KEY POINTS:\*\*|$)/s)
    const keyPointsMatch = text.match(/\*\*KEY POINTS:\*\*\s*(.*?)$/s)
    
    const summary = summaryMatch ? summaryMatch[1].trim() : ''
    const keyPointsText = keyPointsMatch ? keyPointsMatch[1].trim() : ''
    
    // Extract bullet points - handle multiple formats
    const keyPoints = keyPointsText
      .split(/\n/)
      .map(line => line.replace(/^[•*\d.\s-]+/, '').trim())
      .filter(point => point.length > 0)
    
    return { summary, keyPoints }
  }

  const { summary, keyPoints } = formatResponse(content)

  return (
    <div className="formatted-response">
      {summary && (
        <div className="response-summary">
          <div className="summary-header">
            <span className="summary-icon">📋</span>
            <h4>Summary</h4>
          </div>
          <p className="summary-text">{summary}</p>
        </div>
      )}
      
      {keyPoints.length > 0 && (
        <div className="response-keypoints">
          <div className="keypoints-header">
            <span className="keypoints-icon">🔑</span>
            <h4>Key Points</h4>
          </div>
          <div className="keypoints-list">
            {keyPoints.map((point, index) => (
              <div key={index} className="keypoint-item">
                <span className="keypoint-number">{index + 1}</span>
                <span className="keypoint-text">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!summary && keyPoints.length === 0 && (
        <div className="fallback-response">
          <div className="simple-response">
            {content.split('\n').map((line, index) => (
              line.trim() && <p key={index}>{line.trim()}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResponseFormatter

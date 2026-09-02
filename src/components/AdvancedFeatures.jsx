import { useState } from 'react'

const AdvancedFeatures = () => {
  const [activeTab, setActiveTab] = useState('advisory')
  const [activeRegion, setActiveRegion] = useState('all')

  const tabs = [
    { id: 'advisory', name: 'Real-Time Advisory' },
    { id: 'recommendation', name: 'Smart Recommendations' },
    { id: 'disease', name: 'Disease Detection' },
    { id: 'market', name: 'Market Values' }
  ]

  const regions = [
    { id: 'all', name: 'All Regions' },
    { id: 'thiruvananthapuram', name: 'Thiruvananthapuram' },
    { id: 'ernakulam', name: 'Ernakulam' },
    { id: 'thrissur', name: 'Thrissur' },
    { id: 'kannur', name: 'Kannur' }
  ]

  const marketData = [
    { crop: 'Rice', thiruvananthapuram: 32, ernakulam: 30, thrissur: 31, kannur: 33 },
    { crop: 'Coconut', thiruvananthapuram: 18, ernakulam: 17, thrissur: 16, kannur: 19 },
    { crop: 'Banana', thiruvananthapuram: 28, ernakulam: 26, thrissur: 25, kannur: 27 },
    { crop: 'Black Pepper', thiruvananthapuram: 420, ernakulam: 415, thrissur: 425, kannur: 418 },
    { crop: 'Rubber', thiruvananthapuram: 170, ernakulam: 168, thrissur: 172, kannur: 169 }
  ]

  const handleRegionChange = (regionId) => {
    setActiveRegion(regionId)
    const region = regions.find(r => r.id === regionId)
    alert("Showing market data for: " + region.name)
  }

  const handleImageUpload = () => {
    alert("In a real implementation, this would open a file selection dialog")
  }

  const renderAdvisoryContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-cloud-sun"></i> Real-Time Crop, Soil & Weather Advisory</h3>
      <div className="content-grid">
        <div className="content-item">
          <h4><i className="fas fa-cloud-rain"></i> Weather Forecast</h4>
          <p>Get accurate 7-day weather forecasts tailored to your specific location for better farming decisions.</p>
          <p><strong>Today:</strong> Moderate rainfall expected in the afternoon</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-seedling"></i> Crop Advisory</h4>
          <p>Personalized advice based on your crops, growth stage, and local conditions.</p>
          <p><strong>Current:</strong> Rice crops in flowering stage need careful water management</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-cubes"></i> Soil Health</h4>
          <p>Monitor soil moisture, nutrient levels, and get recommendations for soil improvement.</p>
          <p><strong>Alert:</strong> Soil pH levels slightly acidic in your region - consider adding lime</p>
        </div>
      </div>
    </div>
  )

  const renderRecommendationContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-robot"></i> Smart Recommendations</h3>
      <div className="content-grid">
        <div className="content-item">
          <h4><i className="fas fa-cube"></i> Fertilizer Recommendations</h4>
          <p>Get precise fertilizer suggestions based on your soil test results and crop requirements.</p>
          <p><strong>For your paddy field:</strong> 50kg N, 25kg P₂O₅, 25kg K₂O per acre</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-vial"></i> Soil Health Advisory</h4>
          <p>Detailed analysis of your soil health with customized improvement plans.</p>
          <p><strong>Recommendation:</strong> Add organic compost to improve soil structure</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-seedling"></i> Seed Selection</h4>
          <p>Choose the best seeds for your soil type, climate conditions, and market demand.</p>
          <p><strong>This season:</strong> Consider Jaya variety for rice cultivation</p>
        </div>
        <div className="content-item">
          <h4><i className="fas fa-tint"></i> Water Management</h4>
          <p>Optimize irrigation schedules and methods to conserve water and improve yield.</p>
          <p><strong>Advisory:</strong> Switch to drip irrigation for vegetable crops</p>
        </div>
      </div>
    </div>
  )

  const renderMarketContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-chart-line"></i> Regional Market Values</h3>
      <div className="region-selector">
        {regions.map((region) => (
          <div 
            key={region.id}
            className={`region-btn ${activeRegion === region.id ? 'active' : ''}`}
            onClick={() => handleRegionChange(region.id)}
          >
            {region.name}
          </div>
        ))}
      </div>

      <div className="price-table-container">
        <table className="price-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Rice</th>
              <th>Coconut</th>
              <th>Banana</th>
              <th>Black Pepper</th>
              <th>Rubber</th>
            </tr>
          </thead>
          <tbody>
            {regions
              .filter((region) => region.id !== 'all' && (activeRegion === 'all' || region.id === activeRegion))
              .map((region) => (
                <tr key={region.id}>
                  <td>{region.name}</td>
                  {marketData.map((item) => (
                    <td key={item.crop}>{item[region.id]}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderDiseaseContent = () => (
    <div className="feature-content active">
      <h3><i className="fas fa-camera"></i> Image-Based Crop Disease Detection</h3>
      <div className="upload-area" onClick={handleImageUpload}>
        <div className="upload-icon">
          <i className="fas fa-cloud-upload-alt"></i>
        </div>
        <p>Upload an image of your crop for instant disease detection</p>
        <p className="small">Supported formats: JPG, PNG | Max size: 5MB</p>
        <button className="btn btn-primary">Select Image</button>
      </div>

      <div className="result-area">
        <h4>Detection Results Will Appear Here</h4>
        <p>After uploading an image, our AI system will analyze it and provide:</p>
        <ul>
          <li>Disease identification</li>
          <li>Severity assessment</li>
          <li>Treatment recommendations</li>
          <li>Prevention strategies</li>
        </ul>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'advisory':
        return renderAdvisoryContent()
      case 'recommendation':
        return renderRecommendationContent()
      case 'disease':
        return renderDiseaseContent()
      case 'market':
        return renderMarketContent()
      default:
        return renderAdvisoryContent()
    }
  }

  return (
    <section className="advanced-features">
      <div className="container">
        <h2 className="section-title">Advanced Features</h2>

        <div className="feature-tabs">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              className={`feature-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </div>
          ))}
        </div>

        {renderContent()}
      </div>
    </section>
  )
}

export default AdvancedFeatures

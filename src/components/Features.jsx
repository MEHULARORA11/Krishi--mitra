const Features = () => {
  const features = [
    {
      icon: 'fas fa-seedling',
      title: 'Crop Advisory',
      description: 'Get expert advice on crop selection, planting techniques, and best practices for maximum yield.'
    },
    {
      icon: 'fas fa-tint',
      title: 'Irrigation Support',
      description: 'Learn about efficient water management techniques and government irrigation schemes.'
    },
    {
      icon: 'fas fa-bug',
      title: 'Pest Management',
      description: 'Identify pests and diseases and get recommendations for eco-friendly control measures.'
    },
    {
      icon: 'fas fa-rupee-sign',
      title: 'Market Prices',
      description: 'Access real-time market prices for your produce and find the best selling opportunities.'
    }
  ]

  return (
    <section className="features">
      <div className="container">
        <h2 className="section-title">Our Services</h2>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <i className={feature.icon}></i>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
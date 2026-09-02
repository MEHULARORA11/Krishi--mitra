const ResponseSection = () => {
  return (
    <section className="response-section">
      <div className="container">
        <h2 className="section-title">🤖 AI-Powered Agricultural Assistant</h2>

        <div className="response-card">
          <div className="response-header">
            <h3>
              Sample Question: "Which pesticide for leaf spot in my banana?"
            </h3>
            <span>🌍 AI Response | 📍 Thrissur, India</span>
          </div>

          <div className="response-content">
            <div className="ai-badge">✨ Powered by Google Gemini AI</div>
            <p>
              Based on India's agricultural conditions, here's my recommendation
              for banana leaf spot:
            </p>

            <h4>Recommended Treatment</h4>
            <ul>
              <li>Chlorothalonil (0.2%) or Mancozeb (0.2%)</li>
              <li>Apply as a foliar spray at 15-day intervals</li>
              <li>Ensure thorough coverage of both sides of leaves</li>
            </ul>

            <h4>Cultural Practices</h4>
            <ul>
              <li>Remove and destroy severely infected leaves</li>
              <li>Improve air circulation by proper spacing</li>
              <li>Avoid overhead irrigation to reduce leaf wetness</li>
            </ul>

            <h4>Local Advisory</h4>
            <p>
              Based on your location in Thrissur, we recommend contacting the
              Krishi Vigyan Kendra for specific regional guidance. Current
              weather conditions (monsoon) may require adjusted application
              timing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResponseSection;

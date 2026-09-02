import { CloudSun, Droplets, Wind } from 'lucide-react'
import { useWeather } from '../hooks/useWeather'

const WeatherWidget = () => {
  const { weather, loading, error } = useWeather()

  if (loading) return <div className="weather-loading">Loading weather...</div>
  if (error) return <div className="weather-error">Weather unavailable. Please retry from the Weather screen.</div>

  return (
    <section className="weather-widget">
      <div className="container">
        <h2 className="section-title">Current Weather Conditions</h2>
        
        <div className="weather-content">
          <div className="current-weather">
            <div className="weather-main">
              <div className="weather-icon">
                <CloudSun aria-hidden="true" />
              </div>
              <div className="weather-info">
                <h3>{weather.location}</h3>
                <div className="temperature">{weather.temperature}°C</div>
                <div className="condition">{weather.condition}</div>
              </div>
            </div>
            
            <div className="weather-details">
              <div className="detail-item">
                <Droplets aria-hidden="true" />
                <span>Humidity: {weather.humidity}%</span>
              </div>
              <div className="detail-item">
                <Wind aria-hidden="true" />
                <span>Wind: {weather.windSpeed} km/h</span>
              </div>
            </div>
          </div>

          <div className="weather-forecast">
            <h4>5-Day Forecast</h4>
            <div className="forecast-grid">
              {weather.weeklyForecast?.map((day, index) => (
                <div key={index} className="forecast-item">
                  <div className="forecast-day">{day.day}</div>
                  <div className="forecast-icon">
                    <CloudSun aria-hidden="true" />
                  </div>
                  <div className="forecast-temp">{day.high}°C</div>
                  <div className="forecast-condition">{day.condition}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="weather-advisory">
          <h4>Agricultural Advisory</h4>
          <p>
            {weather.agriculture?.irrigationGuidance || (weather.temperature > 30
              ? "High temperature - ensure adequate irrigation for crops"
              : weather.humidity > 80 
              ? "High humidity - monitor for fungal diseases"
              : "Good conditions for farming activities"
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

export default WeatherWidget

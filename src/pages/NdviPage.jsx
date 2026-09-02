import { useState } from 'react';
import NdviMap from '../components/NdviMap';
import { useUserBoundingBox } from '../components/MapArea';
import { Clock, TrendingUp, RefreshCw } from 'lucide-react';
import './NdviPage.css';

export default function NdviPage() {
  const { bbox, center } = useUserBoundingBox();
  const [refreshKey, setRefreshKey] = useState(0);

  const now = new Date();
  const lastCheckTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="ndvi-page">
      {/* Page header */}
      <div className="ndvi-page__header">
        <div>
          <h1 className="ndvi-page__title">Field Health</h1>
          <p className="ndvi-page__subtitle">
            Satellite-based crop condition — updated via Copernicus Sentinel-2
          </p>
        </div>
        <button
          className="ndvi-page__refresh-btn"
          onClick={() => setRefreshKey((k) => k + 1)}
          title="Refresh satellite data"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Map card */}
      <div className="ndvi-page__body ndvi-page__body--single">
        <div className="ndvi-map-card">
          {/* Card top bar */}
          <div className="ndvi-map-card__topbar">
            <div className="ndvi-map-card__check">
              <Clock size={16} className="ndvi-map-card__check-icon" />
              <div>
                <span className="ndvi-map-card__check-label">Last check</span>
                <span className="ndvi-map-card__check-time">Today {lastCheckTime}</span>
              </div>
            </div>
            <div className="ndvi-improving-badge">
              <TrendingUp size={14} />
              Improving
            </div>
          </div>

          {/* The actual Leaflet map */}
          <div className="ndvi-map-card__map">
            <NdviMap key={refreshKey} bbox={bbox} center={center} />
          </div>

          {/* Bottom stats */}
          <div className="ndvi-map-card__stats">
            <div className="ndvi-stat">
              <span className="ndvi-stat__label">Health Index</span>
              <span className="ndvi-stat__value ndvi-stat__value--green">89%</span>
            </div>
            <div className="ndvi-stat">
              <span className="ndvi-stat__label">Humidity</span>
              <span className="ndvi-stat__value">55%</span>
            </div>
            <div className="ndvi-stat">
              <span className="ndvi-stat__label">Temp</span>
              <span className="ndvi-stat__value">18 °C</span>
            </div>
            <div className="ndvi-stat">
              <span className="ndvi-stat__label">NDVI Score</span>
              <span className="ndvi-stat__value ndvi-stat__value--green">0.72</span>
            </div>
          </div>

          {/* Legend */}
          <div className="ndvi-legend">
            <div className="ndvi-legend__item">
              <span className="ndvi-legend__dot ndvi-legend__dot--green" />
              Healthy (NDVI ≥ 0.5)
            </div>
            <div className="ndvi-legend__item">
              <span className="ndvi-legend__dot ndvi-legend__dot--yellow" />
              Attention (0.2 – 0.5)
            </div>
            <div className="ndvi-legend__item">
              <span className="ndvi-legend__dot ndvi-legend__dot--red" />
              High Stress (&lt; 0.2)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './NdviMap.css';

export default function NdviMap({ bbox, center, onStatsUpdate }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchMap = useCallback(async () => {
    if (!bbox) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post('/api/ndvi/generate', { bbox });
      // [minLng, minLat, maxLng, maxLat] → Leaflet [[minLat, minLng], [maxLat, maxLng]]
      const leafletBounds = [
        [data.bounds[1], data.bounds[0]],
        [data.bounds[3], data.bounds[2]],
      ];
      setMapData({ src: data.imageSrc, bounds: leafletBounds });
      setLastFetched(new Date());
      if (onStatsUpdate) onStatsUpdate(data.stats || null);
    } catch (err) {
      console.error('Failed to load NDVI data', err);
      const msg =
        err?.response?.data?.error ||   // structured server error
        err?.message ||
        'Failed to load satellite data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [bbox, onStatsUpdate]);

  useEffect(() => {
    if (bbox) fetchMap();
  }, [bbox, fetchMap]);

  if (!center) {
    return (
      <div className="ndvi-locating">
        <div className="ndvi-locating__spinner" />
        <span>Locating your farm…</span>
      </div>
    );
  }

  return (
    <div className="ndvi-map-wrapper">
      {/* Loading overlay */}
      {loading && (
        <div className="ndvi-loading-overlay">
          <div className="ndvi-loading-overlay__inner">
            <div className="ndvi-loading-overlay__spinner" />
            <p>Processing Satellite Data…</p>
            <span>Fetching Sentinel-2 imagery from Copernicus</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="ndvi-error-overlay">
          <p>⚠ {error}</p>
          <button className="ndvi-retry-btn" onClick={fetchMap}>Retry</button>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri"
          maxZoom={19}
        />
        {mapData && (
          <ImageOverlay
            url={mapData.src}
            bounds={mapData.bounds}
            opacity={0.72}
          />
        )}
      </MapContainer>

      {/* Status bar */}
      <div className="ndvi-status-bar">
        {lastFetched && (
          <>
            <span className="ndvi-status-bar__item">
              <span className="ndvi-status-bar__dot ndvi-status-bar__dot--green" />
              Healthy ≥ 50%
            </span>
            <span className="ndvi-status-bar__item">
              <span className="ndvi-status-bar__dot ndvi-status-bar__dot--yellow" />
              Attention 20–50%
            </span>
            <span className="ndvi-status-bar__item">
              <span className="ndvi-status-bar__dot ndvi-status-bar__dot--red" />
              High Stress &lt; 20%
            </span>
            <span className="ndvi-status-bar__divider" />
            <span className="ndvi-status-bar__meta">
              Updated {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        )}
        {!lastFetched && !loading && (
          <span className="ndvi-status-bar__meta">Awaiting satellite data…</span>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

const useUserBoundingBox = () => {
  const [bbox, setBbox] = useState(null);
  const [center, setCenter] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setCenter([latitude, longitude]);
      
      // Calculate Bounding Box [minLng, minLat, maxLng, maxLat]
      const offset = 0.02; // Approx 2km radius
      setBbox([
        longitude - offset, 
        latitude - offset, 
        longitude + offset, 
        latitude + offset
      ]);
    }, (error) => {
      console.error("Location access denied. Defaulting to Faridabad.");
      setCenter([28.4089, 77.3178]);
      setBbox([77.2978, 28.3889, 77.3378, 28.4289]);
    });
  }, []);

  return { bbox, center };
};

export { useUserBoundingBox };

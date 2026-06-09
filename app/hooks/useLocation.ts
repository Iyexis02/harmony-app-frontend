'use client';

import { useState } from 'react';
import { getCurrentPosition, reverseGeocode, type LocationResult } from '@/lib/location';

export function useLocation() {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLocation = async () => {
    setLoading(true);
    setError(null);

    const positionResult = await getCurrentPosition();

    if (!positionResult.ok) {
      setError(positionResult.error);
      setLoading(false);
      return;
    }

    const { latitude, longitude } = positionResult.coords;
    const geocodeResult = await reverseGeocode(latitude, longitude);

    if (geocodeResult.ok) {
      setLocation(geocodeResult.location);
    } else {
      setError(geocodeResult.error);
    }

    setLoading(false);
  };

  return { location, loading, error, detectLocation };
}

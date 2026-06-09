import { searchCroatianCities } from './croatian-cities';

export type LocationResult = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

// Browser geolocation
export async function getCurrentPosition() {
  return new Promise<
    | { ok: true; coords: { latitude: number; longitude: number } }
    | { ok: false; error: string }
  >((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, error: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }),
      (error) => resolve({ ok: false, error: error.message }),
      { timeout: 10000, maximumAge: 0 }
    );
  });
}

// Reverse geocode with Nominatim (free)
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ ok: true; location: LocationResult } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { 'User-Agent': 'dating-app/1.0' } }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();

    return {
      ok: true,
      location: {
        city: data.address.city || data.address.town || data.address.village || '',
        country: data.address.country || '',
        latitude: lat,
        longitude: lon,
      },
    };
  } catch (error: any) {
    console.error('Reverse geocode error:', error);
    return { ok: false, error: error?.message || 'Geocoding failed' };
  }
}

// Search Croatia cities from static list — instant, no API key required
export function searchCroatiaCities(query: string): string[] {
  return searchCroatianCities(query);
}

// Geocode city to coordinates (Nominatim)
export async function geocodeCity(
  cityName: string
): Promise<{ ok: true; location: LocationResult } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cityName
      )}&limit=1`,
      { headers: { 'User-Agent': 'dating-app/1.0' } }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return { ok: false, error: 'Location not found' };
    }

    return {
      ok: true,
      location: {
        city: cityName,
        country: data[0].display_name.split(', ').pop() || '',
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      },
    };
  } catch (error: any) {
    console.error('Geocode error:', error);
    return { ok: false, error: error?.message || 'Geocoding failed' };
  }
}

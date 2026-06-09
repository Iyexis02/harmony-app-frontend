'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LocationDto } from '@/types/onboarding';
import { saveLocation } from '@/app/serverActions/onboarding';
import { useLocation } from '@/app/hooks/useLocation';
import { searchCroatiaCities, geocodeCity } from '@/lib/location';

async function fetchCitySuggestions(query: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.predictions) && data.predictions.length > 0) {
        return data.predictions;
      }
    }
  } catch {
    // fall through to static list
  }
  return searchCroatiaCities(query);
}
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import SectionHeader from '../SectionHeader';

const schema = z.object({
  locationCity: z.string().min(2, 'City is required'),
  locationCountry: z.string().min(2, 'Country is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine((data) => data.latitude !== undefined && data.longitude !== undefined, {
  message: 'Please select a valid city from the suggestions',
  path: ['locationCity'],
});

type Props = {
  data?: LocationDto;
  onNext: (data: LocationDto) => void;
  onBack: () => void;
};

export default function LocationStep({ data, onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { location, loading: locationLoading, error: locationError, detectLocation } = useLocation();

  const form = useForm<LocationDto>({
    resolver: zodResolver(schema),
    defaultValues: data || {
      locationCity: '',
      locationCountry: '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  useEffect(() => {
    if (location) {
      form.setValue('locationCity', location.city);
      form.setValue('locationCountry', location.country);
      form.setValue('latitude', location.latitude);
      form.setValue('longitude', location.longitude);
    }
  }, [location, form]);

  const handleCitySearch = (query: string) => {
    form.setValue('locationCity', query);
    form.setValue('latitude', undefined);
    form.setValue('longitude', undefined);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const suggestions = await fetchCitySuggestions(query);
      setCitySuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }, 300);
  };

  const handleSelectCity = async (city: string) => {
    form.setValue('locationCity', city);
    setShowSuggestions(false);

    const result = await geocodeCity(city);
    if (result.ok) {
      form.setValue('latitude', result.location.latitude);
      form.setValue('longitude', result.location.longitude);
      form.setValue('locationCountry', result.location.country);
    }
  };

  const onSubmit = async (formData: LocationDto) => {
    if (!formData.latitude || !formData.longitude) {
      setError('Please select a valid city from the suggestions');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await saveLocation(formData);

    if (result.ok) {
      onNext(formData);
    } else {
      setError(result.error.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      <SectionHeader
        icon={MapPin}
        roman="II"
        eyebrow="act two · the setting"
        title="And where does this all"
        accent="happen?"
        description="Every story needs a setting — we’ll suggest matches nearby and shows you’d both catch."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={detectLocation}
              disabled={locationLoading}
              className="w-full"
            >
              {locationLoading ? 'Detecting...' : '📍 Use My Location'}
            </Button>

            {locationError && (
              <p className="text-sm text-destructive">{locationError}</p>
            )}
          </div>

          <div className="relative">
            <FormField
              control={form.control}
              name="locationCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your city"
                      {...field}
                      onChange={(e) => handleCitySearch(e.target.value)}
                      autoComplete="off"
                      onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setShowSuggestions(false)}
                    />
                  </FormControl>
                  <FormDescription>
                    {form.watch('latitude') && form.watch('longitude')
                      ? '✓ Valid location selected'
                      : 'Select a city from the dropdown'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showSuggestions && citySuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {citySuggestions.map((city, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectCity(city)}
                    className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="locationCountry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="Country" {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onBack} className="rounded-full px-8">
              Back
            </Button>
            <Button type="submit" className="flex-1 rounded-full v-cta-gold" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

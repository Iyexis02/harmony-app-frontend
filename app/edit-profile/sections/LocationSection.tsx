'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useLocation } from '@/app/hooks/useLocation';
import { saveLocation } from '@/app/serverActions/onboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { geocodeCity, searchCroatiaCities } from '@/lib/location';
import type { CompleteProfileResponseDto, LocationDto } from '@/types/onboarding';

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
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function LocationSection({ profile, onSuccess, onError }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { location, loading: locationLoading, error: locationError, detectLocation } = useLocation();

  const form = useForm<LocationDto>({
    resolver: zodResolver(schema),
    defaultValues: {
      locationCity: profile.locationCity,
      locationCountry: profile.locationCountry,
      latitude: profile.latitude,
      longitude: profile.longitude,
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

  const handleCitySearch = async (query: string) => {
    form.setValue('locationCity', query);
    // Clear coordinates when user types manually (forces re-selection from dropdown)
    form.setValue('latitude', undefined);
    form.setValue('longitude', undefined);

    if (query.length >= 2) {
      const suggestions = await searchCroatiaCities(query);
      setCitySuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setCitySuggestions([]);
      setShowSuggestions(false);
    }
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
    // Extra validation: ensure coordinates exist (location was properly selected)
    if (!formData.latitude || !formData.longitude) {
      onError('Please select a valid city from the suggestions');
      return;
    }

    setIsLoading(true);

    const result = await saveLocation(formData);

    if (result.ok) {
      setIsEditing(false);
      onSuccess();
    } else {
      onError(result.error.message);
    }

    setIsLoading(false);
  };

  const handleCancel = () => {
    form.reset({
      locationCity: profile.locationCity,
      locationCountry: profile.locationCountry,
      latitude: profile.latitude,
      longitude: profile.longitude,
    });
    setCitySuggestions([]);
    setShowSuggestions(false);
    setIsEditing(false);
  };

  return (
    <AnimatePresence mode="wait">
      {!isEditing ? (
        <motion.div key="view" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </h2>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Current Location</p>
              <p className="text-foreground font-medium">
                {profile.locationCity}, {profile.locationCountry}
              </p>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div key="edit" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" />
              Edit Location
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={detectLocation}
                    disabled={locationLoading}
                    className="w-full">
                    {locationLoading ? 'Detecting...' : '📍 Use My Location'}
                  </Button>

                  {locationError && <p className="text-sm text-destructive">{locationError}</p>}
                </div>

                <div className="relative">
                  <FormField
                    control={form.control}
                    name="locationCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your city"
                            {...field}
                            onChange={(e) => handleCitySearch(e.target.value)}
                            onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => {
                              // Hide suggestions after a small delay to allow clicking
                              setTimeout(() => setShowSuggestions(false), 200);
                            }}
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
                          onClick={() => handleSelectCity(city)}
                          className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground">
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

                <div className="flex gap-3">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

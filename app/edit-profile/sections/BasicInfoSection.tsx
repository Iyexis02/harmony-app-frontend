'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Gender, SexualOrientation } from '@/app/enums/user/userEnum';
import { saveBasicProfile } from '@/app/serverActions/onboarding';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatEnumValue } from '@/lib/profileHelpers';
import type { BasicProfileRequestDto, CompleteProfileResponseDto } from '@/types/onboarding';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  dateOfBirth: z.string().refine(
    (date) => {
      const age = new Date().getFullYear() - new Date(date).getFullYear();
      return age >= 18 && age <= 100;
    },
    { message: 'Must be 18-100 years old' }
  ),
  gender: z.nativeEnum(Gender),
  sexualOrientation: z.nativeEnum(SexualOrientation),
});

type Props = {
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function BasicInfoSection({ profile, onSuccess, onError }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BasicProfileRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      sexualOrientation: profile.sexualOrientation,
    },
  });

  const onSubmit = async (formData: BasicProfileRequestDto) => {
    setIsLoading(true);

    const result = await saveBasicProfile(formData);

    if (result.ok) {
      setIsEditing(false);
      onSuccess();
    } else {
      onError(result.error.message);
    }

    setIsLoading(false);
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  return (
    <AnimatePresence mode="wait">
      {!isEditing ? (
        <motion.div key="view" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h2>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="text-foreground font-medium">{profile.name}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Age</p>
                <p className="text-foreground font-medium">{profile.age} years old</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Gender</p>
                <p className="text-foreground font-medium">{formatEnumValue(profile.gender)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Sexual Orientation</p>
                <p className="text-foreground font-medium">{formatEnumValue(profile.sexualOrientation)}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div key="edit" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <User className="w-5 h-5" />
              Edit Basic Information
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Must be 18+</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(Gender).map((gender) => (
                            <Badge
                              key={gender}
                              variant={field.value === gender ? 'default' : 'outline'}
                              className="cursor-pointer px-4 py-2 text-sm"
                              onClick={() => field.onChange(gender)}>
                              {formatEnumValue(gender)}
                            </Badge>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sexualOrientation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexual Orientation</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(SexualOrientation).map((orientation) => (
                            <Badge
                              key={orientation}
                              variant={field.value === orientation ? 'default' : 'outline'}
                              className="cursor-pointer px-4 py-2 text-sm"
                              onClick={() => field.onChange(orientation)}>
                              {formatEnumValue(orientation)}
                            </Badge>
                          ))}
                        </div>
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

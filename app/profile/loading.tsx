import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Cover gradient placeholder */}
      <div className="relative h-64 bg-gradient-to-br from-secondary/20 via-primary/10 to-accent/20">
        <div className="absolute top-6 right-6 flex gap-3">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — photo + quick stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden">
              <Skeleton className="w-full aspect-[3/4]" />
            </Card>
            <Card className="p-6 space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column — profile sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Name + location */}
            <div className="pt-20 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>

            {/* Section cards */}
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <Skeleton className="h-5 w-36" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {/* Badge row */}
            <Card className="p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-full" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

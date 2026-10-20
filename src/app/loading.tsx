import { Skeleton } from '@/components/ui/skeleton';

/** Route-level loading state: a skeleton that mirrors the typical page layout. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="space-y-8 py-4">
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="h-14 w-full max-w-xl" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

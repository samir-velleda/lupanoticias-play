import { Skeleton } from '@/components/ui';

/** Skeleton da página de categoria. */
export default function CategoriaLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-7">
      <div className="border-b-2 border-ink pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-12 w-64" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="my-7 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-pill" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[360px] w-full" />
        <div className="flex flex-col gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}

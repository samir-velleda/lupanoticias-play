import { Skeleton } from '@/components/ui';

/** Skeleton da Home (estado de carregamento). */
export default function HomeLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-7">
      <div className="grid grid-cols-1 gap-9 lg:grid-cols-[1fr_340px]">
        <div>
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="mt-4 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-[70px] w-[118px]" />
              <div className="flex-1">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-2 h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

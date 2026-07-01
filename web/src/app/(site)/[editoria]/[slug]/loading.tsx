import { Skeleton } from '@/components/ui';

/** Skeleton da matéria. */
export default function MateriaLoading() {
  return (
    <main className="py-9">
      <div className="mx-auto max-w-[720px] px-6 sm:px-10">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-12 w-full" />
        <Skeleton className="mt-3 h-6 w-5/6" />
        <div className="my-6 flex items-center gap-3 border-y border-line py-[18px]">
          <Skeleton className="h-[46px] w-[46px] rounded-pill" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mx-auto max-w-[1000px] px-6 sm:px-10">
        <Skeleton className="h-[300px] w-full sm:h-[520px]" />
      </div>
      <div className="mx-auto max-w-[720px] px-6 pt-9 sm:px-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mb-4 h-4 w-full" />
        ))}
      </div>
    </main>
  );
}

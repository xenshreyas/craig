interface PaginationProps {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  buildHref(page: number): string;
}

export default function Pagination({ page, hasPrev, hasNext, buildHref }: PaginationProps) {
  return (
    <div className="flex w-full items-center justify-between">
      <a
        href={hasPrev ? buildHref(page - 1) : '#'}
        className={`rounded-md px-4 py-2 font-medium ${hasPrev ? 'bg-zinc-600 text-white hover:bg-zinc-500' : 'bg-zinc-800 text-zinc-500 pointer-events-none'}`}
      >
        Previous
      </a>
      <span className="text-sm text-zinc-300">Page {page}</span>
      <a
        href={hasNext ? buildHref(page + 1) : '#'}
        className={`rounded-md px-4 py-2 font-medium ${hasNext ? 'bg-zinc-600 text-white hover:bg-zinc-500' : 'bg-zinc-800 text-zinc-500 pointer-events-none'}`}
      >
        Next
      </a>
    </div>
  );
}

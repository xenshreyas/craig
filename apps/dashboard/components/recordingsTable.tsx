import { SummaryPublishStatus, SummaryStatus, TranscriptStatus } from '@prisma/client';

import Button from './button';

interface RecordingRow {
  id: string;
  createdAt: string;
  userId: string;
  accessKey: string;
  transcriptStatus: TranscriptStatus | 'NONE';
  summaryStatus: SummaryStatus | 'NONE';
  publishStatus: SummaryPublishStatus;
}

interface RequesterInfo {
  username: string;
  avatarUrl: string | null;
}

interface RecordingsTableProps {
  rows: RecordingRow[];
  downloadBaseUri: string;
  guildId: string;
  returnTo: string;
  requesters?: Record<string, RequesterInfo>;
}

function formatRecordingDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const timeStr = date
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();

  if (date >= todayStart) return `Today at ${timeStr}`;
  if (date >= yesterdayStart) return `Yesterday at ${timeStr}`;

  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${dateStr} at ${timeStr}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETE') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
        Complete
      </span>
    );
  }
  if (status === 'ERROR') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/20">
        Error
      </span>
    );
  }
  if (status === 'NONE') {
    return <span className="text-zinc-500 text-xs">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20">
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15,3 21,3 21,9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function RecordingsTable({ rows, downloadBaseUri, guildId, returnTo, requesters = {} }: RecordingsTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg bg-zinc-900/40 border border-zinc-700/50 shadow-md">
      <table className="w-full border-collapse text-left">
        <thead className="bg-black/20">
          <tr>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Created</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Recording ID</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Requester</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Transcript</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Summary</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Publish</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700/50">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-sm text-zinc-400" colSpan={7}>
                No recordings for this server yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const requester = requesters[row.userId];
              return (
                <tr key={row.id} className="hover:bg-black/10 transition-colors">
                  <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">
                    {formatRecordingDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-zinc-200">{row.id}</td>
                  <td className="px-4 py-3">
                    {requester ? (
                      <div className="flex items-center gap-2">
                        {requester.avatarUrl ? (
                          <img
                            src={requester.avatarUrl}
                            alt=""
                            className="h-6 w-6 rounded-full bg-zinc-700 object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-400">
                            {requester.username.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-zinc-200">{requester.username}</span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-zinc-400">{row.userId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.transcriptStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.summaryStatus} />
                  </td>
                  <td className="px-4 py-3">{renderPublishCell(row, guildId, returnTo)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`${downloadBaseUri}/rec/${row.id}?key=${row.accessKey}`}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-400 hover:bg-zinc-500/40 hover:text-teal-400 transition-colors"
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Open recording"
                    >
                      <ExternalLinkIcon />
                    </a>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderPublishCell(row: RecordingRow, guildId: string, returnTo: string) {
  if (row.summaryStatus !== 'COMPLETE') {
    return <span className="text-xs text-zinc-500">Waiting for summary</span>;
  }

  if (row.publishStatus === SummaryPublishStatus.PUBLISHED) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
        Published
      </span>
    );
  }

  if (row.publishStatus === SummaryPublishStatus.PUBLISHING) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20">
        Publishing…
      </span>
    );
  }

  if (row.publishStatus === SummaryPublishStatus.FAILED) {
    return (
      <form method="post" action={`/api/servers/${guildId}/publish`} className="flex items-center gap-2">
        <input type="hidden" name="recordingId" value={row.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <span className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/20">
          Failed
        </span>
        <Button type="brand" className="px-3 py-1 text-xs">
          Retry
        </Button>
      </form>
    );
  }

  return (
    <form method="post" action={`/api/servers/${guildId}/publish`}>
      <input type="hidden" name="recordingId" value={row.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="brand" className="px-3 py-1 text-xs">
        Publish
      </Button>
    </form>
  );
}

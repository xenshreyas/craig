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

interface RecordingsTableProps {
  rows: RecordingRow[];
  downloadBaseUri: string;
  guildId: string;
  returnTo: string;
}

export default function RecordingsTable({ rows, downloadBaseUri, guildId, returnTo }: RecordingsTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-md bg-zinc-600 shadow-md">
      <table className="w-full border-collapse text-left">
        <thead className="bg-black/20 text-sm uppercase tracking-wide text-zinc-300">
          <tr>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Recording ID</th>
            <th className="px-4 py-3">Requester</th>
            <th className="px-4 py-3">Transcript</th>
            <th className="px-4 py-3">Summary</th>
            <th className="px-4 py-3">Publish</th>
            <th className="px-4 py-3">Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-zinc-300" colSpan={7}>
                No recordings for this server yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-500/70">
                <td className="px-4 py-3 text-sm text-zinc-200">{row.createdAt}</td>
                <td className="px-4 py-3 font-mono text-sm text-zinc-100">{row.id}</td>
                <td className="px-4 py-3 font-mono text-sm text-zinc-200">{row.userId}</td>
                <td className="px-4 py-3 text-sm text-zinc-200">{row.transcriptStatus}</td>
                <td className="px-4 py-3 text-sm text-zinc-200">{row.summaryStatus}</td>
                <td className="px-4 py-3 text-sm text-zinc-200">{renderPublishCell(row, guildId, returnTo)}</td>
                <td className="px-4 py-3 text-sm">
                  <a
                    href={`${downloadBaseUri}/rec/${row.id}?key=${row.accessKey}`}
                    className="text-teal-400 hover:text-teal-300 hover:underline"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderPublishCell(row: RecordingRow, guildId: string, returnTo: string) {
  if (row.summaryStatus !== 'COMPLETE') {
    return <span className="text-zinc-400">Waiting for summary</span>;
  }

  if (row.publishStatus === SummaryPublishStatus.PUBLISHED) {
    return <span className="rounded-md bg-emerald-600/20 px-3 py-1 font-medium text-emerald-300">Published</span>;
  }

  if (row.publishStatus === SummaryPublishStatus.PUBLISHING) {
    return <span className="rounded-md bg-amber-600/20 px-3 py-1 font-medium text-amber-300">Publishing...</span>;
  }

  if (row.publishStatus === SummaryPublishStatus.FAILED) {
    return (
      <form method="post" action={`/api/servers/${guildId}/publish`} className="flex items-center gap-2">
        <input type="hidden" name="recordingId" value={row.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <span className="rounded-md bg-red-600/20 px-3 py-1 font-medium text-red-300">Failed</span>
        <Button type="brand" className="px-3 py-1 text-sm">
          Retry
        </Button>
      </form>
    );
  }

  return (
    <form method="post" action={`/api/servers/${guildId}/publish`}>
      <input type="hidden" name="recordingId" value={row.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="brand" className="px-3 py-1 text-sm">
        Publish
      </Button>
    </form>
  );
}

interface GuildCardProps {
  guildId: string;
  name: string;
  iconUrl?: string | null;
  spentLabel: string;
}

export default function GuildCard({ guildId, name, iconUrl, spentLabel }: GuildCardProps) {
  return (
    <div className="w-full rounded-md bg-zinc-600 px-4 py-4 shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="h-12 w-12 rounded-full bg-zinc-800 object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 font-display text-lg text-zinc-300">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-display text-lg text-white">{name}</div>
            <div className="text-sm text-zinc-300">{spentLabel} spent this month in this server</div>
          </div>
        </div>
        <a
          href={`/servers/${guildId}`}
          className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-500"
        >
          Open Server
        </a>
      </div>
    </div>
  );
}

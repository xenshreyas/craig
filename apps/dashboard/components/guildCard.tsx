interface GuildCardProps {
  guildId: string;
  name: string;
  iconUrl?: string | null;
  spentLabel: string;
}

export default function GuildCard({ guildId, name, iconUrl, spentLabel }: GuildCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-zinc-700/30 transition-colors">
      <div className="flex items-center gap-3">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="h-10 w-10 rounded-full bg-zinc-700 object-cover flex-shrink-0" />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 font-display text-base text-zinc-300">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-medium text-white leading-tight">{name}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{spentLabel} spent this month</div>
        </div>
      </div>
      <a
        href={`/servers/${guildId}`}
        className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors flex-shrink-0"
      >
        Open →
      </a>
    </div>
  );
}

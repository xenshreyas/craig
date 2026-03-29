import { Icon, IconifyIcon } from '@iconify/react';
import clsx from 'clsx';
import { h } from 'preact';

interface DownloadButtonProps {
  icon?: IconifyIcon;
  title: string;
  suffix?: string;
  ennuizel?: boolean;
  onClick?(event: MouseEvent): any;
}

export default function DownloadButton({ icon, title, suffix, ennuizel, onClick }: DownloadButtonProps) {
  return (
    <button
      class={clsx(
        'inline-flex flex-row text-sm sm:text-base sm:py-2 py-1 sm:px-4 px-2 sm:gap-2 gap-1',
        'items-center justify-center w-fit sm:min-w-button min-w-button-sm font-medium rounded-md',
        'border border-zinc-600/60 bg-zinc-800/50 text-zinc-300',
        'hover:border-zinc-500 hover:bg-zinc-700/60 hover:text-white transition-colors',
        'focus:border-zinc-500 focus:text-white outline-none'
      )}
      onClick={onClick}
    >
      {icon ? <Icon icon={icon} className="w-5 h-5 pointer-events-none" /> : ''}
      <span class="pointer-events-none">
        {title}
        {suffix ? <span class="font-normal"> {suffix}</span> : ''}
      </span>
    </button>
  );
}

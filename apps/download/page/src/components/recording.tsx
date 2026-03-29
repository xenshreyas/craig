import { Icon } from '@iconify/react';
import downloadIcon from '@iconify-icons/ic/baseline-download';
import expiryIcon from '@iconify-icons/ic/outline-timer';
import clsx from 'clsx';
import { Fragment, h } from 'preact';
import { useTranslation } from 'react-i18next';

import { CookAvatarsPayload, ReadyState, RecordingNote, RecordingPageInfo, RecordingUser, SummaryState, TranscriptState } from '../api';
import prettyMs from '../prettyMs';
import { getDownloadsSection, SectionButton } from '../sections';
import { asT, PlatformInfo } from '../util';
import DiscordElement from './discordElement';
import DownloadButton from './downloadButton';
import PreviouslyDownloaded from './previouslyDownloaded';
import Section from './section';

const EXPIRY_WARN_AT = 1000 * 60 * 60 * 3;

interface RecordingProps {
  state: {
    recording: RecordingPageInfo;
    notes: RecordingNote[] | null;
    recordingId: string | number;
    users: RecordingUser[];
    durationLoading: boolean;
    duration: number | null;
    platform: PlatformInfo;
    readyState: ReadyState | null;
    transcriptState: TranscriptState | null;
    summaryState: SummaryState | null;
    downloading: boolean;
    showPreviousDownload: boolean;
    expiredAudioMessage: string | null;
  };
  onDurationClick?(e: MouseEvent): any;
  onDownloadClick?(button: SectionButton, e: MouseEvent): any;
  onAvatarsClick?(payload: CookAvatarsPayload, e: MouseEvent): any;
  onDeleteClick?(e: MouseEvent): any;
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: any[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul class="list-none space-y-1 my-1">
          {listItems.map((item, i) => (
            <li key={i} class="flex gap-2">
              <span class="text-teal-500 flex-shrink-0">–</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h3 class="font-semibold text-white mt-3 mb-1 text-base">{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h2 class="font-bold text-white text-lg mt-4 mb-1">{line.slice(2)}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('\u2013 ')) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p class="text-zinc-300">{line}</p>);
    }
  }
  flushList();
  return elements;
}

export default function Recording({ state, onDurationClick, onDownloadClick, onDeleteClick, onAvatarsClick }: RecordingProps) {
  const { t } = useTranslation();
  const recording = state.recording;
  const startDate = new Date(recording.startTime);
  const expiryDate = new Date(startDate.valueOf() + 1000 * 60 * 60 * (recording.expiresAfter || 24));
  const expiryTime = expiryDate.valueOf() - Date.now();
  const downloadsSection = getDownloadsSection(recording, state.platform);
  const transcript = state.transcriptState;
  const summary = state.summaryState;

  return (
    <Fragment>
      {/* Info Box */}
      <div class="flex flex-col gap-4 bg-zinc-800/60 border border-zinc-700/50 shadow-md p-5 rounded-xl text-sm text-zinc-200">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-zinc-400 font-display">{t('info.req_by')}:</span>
            {recording.requesterExtra ? <DiscordElement {...recording.requesterExtra} id={recording.requesterId} /> : recording.requester}
            {recording.user ? (
              <Fragment>
                <span class="text-zinc-500 font-medium">{t('info.behalf')}</span>
                {recording.userExtra ? <DiscordElement {...recording.userExtra} id={recording.userId} /> : recording.user}
              </Fragment>
            ) : (
              ''
            )}
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-zinc-400 font-display">{t('info.server')}:</span>
            {recording.guildExtra ? <DiscordElement {...recording.guildExtra} /> : recording.guild}
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-zinc-400 font-display">{t('info.channel')}:</span>
            {recording.channelExtra ? <DiscordElement {...recording.channelExtra} elementType="channel" /> : recording.channel}
          </div>
          <div>
            <span class="text-zinc-400 font-display">{t('info.started')}:</span>{' '}
            <span class="text-zinc-200">{startDate.toLocaleString()}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1 pt-1 border-t border-zinc-700/50">
          <div>
            <span class="text-zinc-400 font-display">{t('info.duration')}:</span>{' '}
            {state.durationLoading ? (
              <span class="font-medium text-zinc-500">{t('loading')}</span>
            ) : recording.audioExpired && state.duration === null ? (
              <span class="font-medium text-zinc-500">Unavailable</span>
            ) : state.duration === null ? (
              <button onClick={onDurationClick} class="font-medium text-teal-400 hover:underline focus:underline outline-none">
                {t('reveal')}
              </button>
            ) : (
              <span class="text-zinc-200">{prettyMs(state.duration * 1000)}</span>
            )}
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-zinc-400 font-display">{t('info.users')}:</span>
            {state.users.map((user) => (
              <DiscordElement {...user} key={user.id} />
            ))}
          </div>
        </div>

        <div class="text-xs text-zinc-600 font-mono pt-1 border-t border-zinc-700/50">
          {t('info.rec_id')}: {state.recordingId}
        </div>
      </div>

      {recording.audioExpired ? (
        <div class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
          {state.expiredAudioMessage || 'The audio for this recording has expired and is no longer available.'}
        </div>
      ) : (
        ''
      )}

      {!state.downloading && state.readyState && state.showPreviousDownload && state.readyState.download ? (
        <PreviouslyDownloaded readyState={state.readyState} users={state.users} recording={state.recording} platform={state.platform} />
      ) : (
        ''
      )}

      {/* Expiry Block */}
      <div class="flex flex-col items-center justify-center">
        {recording.expiresAfter && expiryTime > 0 ? (
          <h2
            class={clsx('sm:text-2xl text-lg font-display flex items-center justify-center gap-2', {
              'text-zinc-100': expiryTime > EXPIRY_WARN_AT,
              'text-red-500': expiryTime <= EXPIRY_WARN_AT
            })}
          >
            <Icon icon={expiryIcon} className="sm:text-3xl text-xl" />
            <span>{t('info.expires', { expire: prettyMs(expiryTime, { compact: true, verbose: true, t }) })}</span>
          </h2>
        ) : (
          ''
        )}
        <button onClick={onDeleteClick} class="text-zinc-500 font-medium hover:text-red-400 focus:text-red-400 outline-none active:underline">
          {t('info.delete_rec')}
        </button>
      </div>

      {/* Transcript */}
      <Section title="Transcript">
        {recording.audioExpired ? <span class="text-zinc-300">Audio expired, but the transcript remains available.</span> : ''}
        {!transcript || transcript.status === 'PENDING' || transcript.status === 'PROCESSING' ? (
          <span class="text-zinc-400">Transcription in progress...</span>
        ) : transcript.status === 'COMPLETE' ? (
          <div class="relative bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-4 pr-10 text-zinc-300 whitespace-pre-wrap break-words max-h-56 overflow-y-auto text-sm">
            <a
              href={`/api/recording/${state.recordingId}/transcript.txt?key=${recording.key}`}
              class="absolute top-2 right-2 text-zinc-500 hover:text-zinc-200 transition-colors outline-none"
              title="Download TXT"
            >
              <Icon icon={downloadIcon} className="w-5 h-5" />
            </a>
            {transcript.preview || 'Transcript generated with no text.'}
          </div>
        ) : (
          <span class="text-red-400">
            Transcript unavailable.
            {transcript.errorMessage ? ` ${transcript.errorMessage}` : ''}
          </span>
        )}
      </Section>

      {/* Meeting Summary */}
      <Section title="Meeting Summary">
        {!summary || summary.status === 'PENDING' || summary.status === 'PROCESSING' ? (
          <span class="text-zinc-400">Summary generation in progress...</span>
        ) : summary.status === 'COMPLETE' ? (
          <div class="relative bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-4 pt-3 pb-3 pr-10 text-zinc-300 break-words max-h-96 overflow-y-auto text-sm space-y-1">
            <a
              href={`/api/recording/${state.recordingId}/summary.md?key=${recording.key}`}
              class="absolute top-2 right-2 text-zinc-500 hover:text-zinc-200 transition-colors outline-none"
              title="Download MD"
            >
              <Icon icon={downloadIcon} className="w-5 h-5" />
            </a>
            {summary.preview ? renderMarkdown(summary.preview) : <span class="text-zinc-500">Summary generated with no text.</span>}
          </div>
        ) : (
          <span class="text-red-400">
            Summary unavailable.
            {summary.errorMessage ? ` ${summary.errorMessage}` : ''}
          </span>
        )}
      </Section>

      {state.notes && state.notes.length > 0 ? (
        <Section title="Notes" icon={downloadIcon}>
          <div class="flex flex-col gap-2 w-full">
            {state.notes.map((note, index) => (
              <div key={index} class="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 text-zinc-200">
                <div class="text-xs uppercase tracking-wide text-zinc-500 mb-1">{prettyMs(Number(note.time) * 1000)}</div>
                <div>{note.note}</div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        ''
      )}

      {/* Downloads */}
      {!recording.audioExpired ? (
        <Section title="Audio Recording" icon={downloadIcon}>
          {downloadsSection.map((section, i) => (
            <Section title={asT(t, section.title)} icon={section.icon} small key={i}>
              <div class="flex flex-row flex-wrap gap-3">
                {section.buttons.map((button, ii) =>
                  button.hidden ? (
                    ''
                  ) : (
                    <DownloadButton
                      icon={button.icon}
                      title={asT(t, button.text)}
                      suffix={asT(t, button.suffix)}
                      ennuizel={button.ennuizel !== undefined}
                      key={ii}
                      onClick={(e) => onDownloadClick(button, e)}
                    />
                  )
                )}
              </div>
            </Section>
          ))}
        </Section>
      ) : (
        ''
      )}
    </Fragment>
  );
}

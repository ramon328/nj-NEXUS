import React from 'react';
import { useTranslation } from 'react-i18next';
import TimelineEvent from './TimelineEvent';

type TimelineEventsListProps = {
  events: any[];
  isConsigned: boolean;
  onSelect?: (event: any) => void;
  onEdit?: (event: any) => void;
  onDelete?: (event: any) => void;
};

const TimelineEventsList = ({
  events,
  isConsigned,
  onSelect,
  onEdit,
  onDelete,
}: TimelineEventsListProps) => {
  const { t } = useTranslation('vehicleTimeline');

  if (events.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center'>
        <p className='text-sm text-slate-400'>{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className='relative'>
      {/* Riel vertical continuo detrás de los puntos */}
      <div
        className='pointer-events-none absolute left-[15px] top-3 bottom-3 w-px bg-slate-200'
        aria-hidden
      />
      <div className='flex flex-col gap-2.5'>
        {events.map((event, index) => (
          <TimelineEvent
            key={`${event.id}-${index}`}
            event={event}
            isConsigned={isConsigned}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineEventsList;

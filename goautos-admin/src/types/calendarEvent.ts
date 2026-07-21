export type CalendarEventType = 'meeting' | 'training' | 'vendor' | 'deadline' | 'reminder' | 'other';

export interface CalendarEvent {
  id: string;
  client_id: number;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string | null;
  location: string | null;
  assigned_to_user_id: number | null;
  notify_before_minutes: number | null;
  photo_urls: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_user?: { id: number; first_name: string; last_name: string } | null;
  creator_name?: string;
}

export interface CreateCalendarEventData {
  title: string;
  description?: string;
  event_type: CalendarEventType;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  location?: string;
  assigned_to_user_id?: number;
  notify_before_minutes?: number;
  photo_urls?: string[];
}

export type UnifiedEventSource = 'task' | 'request' | 'event' | 'scheduling';

export interface UnifiedCalendarEvent {
  id: string;
  source: UnifiedEventSource;
  title: string;
  description: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  color: string;
  dotColor: string;
  textColor: string;
  status: string | null;
  url: string;
  metadata: Record<string, unknown>;
}

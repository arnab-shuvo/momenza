export type DateFilterMode = 'none' | 'single' | 'range' | 'no-date';

export interface DateFilterValue {
  mode: DateFilterMode;
  start: number; // timestamp — start of day
  end: number;   // timestamp — end of day (same as start for 'single')
}

export interface TaskFilter {
  query: string;
  date: DateFilterValue | null;
}

export type SortMode = 'priority' | 'alpha' | 'date-asc';

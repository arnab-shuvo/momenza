export type TaskStatus = 'active' | 'completed' | 'archived';
export type ArchiveFilterType = 'completed' | 'archived';
export type DateType = 'single' | 'range';

export interface TaskDate {
  type: DateType;
  start: number;
  end?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: number;
  taskDate?: TaskDate;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  status: 'active' | 'archived';
  createdAt: number;
  sortOrder: number;
}

export const PROJECT_COLORS = [
  '#6C5CE7', '#0984E3', '#00B894', '#00CEC9',
  '#FDCB6E', '#E17055', '#FD79A8', '#A29BFE',
  '#55EFC4', '#FF7675',
];

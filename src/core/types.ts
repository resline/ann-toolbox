import type { LucideIcon } from 'lucide-react';
import type React from 'react';

export type ToolCategoryId = 'time' | 'focus' | 'wellbeing' | 'tasks';

export type ToolStatus = 'available' | 'coming_soon';

export interface ToolModule {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategoryId;
  status: ToolStatus;
  badge?: string;
  component?: React.ComponentType;
}

export interface ToolCategory {
  id: ToolCategoryId;
  label: string;
  description: string;
}

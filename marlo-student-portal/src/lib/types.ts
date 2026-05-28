export type Role = "admin" | "manager" | "student";

export type TaskStatus = "pending" | "in_progress" | "done" | "overdue";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  creator_id: number;
  due_date: string;
  status: TaskStatus;
  created_at: string;
  updated_at?: string | null;
}

export interface TaskDetail extends Task {
  assignments: TaskAssignmentBrief[];
}

export interface TaskAssignmentBrief {
  id: number;
  task_id: number;
  student_id: number;
  status: TaskStatus;
  completed_at: string | null;
  feedback: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface StudentRanking {
  student_id: number;
  full_name: string;
  email: string;
  performance_score: number;
  rank: number;
  tasks_completed: number;
  tasks_on_time: number;
  tasks_total: number;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  student_id: number;
  status: TaskStatus;
  completed_at: string | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
  task: Task;
}

export interface TimelineEvent {
  id: number;
  user_id: number;
  event_type: string;
  description: string | null;
  event_meta: Record<string, unknown>;
  created_at: string;
}

export interface KPITemplate {
  id: number;
  name: string;
  description: string | null;
  weight: number;
  max_value: number;
}

export interface StudentKPIValue {
  id: number;
  student_id: number;
  template_id: number;
  value: number;
  calculated_at: string;
  updated_at: string;
  template: KPITemplate;
}

export interface Feedback {
  id: number;
  student_id: number;
  author_id: number;
  task_id: number | null;
  content: string;
  score: number | null;
  feedback_type: string;
  created_at: string;
  updated_at?: string | null;
}

export interface Submission {
  id: number;
  student_id: number;
  original_filename: string;
  content_type: string | null;
  file_size: number;
  description: string | null;
  task_id: number | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface DashboardStats {
  avg_performance_score: number;
  avg_attendance_rate: number;
  avg_feedback_score: number | null;
  total_students: number;
  active_tasks: number;
  overdue_tasks: number;
}

export interface OverdueTaskItem {
  assignment_id: number;
  task_id: number;
  task_title: string;
  student_id: number;
  student_name: string;
  due_date: string;
  status: TaskStatus;
  days_overdue: number;
}

export interface TopPerformer {
  student_id: number;
  full_name: string;
  email: string;
  performance_score: number;
  tasks_completed: number;
  tasks_total: number;
  attendance_rate: number;
}

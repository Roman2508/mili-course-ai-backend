import type { LearningCourseStatus } from '../../generated/prisma/client';

export interface WeakTopicResponse {
  id: string;
  label: string;
  confidenceGap: number;
  relatedCourseIds: string[];
}

export interface ModuleTestResultResponse {
  moduleId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  submittedAt: string;
  answers: Record<string, number>;
}

export interface UserLearningCourseResponse {
  courseId: string;
  status: LearningCourseStatus;
  progressPercent: number;
  completedLessonIds: string[];
  testResults: ModuleTestResultResponse[];
  startedAt?: string;
  completedAt?: string;
  lastLessonId?: string;
}

export interface MyLearningResponse {
  courses: UserLearningCourseResponse[];
  weakTopics: WeakTopicResponse[];
  interests: string[];
  profileSummary: string;
}

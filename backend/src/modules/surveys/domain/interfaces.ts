export interface Survey {
  PK: string;
  SK: string;
  title: string;
  description: string;
  status: 'CREATED' | 'PUBLISHED' | 'CLOSED';
  createdAt: string;
}

export interface Question {
  PK: string;
  SK: string;
  text: string;
  type: 'FREE_TEXT' | 'MULTIPLE_CHOICE';
  options?: string[];
}

export interface SurveyResponse {
  surveyId: string;
  title: string;
  description: string;
  questions: {
    questionId: string;
    text: string;
    type: 'FREE_TEXT' | 'MULTIPLE_CHOICE';
    options?: string[];
  }[];
}

export interface Answer {
  PK: string;
  SK: string;
  surveyId: string;
  answer: string | string[];
  createdAt: string;
}

export interface ResponseInput {
  questionId: string;
  answer: string | string[];
}
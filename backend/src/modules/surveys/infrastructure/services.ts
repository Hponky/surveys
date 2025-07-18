import { DynamoServiceImpl } from '../../../shared/dynamo-service';
import { surveySchema, questionSchema, answerSchema, querySchema } from './schemas';

export const surveyService = new DynamoServiceImpl(
  process.env.SURVEYS_TABLE || 'SurveyPlatform',
  surveySchema,
  querySchema
);

export const questionService = new DynamoServiceImpl(
  process.env.SURVEYS_TABLE || 'SurveyPlatform',
  questionSchema,
  querySchema
);

export const answerService = new DynamoServiceImpl(
  process.env.SURVEYS_TABLE || 'SurveyPlatform',
  answerSchema, 
  querySchema
);
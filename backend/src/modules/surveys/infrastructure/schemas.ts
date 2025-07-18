import Joi from 'joi';

export const pathParamsSchema = Joi.object({
  surveyId: Joi.string().uuid().required()
});

export const surveySchema = Joi.object({
  PK: Joi.string().pattern(/^SURVEY#/).required(),
  SK: Joi.string().valid('METADATA').required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  status: Joi.string().valid('CREATED', 'PUBLISHED', 'CLOSED').required(),
  createdAt: Joi.string().isoDate().required()
});

export const questionSchema = Joi.object({
  PK: Joi.string().pattern(/^SURVEY#/).required(),
  SK: Joi.string().pattern(/^QUESTION#/).required(),
  text: Joi.string().required(),
  type: Joi.string().valid('FREE_TEXT', 'MULTIPLE_CHOICE').required(),
  options: Joi.when('type', {
    is: 'MULTIPLE_CHOICE',
    then: Joi.array().items(Joi.string()).min(2).required(),
    otherwise: Joi.forbidden()
  })
});

export const querySchema = Joi.object({
  TableName: Joi.string().required(),
  KeyConditionExpression: Joi.string().required(),
  ExpressionAttributeValues: Joi.object().required()
});

export const submitResponseSchema = Joi.object({
  responses: Joi.array().items(
    Joi.object({
      questionId: Joi.string().uuid().required(),
      answer: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required()
    })
  ).min(1).required()
});

export const answerSchema = Joi.object({
    PK: Joi.string().pattern(/^RESPONSE#/).required(),
    SK: Joi.string().pattern(/^ANSWER#/).required(),
    surveyId: Joi.string().uuid().required(),
    answer: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
    createdAt: Joi.string().isoDate().required(),
});

export const createSurveySchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required()
});

export const questionInputSchema = Joi.object({
  text: Joi.string().required(),
  type: Joi.string().valid('FREE_TEXT', 'MULTIPLE_CHOICE').required(),
  options: Joi.when('type', {
    is: 'MULTIPLE_CHOICE',
    then: Joi.array().items(Joi.string()).min(2).required(),
    otherwise: Joi.forbidden()
  })
});
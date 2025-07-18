import { DynamoServiceImpl } from '../shared/dynamo-service';
import Joi from 'joi';
import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Códigos de estado HTTP
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

// Interfaces para tipos
interface Survey {
  PK: string;
  SK: string;
  title: string;
  description: string;
  status: 'CREATED' | 'PUBLISHED' | 'CLOSED';
  createdAt: string;
}

interface Question {
  PK: string;
  SK: string;
  text: string;
  type: 'FREE_TEXT' | 'MULTIPLE_CHOICE';
  options?: string[];
}

interface SurveyResponse {
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

// Esquemas de validación
const pathParamsSchema = Joi.object({
  surveyId: Joi.string().uuid().required()
});

const surveySchema = Joi.object({
  PK: Joi.string().pattern(/^SURVEY#/).required(),
  SK: Joi.string().valid('METADATA').required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  status: Joi.string().valid('CREATED', 'PUBLISHED', 'CLOSED').required(),
  createdAt: Joi.string().isoDate().required()
});

const questionSchema = Joi.object({
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

const querySchema = Joi.object({
  TableName: Joi.string().required(),
  KeyConditionExpression: Joi.string().required(),
  ExpressionAttributeValues: Joi.object().required()
});

// Inicialización del servicio
const surveyService = new DynamoServiceImpl(
  process.env.SURVEYS_TABLE || 'SurveyPlatform',
  surveySchema,
  querySchema
);

const createSurveySchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required()
});

export const create = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { title, description } = await createSurveySchema.validateAsync(
      JSON.parse(event.body || '{}')
    );
    const surveyId = randomUUID();

  const survey: Survey = {
    PK: `SURVEY#${surveyId}`,
    SK: 'METADATA',
    title,
    description,
    status: 'CREATED',
    createdAt: new Date().toISOString()
  };

    await surveyService.put({
      PK: `SURVEY#${surveyId}`,
      SK: 'METADATA',
      title,
      description,
      status: 'CREATED',
      createdAt: new Date().toISOString()
    });
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Survey created successfully",
        surveyId,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: error instanceof Joi.ValidationError ? 400 : 500,
      body: JSON.stringify({ 
        message: error instanceof Joi.ValidationError 
          ? `Validation error: ${error.message}`
          : "Error creating survey" 
      }),
    };
  }
};

const questionInputSchema = Joi.object({
  text: Joi.string().required(),
  type: Joi.string().valid('FREE_TEXT', 'MULTIPLE_CHOICE').required(),
  options: Joi.when('type', {
    is: 'MULTIPLE_CHOICE',
    then: Joi.array().items(Joi.string()).min(2).required(),
    otherwise: Joi.forbidden()
  })
});

export const addQuestion = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { surveyId } = await pathParamsSchema.validateAsync(event.pathParameters || {});
    const { text, type, options } = await questionInputSchema.validateAsync(
      JSON.parse(event.body || '{}')
    );
    const questionId = randomUUID();

    const question: Question = {
      PK: `SURVEY#${surveyId}`,
      SK: `QUESTION#${questionId}`,
      text,
      type,
      ...(options && { options })
    };

    try {
      await surveyService.put(question);
      return {
        statusCode: 201,
        body: JSON.stringify({
          message: "Question added successfully",
          questionId,
        }),
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: error instanceof Joi.ValidationError ? 400 : 500,
        body: JSON.stringify({
          message: error instanceof Joi.ValidationError
            ? `Validation error: ${error.message}`
            : "Error adding question"
        }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({
        message: error instanceof Joi.ValidationError
          ? `Validation error: ${error.message}`
          : "Error processing request"
      }),
    };
  }
};

export const getSurvey = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { pathParameters } = event;

  try {
    await pathParamsSchema.validateAsync(pathParameters || {});
    const { surveyId } = pathParameters as { surveyId: string };

    const result = await surveyService.query({
      TableName: process.env.SURVEYS_TABLE || 'SurveyPlatform',
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `SURVEY#${surveyId}`
      }
    });

    if (!result || result.length === 0) {
      return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        body: JSON.stringify({ message: "Survey not found" }),
      };
    }

    const metadata = result.find((item: Survey) => item.SK === 'METADATA');
    const questions = result
      .filter((item: Question) => item.SK.startsWith('QUESTION#'))
      .map(({ SK, text, type, options }: Question) => ({
        questionId: SK.replace('QUESTION#', ''),
        text,
        type,
        options
      }));

    const response: SurveyResponse = {
      surveyId: metadata.PK.replace('SURVEY#', ''),
      title: metadata.title,
      description: metadata.description,
      questions
    };

    return {
      statusCode: HTTP_STATUS.OK,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error(err);
    if (err instanceof Joi.ValidationError) {
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        body: JSON.stringify({
          message: `Validation error: ${err.message}`
        }),
      };
    }
    // Si el error no es de validación Joi, pero tiene un statusCode, lo usamos.
    // Esto es para errores como "Survey not found" que pueden ser lanzados internamente.
    const error = err as Error & { statusCode?: number };
    return {
      statusCode: error.statusCode || HTTP_STATUS.INTERNAL_ERROR,
      body: JSON.stringify({
        message: error.message || "Error fetching survey"
      }),
    };
  }
};
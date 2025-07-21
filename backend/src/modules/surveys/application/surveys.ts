import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import validator from '@middy/validator';
import Joi from 'joi';
import { randomUUID } from "crypto";
import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Obtiene el método HTTP de un evento API Gateway V2
 * @param event El evento de API Gateway
 * @returns El método HTTP en mayúsculas o cadena vacía si no está definido
 */
const getHttpMethod = (event: APIGatewayProxyEventV2): string =>
  event.requestContext?.http?.method?.toUpperCase() || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'no-referrer'
};

const RESPONSE_HEADERS = {
  ...CORS_HEADERS,
  ...SECURITY_HEADERS
};

const handleOptions = (): APIGatewayProxyResult => ({
  statusCode: 204,
  headers: CORS_HEADERS,
  body: ''
});
import { Survey, Question, SurveyResponse, Answer, ResponseInput } from '../domain/interfaces';
import { pathParamsSchema, createSurveySchema, questionInputSchema, submitResponseSchema } from '../infrastructure/schemas';
import { HTTP_STATUS } from '../utils/constants';
import { surveyService, questionService, answerService } from '../infrastructure/services';

interface CreateSurveyBody {
  title: string;
  description?: string;
}

const createHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  if (getHttpMethod(event) === 'OPTIONS') return handleOptions();
  
  let body: CreateSurveyBody;
  try {
    body = JSON.parse(event.body || '') as CreateSurveyBody;
    if (!body.title) throw new Error('Title is required');
  } catch (error) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }
  
  const { title, description = '' } = body;
  const surveyId = randomUUID();

  const survey: Survey = {
    PK: `SURVEY#${surveyId}`,
    SK: 'METADATA',
    title,
    description,
    status: 'CREATED',
    createdAt: new Date().toISOString()
  };

  await surveyService.put(survey);
  
  return {
    statusCode: 201,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify({
      message: "Survey created successfully",
      id: surveyId,
    }),
  };
};

export const create = middy(createHandler)
  .use(httpJsonBodyParser())
  .use(validator({ eventSchema: createSurveySchema }))
  .use(httpErrorHandler());


type QuestionType = 'FREE_TEXT' | 'MULTIPLE_CHOICE';

interface AddQuestionBody {
  text: string;
  type: QuestionType;
  options?: string[];
}

const addQuestionHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  if (getHttpMethod(event) === 'OPTIONS') return handleOptions();
  
  try {
    const { surveyId } = event.pathParameters as { surveyId: string };
    const { text, type, options } = event.body as unknown as AddQuestionBody;
    const questionId = randomUUID();

    const question: Question = {
      PK: `SURVEY#${surveyId}`,
      SK: `QUESTION#${questionId}`,
      text,
      type,
      ...(options && { options })
    };

    await questionService.put(question);
    
    return {
      statusCode: HTTP_STATUS.CREATED,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({
        message: "Question added successfully",
        questionId,
      }),
    };
  } catch (error) {
    console.error(error);
    throw error; // El middleware httpErrorHandler manejará el error
  }
};

export const addQuestion = middy(addQuestionHandler)
  .use(httpJsonBodyParser())
  .use(validator({
    eventSchema: Joi.object({
      pathParameters: pathParamsSchema,
      body: questionInputSchema
    })
  }))
  .use(httpErrorHandler());

export const getAllSurveys = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  if (getHttpMethod(event) === 'OPTIONS') return handleOptions();
  try {
    const scanParams = {
      TableName: process.env.SURVEYS_TABLE || 'SurveyPlatform',
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: {
        ":sk": "METADATA",
      },
      ProjectionExpression: "PK, title, createdAt, #st",
      ExpressionAttributeNames: {
          "#st": "status"
      }
    };

    const Items = await surveyService.scan(scanParams);

    if (!Items || Items.length === 0) {
        return {
            statusCode: HTTP_STATUS.OK,
            headers: RESPONSE_HEADERS,
            body: JSON.stringify([])
        };
    }

    const surveys = Items.map((item: any) => ({
        id: item.PK.replace("SURVEY#", ""), // Cambiado de surveyId a id para consistencia con el frontend
        title: item.title,
        createdAt: item.createdAt,
        status: item.status
    }));

    return {
      statusCode: HTTP_STATUS.OK,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify(surveys),
    };

  } catch (error) {
    console.error("Error fetching surveys:", error);

    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({ message: "An error occurred while fetching the surveys." }),
    };
  }
};

export const getSurvey = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  if (getHttpMethod(event) === 'OPTIONS') return handleOptions();
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
        headers: RESPONSE_HEADERS,
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
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error(err);
    if (err instanceof Joi.ValidationError) {
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        headers: CORS_HEADERS,
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
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: error.message || "Error fetching survey"
      }),
    };
  }
};

export const submitResponse = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
  if (getHttpMethod(event) === 'OPTIONS') return handleOptions();
  try {
    // 1. Validar el surveyId de la URL
    const { surveyId } = await pathParamsSchema.validateAsync(event.pathParameters || {});
    
    // 2. Validar el cuerpo de la petición
    const { responses } = await submitResponseSchema.validateAsync(event.body);

    const responseId = randomUUID();
    const createdAt = new Date().toISOString();

    // 3. Crear una promesa para cada operación de escritura en DynamoDB
    const putPromises = responses.map((res: ResponseInput) => {
      const answerItem: Answer = {
        PK: `RESPONSE#${responseId}`,
        SK: `ANSWER#${res.questionId}`,
        surveyId,
        answer: res.answer,
        createdAt,
      };
      return answerService.put(answerItem);
    });

    // 4. Ejecutar todas las promesas en paralelo para mayor eficiencia
    await Promise.all(putPromises);

    return {
      statusCode: HTTP_STATUS.CREATED,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Response submitted successfully",
        responseId,
      }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: error instanceof Joi.ValidationError ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_ERROR,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: error instanceof Joi.ValidationError
          ? `Validation error: ${error.message}`
          : "Error submitting response"
      }),
    };
  }
};
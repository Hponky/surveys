import Joi from 'joi';
import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Survey, Question, SurveyResponse, Answer, ResponseInput } from '../domain/interfaces';
import { pathParamsSchema, createSurveySchema, questionInputSchema, submitResponseSchema } from '../infrastructure/schemas';
import { HTTP_STATUS } from '../utils/constants';
import { surveyService, questionService, answerService } from '../infrastructure/services';

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
        id: surveyId,
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
      await questionService.put(question);
      return {
        statusCode: HTTP_STATUS.CREATED,
        body: JSON.stringify({
          message: "Question added successfully",
          questionId,
        }),
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: error instanceof Joi.ValidationError ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_ERROR,
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

export const getAllSurveys = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
      body: JSON.stringify(surveys),
    };

  } catch (error) {
    console.error("Error fetching surveys:", error);

    return {
      statusCode: HTTP_STATUS.INTERNAL_ERROR,
      body: JSON.stringify({ message: "An error occurred while fetching the surveys." }),
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

export const submitResponse = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Validar el surveyId de la URL
    const { surveyId } = await pathParamsSchema.validateAsync(event.pathParameters || {});
    
    // 2. Validar el cuerpo de la petición
    const { responses } = await submitResponseSchema.validateAsync(
      JSON.parse(event.body || '{}')
    );

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
      body: JSON.stringify({
        message: "Response submitted successfully",
        responseId,
      }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: error instanceof Joi.ValidationError ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_ERROR,
      body: JSON.stringify({
        message: error instanceof Joi.ValidationError
          ? `Validation error: ${error.message}`
          : "Error submitting response"
      }),
    };
  }
};
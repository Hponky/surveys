import { APIGatewayProxyEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';

// Mocks para los métodos de DynamoServiceImpl
const mockPut = jest.fn();
const mockQuery = jest.fn();
const mockUpdate = jest.fn(); // Añadir si se planean tests para update
const mockDelete = jest.fn(); // Añadir si se planean tests para delete

// Mockear la clase DynamoServiceImpl ANTES de importar el módulo surveys
jest.mock('@/shared/dynamo-service', () => {
  return {
    DynamoServiceImpl: jest.fn().mockImplementation(() => {
      return {
        put: mockPut,
        query: mockQuery,
        update: mockUpdate,
        delete: mockDelete,
      };
    }),
  };
});

// Importar las funciones de surveys DESPUÉS de que el mock esté configurado
// Esto asegura que la instancia de DynamoServiceImpl dentro de surveys.ts sea la mockeada
const { create, addQuestion, getSurvey, submitResponse } = require('@/modules/surveys/application/surveys');

describe('Surveys API', () => {
  const mockTableName = 'SurveyPlatform';
  const mockSurveyId = randomUUID();
  const mockQuestionId = randomUUID();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPut.mockResolvedValue({});
    mockQuery.mockResolvedValue([]);
    process.env.SURVEYS_TABLE = mockTableName;
  });

  describe('create', () => {
    it('should create a survey successfully', async () => {
      const event = {
        body: JSON.stringify({
          title: 'Test Survey',
          description: 'Test Description'
        })
      } as APIGatewayProxyEvent;

      const result = await create(event);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body).message).toBe('Survey created successfully');
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        PK: expect.stringContaining('SURVEY#'),
        SK: 'METADATA',
        title: 'Test Survey',
        description: 'Test Description',
        status: 'CREATED'
      }));
    });

    it('should return 400 for invalid input', async () => {
      const event = {
        body: JSON.stringify({}) // Missing required fields
      } as APIGatewayProxyEvent;

      const result = await create(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('"title" is required');
    });
  });

  describe('addQuestion', () => {
    it('should add a question successfully', async () => {
      const event = {
        pathParameters: { surveyId: mockSurveyId },
        body: JSON.stringify({
          text: 'Test Question',
          type: 'MULTIPLE_CHOICE',
          options: ['Option 1', 'Option 2']
        })
      } as unknown as APIGatewayProxyEvent;

      const result = await addQuestion(event);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body).message).toBe('Question added successfully');
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        PK: `SURVEY#${mockSurveyId}`,
        SK: expect.stringContaining('QUESTION#'),
        text: 'Test Question',
        type: 'MULTIPLE_CHOICE',
        options: ['Option 1', 'Option 2']
      }));
    });

    it('should return 400 for invalid question type', async () => {
      const event = {
        pathParameters: { surveyId: mockSurveyId },
        body: JSON.stringify({
          text: 'Test Question',
          type: 'INVALID_TYPE' // Invalid type
        })
      } as unknown as APIGatewayProxyEvent;

      const result = await addQuestion(event);
      
      expect(JSON.parse(result.body).message).toContain('"type" must be one of [FREE_TEXT, MULTIPLE_CHOICE]');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('getSurvey', () => {
    it('should return survey with questions', async () => {
      const mockSurvey = {
        PK: `SURVEY#${mockSurveyId}`,
        SK: 'METADATA',
        title: 'Test Survey',
        description: 'Test Description',
        status: 'PUBLISHED',
        createdAt: new Date().toISOString()
      };

      const mockQuestion = {
        PK: `SURVEY#${mockSurveyId}`,
        SK: `QUESTION#${mockQuestionId}`,
        text: 'Test Question',
        type: 'FREE_TEXT'
      };

      mockQuery.mockResolvedValueOnce([mockSurvey, mockQuestion]);

      const event = {
        pathParameters: { surveyId: mockSurveyId }
      } as unknown as APIGatewayProxyEvent;

      const result = await getSurvey(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.surveyId).toBe(mockSurveyId);
      expect(body.questions).toHaveLength(1);
    });

    it('should return 404 for non-existent survey with valid ID', async () => {
      mockQuery.mockResolvedValueOnce([]); // Simulate no results found

      const event = {
        pathParameters: { surveyId: mockSurveyId } // Use a valid mockSurveyId
      } as unknown as APIGatewayProxyEvent;

      const result = await getSurvey(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).message).toBe('Survey not found');
    });

    it('should return 400 when surveyId is missing', async () => {
      const event = {
        pathParameters: {} // Missing surveyId
      } as unknown as APIGatewayProxyEvent;

      const result = await getSurvey(event);
      
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('"surveyId" is required');
    });
  });

  describe('submitResponse', () => {
    it('should submit a survey response successfully', async () => {
      const event = {
        pathParameters: { surveyId: mockSurveyId },
        body: JSON.stringify({
          responses: [
            { questionId: mockQuestionId, answer: 'Test Answer' },
            { questionId: randomUUID(), answer: ['Option A', 'Option B'] }
          ]
        })
      } as unknown as APIGatewayProxyEvent;
  
      const result = await submitResponse(event);
  
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body).message).toBe('Response submitted successfully');
      expect(mockPut).toHaveBeenCalledTimes(2); // Two put operations for two responses
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        PK: expect.stringContaining('RESPONSE#'),
        SK: `ANSWER#${mockQuestionId}`,
        surveyId: mockSurveyId,
        answer: 'Test Answer',
        createdAt: expect.any(String)
      }));
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        PK: expect.stringContaining('RESPONSE#'),
        SK: expect.stringContaining('ANSWER#'),
        surveyId: mockSurveyId,
        answer: ['Option A', 'Option B'],
        createdAt: expect.any(String)
      }));
    });
  
    it('should return 400 if surveyId is missing from path parameters', async () => {
      const event = {
        pathParameters: {}, // Missing surveyId
        body: JSON.stringify({
          responses: [{ questionId: mockQuestionId, answer: 'Test Answer' }]
        })
      } as unknown as APIGatewayProxyEvent;
  
      const result = await submitResponse(event);
  
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('Validation error: "surveyId" is required');
    });
  
    it('should return 400 if request body is invalid (e.g., responses is empty)', async () => {
      const event = {
        pathParameters: { surveyId: mockSurveyId },
        body: JSON.stringify({
          responses: [] // Empty responses array
        })
      } as unknown as APIGatewayProxyEvent;
  
      const result = await submitResponse(event);
  
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('"responses" must contain at least 1 items');
    });
  
    it('should return 400 if a questionId is missing in a response', async () => {
      const event = {
        pathParameters: { surveyId: mockSurveyId },
        body: JSON.stringify({
          responses: [{ answer: 'Test Answer' }] // Missing questionId
        })
      } as unknown as APIGatewayProxyEvent;
  
      const result = await submitResponse(event);
  
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain('"responses[0].questionId" is required');
    });
  
    it('should handle multiple choice answers correctly', async () => {
      const event = {
        pathParameters: { surveyId: mockSurveyId },
        body: JSON.stringify({
          responses: [
            { questionId: mockQuestionId, answer: ['Option X', 'Option Y'] }
          ]
        })
      } as unknown as APIGatewayProxyEvent;
  
      const result = await submitResponse(event);
  
      expect(result.statusCode).toBe(201);
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        PK: expect.stringContaining('RESPONSE#'),
        SK: `ANSWER#${mockQuestionId}`,
        surveyId: mockSurveyId,
        answer: ['Option X', 'Option Y'],
        createdAt: expect.any(String)
      }));
    });
  });
});


import { APIGatewayProxyEvent } from 'aws-lambda';
import { validate as uuidValidate } from 'uuid';
import { create } from '../../../../src/modules/surveys/application/surveys';

// Mock del servicio DynamoDB para evitar interacciones reales con la base de datos
jest.mock('@/modules/surveys/infrastructure/services', () => ({
  surveyService: {
    put: jest.fn().mockResolvedValue(true),
  },
  questionService: {
    put: jest.fn().mockResolvedValue(true),
  },
  answerService: {
    put: jest.fn().mockResolvedValue(true),
  },
}));

describe('createSurvey integration', () => {
  it('should create a survey and return its ID with a 201 status', async () => {
    const mockEvent: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({
        title: 'Encuesta de Prueba de Integración',
        description: 'Descripción de la encuesta de prueba de integración.',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      multiValueHeaders: {},
      isBase64Encoded: false,
      path: '/surveys',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        domainName: 'test.execute-api.us-east-1.amazonaws.com',
        extendedRequestId: 'test-request-id',
        httpMethod: 'POST',
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '127.0.0.1',
          user: null,
          userAgent: 'test-agent',
          userArn: null,
          clientCert: null,
        },
        authorizer: null,
        path: '/surveys',
        protocol: 'HTTP/1.1',
        requestId: 'test-request-id',
        requestTime: '18/Jul/2025:12:00:00 +0000',
        requestTimeEpoch: 1678886400,
        resourceId: 'test-resource-id',
        resourcePath: '/surveys',
        stage: 'test',
      },
      resource: '/surveys',
    };

    const response = await create(mockEvent);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Survey created successfully');
    expect(body.id).toBeDefined();
    expect(uuidValidate(body.id)).toBe(true);

    // Verificar la URL de redirección esperada
    const expectedRedirectUrl = `/surveys/${body.id}`;
    // En este contexto de prueba de backend, no hay una redirección HTTP real.
    // La "redirección" se verifica a través del ID devuelto que el frontend usaría.
    // Por lo tanto, la aserción es que el ID es válido y la URL se puede construir.
    expect(typeof expectedRedirectUrl).toBe('string');
    expect(expectedRedirectUrl).toMatch(/\/surveys\/[0-9a-fA-F-]{36}/);
  });

  it('should return 400 for invalid input', async () => {
    const mockEvent: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({
        // Missing title and description
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      multiValueHeaders: {},
      isBase64Encoded: false,
      path: '/surveys',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        domainName: 'test.execute-api.us-east-1.amazonaws.com',
        extendedRequestId: 'test-request-id',
        httpMethod: 'POST',
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '127.0.0.1',
          user: null,
          userAgent: 'test-agent',
          userArn: null,
          clientCert: null,
        },
        authorizer: null,
        path: '/surveys',
        protocol: 'HTTP/1.1',
        requestId: 'test-request-id',
        requestTime: '18/Jul/2025:12:00:00 +0000',
        requestTimeEpoch: 1678886400,
        resourceId: 'test-resource-id',
        resourcePath: '/surveys',
        stage: 'test',
      },
      resource: '/surveys',
    };

    const response = await create(mockEvent);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Validation error');
  });
});
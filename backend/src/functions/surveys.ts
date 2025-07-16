// src/functions/surveys.ts

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Inicializamos el cliente de DynamoDB.
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// El nombre de la tabla lo podríamos pasar por una variable de entorno en serverless.yml
const TABLE_NAME = "SurveyPlatform";

export const create = async (event) => {
  // El cuerpo de la petición viene como un string, necesitamos parsearlo.
  const { title, description } = JSON.parse(event.body);
  const surveyId = randomUUID();

  // El comando para crear un nuevo item en DynamoDB.
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SURVEY#${surveyId}`, // Partition Key para agrupar todo lo de la encuesta
      SK: "METADATA",         // Sort Key para el dato principal (metadatos)
      title,
      description,
      status: "CREATED",
      createdAt: new Date().toISOString(),
    },
  });

  try {
    await docClient.send(command);
    
    // Devolvemos una respuesta exitosa.
    return {
      statusCode: 201, // 201 = Created
      body: JSON.stringify({
        message: "Survey created successfully",
        surveyId,
      }),
    };
  } catch (error) {
    console.error(error);
    // Devolvemos un error si algo sale mal.
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error creating survey" }),
    };
  }
};

export const addQuestion = async (event) => {
  // Obtenemos el ID de la encuesta de los parámetros de la ruta
  const { surveyId } = event.pathParameters;
  
  // Obtenemos los datos de la pregunta del cuerpo de la petición
  // Para el MVP, esperamos 'text' y 'type'. 'options' es opcional.
  const { text, type, options } = JSON.parse(event.body);

  const questionId = randomUUID();

  // Creamos el comando para guardar la pregunta en DynamoDB
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SURVEY#${surveyId}`,         // Usamos la misma Partition Key para agrupar
      SK: `QUESTION#${questionId}`,    // Usamos una Sort Key diferente para identificar la pregunta
      text,
      type, // Será 'FREE_TEXT' o 'MULTIPLE_CHOICE'
      options, // Será un array de strings si es de opción múltiple, o undefined si no
    },
  });

  try {
    await docClient.send(command);

    return {
      statusCode: 201, // Created
      body: JSON.stringify({
        message: "Question added successfully",
        questionId,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error adding question" }),
    };
  }
};
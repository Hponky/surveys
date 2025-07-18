import { DynamoDB } from 'aws-sdk';
import Joi from 'joi';

interface PutItemInputAttributeMap {
  [key: string]: DynamoDB.DocumentClient.AttributeValue;
}

/**
 * Interfaz base para operaciones CRUD con DynamoDB siguiendo el patrón Repository
 * @template T - Tipo de la entidad de dominio
 * @template ID - Tipo del identificador único (por defecto string)
 */
export interface DynamoService<T, ID = string> {
  /**
   * Almacena una nueva entidad en la tabla
   * @param item - Entidad a crear
   * @returns Promise con la entidad creada
   * @throws DynamoDBError si falla la operación
   */
  put(item: T): Promise<T>;

  /**
   * Obtiene una entidad por su identificador único
   * @param id - Identificador único de la entidad
   * @returns Promise con la entidad encontrada o undefined si no existe
   * @throws DynamoDBError si falla la operación
   */
  get(id: ID): Promise<T | undefined>;

  /**
   * Actualiza una entidad existente
   * @param id - Identificador único de la entidad
   * @param updates - Campos a actualizar (Partial<T>)
   * @returns Promise con la entidad actualizada
   * @throws DynamoDBError si falla la operación o la entidad no existe
   */
  update(id: ID, updates: Partial<T>): Promise<T>;

  /**
   * Elimina una entidad
   * @param id - Identificador único de la entidad
   * @returns Promise que resuelve cuando se completa la operación
   * @throws DynamoDBError si falla la operación
   */
  delete(id: ID): Promise<void>;

  /**
   * Consulta elementos en la tabla usando condiciones
   * @param queryParams - Parámetros de consulta DynamoDB
   * @returns Promise con los resultados de la consulta
   * @throws DynamoDBError si falla la operación
   */
  query(queryParams: DynamoDB.DocumentClient.QueryInput): Promise<T[]>;
}

/**
 * Implementación concreta para DynamoDB
 * @template T - Tipo del modelo de datos
 */
export class DynamoServiceImpl<T extends PutItemInputAttributeMap> implements DynamoService<T> {
  private readonly dynamoDb: DynamoDB.DocumentClient;
  private readonly tableName: string;
  private readonly putSchema: Joi.ObjectSchema<T>;
  private readonly querySchema: Joi.ObjectSchema<any>;

  constructor(tableName: string, putSchema: Joi.ObjectSchema<T>, querySchema: Joi.ObjectSchema<any>) {
    this.dynamoDb = new DynamoDB.DocumentClient();
    this.tableName = tableName;
    this.putSchema = putSchema;
    this.querySchema = querySchema;
  }

  private async validateInput(input: any, schema: Joi.Schema): Promise<void> {
    try {
      await schema.validateAsync(input, { abortEarly: false });
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const details = error.details.map(d => d.message).join(', ');
        throw new Error(`Validation failed: ${details}`);
      }
      throw error;
    }
  }

  async put(item: T): Promise<T> {
    await this.validateInput(item, this.putSchema);
    
    const params = {
      TableName: this.tableName,
      Item: item
    };

    await this.dynamoDb.put(params).promise();
    return item;
  }

  async get(id: string): Promise<T | undefined> {
    const params = {
      TableName: this.tableName,
      Key: { id }
    };

    const result = await this.dynamoDb.get(params).promise();
    return result.Item as T | undefined;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    // Validar primero el ID
    await this.validateInput({id}, Joi.object({id: Joi.string().required()}));
    
    // Excluir el campo 'id' de los updates y validar el resto
    const updatesWithoutId = Object.fromEntries(
      Object.entries(updates).filter(([key]) => key !== 'id')
    );
    
    if (Object.keys(updatesWithoutId).length > 0) {
      await this.validateInput(updatesWithoutId, this.putSchema.fork(['id'], schema => schema.optional()));
    }

    const updateExpression = Object.keys(updatesWithoutId)
      .map(key => `#${key} = :${key}`)
      .join(', ');

    const expressionAttributeNames = Object.keys(updatesWithoutId)
      .reduce((acc, key) => ({
        ...acc,
        [`#${key}`]: key
      }), {});

    const expressionAttributeValues = Object.entries(updatesWithoutId)
      .reduce((acc, [key, value]) => ({
        ...acc,
        [`:${key}`]: value
      }), {});

    const params = {
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: `set ${updateExpression}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await this.dynamoDb.update(params).promise();
    return result.Attributes as T;
  }

  async delete(id: string): Promise<void> {
    await this.validateInput({id}, Joi.object({id: Joi.string().required()}));
    
    const params = {
      TableName: this.tableName,
      Key: { id }
    };

    await this.dynamoDb.delete(params).promise();
  }

  async query(queryParams: DynamoDB.DocumentClient.QueryInput): Promise<T[]> {
    const params = {
      ...queryParams,
      TableName: this.tableName
    };

    // Validar que TableName coincida con el configurado
    await this.validateInput({TableName: params.TableName},
      Joi.object({TableName: Joi.string().valid(this.tableName).required()}));
      
    await this.validateInput(params, this.querySchema);
    const result = await this.dynamoDb.query(params).promise();
    return result.Items as T[] || [];
  }
}
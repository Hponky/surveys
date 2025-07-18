import Joi from 'joi';

/**
 * Esquemas de validación para operaciones CRUD con DynamoDB
 * 
 * @module DynamoValidations
 */

/**
 * Esquema base para validación de IDs
 * Valida que el ID sea un string no vacío
 */
const idSchema = Joi.string().required().messages({
  'string.empty': 'El ID no puede estar vacío',
  'any.required': 'El ID es requerido'
});

/**
 * Esquema para validar operaciones PUT (creación de items)
 * @template T - Tipo del item a validar
 * @param itemSchema - Esquema Joi para validar el item completo
 * @returns Esquema de validación para operaciones PUT
 */
export const putSchema = <T>(itemSchema: Joi.ObjectSchema<T>) => Joi.object({
  item: itemSchema.required()
}).required();

/**
 * Esquema para validar operaciones GET (obtención por ID)
 * @returns Esquema de validación para operaciones GET
 */
export const getSchema = Joi.object({
  id: idSchema
}).required();

/**
 * Esquema para validar operaciones UPDATE (actualización parcial)
 * @template T - Tipo del partial item a validar
 * @param partialSchema - Esquema Joi para validar el partial item
 * @returns Esquema de validación para operaciones UPDATE
 */
export const updateSchema = <T>(partialSchema: Joi.ObjectSchema<Partial<T>>) => Joi.object({
  id: idSchema,
  updates: partialSchema.required()
}).required();

/**
 * Esquema para validar operaciones DELETE (eliminación por ID)
 * @returns Esquema de validación para operaciones DELETE
 */
export const deleteSchema = Joi.object({
  id: idSchema
}).required();

/**
 * Esquema base para validar operaciones QUERY
 * Valida parámetros básicos de consulta en DynamoDB
 */
export const querySchema = Joi.object({
  TableName: Joi.string().required(),
  KeyConditionExpression: Joi.string().required(),
  ExpressionAttributeValues: Joi.object().required()
}).required();
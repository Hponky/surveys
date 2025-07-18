import { DynamoServiceImpl } from '../../src/shared/dynamo-service';
import * as Joi from 'joi';

const mockPut = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({})
});

const mockGet = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({})
});

const mockUpdate = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({})
});

const mockDelete = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({})
});

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: mockPut,
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete
    }))
  }
}));

// Mock schemas aligned with implementation
const mockPutSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().optional()
});

const mockQuerySchema = Joi.object({
  TableName: Joi.string().required(),
  KeyConditionExpression: Joi.string().required(),
  ExpressionAttributeValues: Joi.object().required()
}).unknown(true); // Allow additional DynamoDB params

describe('DynamoServiceImpl', () => {
  const mockTableName = 'test-table';
  let service: DynamoServiceImpl<any>;

  beforeEach(() => {
    service = new DynamoServiceImpl(mockTableName, mockPutSchema, mockQuerySchema);
  });

  describe('constructor', () => {
    it('should initialize with provided table name', () => {
      expect((service as any).tableName).toBe(mockTableName);
    });

    it('should create a DynamoDB DocumentClient instance', () => {
      expect((service as any).dynamoDb).toBeDefined();
    });

    it('should initialize with provided schemas', () => {
      expect((service as any).putSchema).toBe(mockPutSchema);
      expect((service as any).querySchema).toBe(mockQuerySchema);
    });
  });

  describe('create', () => {
    it('should call DocumentClient.put with correct params', async () => {
      const testItem = { id: '123', name: 'Test' };
      await service.put(testItem);

      expect(mockPut).toHaveBeenCalledWith({
        TableName: mockTableName,
        Item: testItem
      });
    });

    it('should return the created item', async () => {
      const testItem = { id: '123', name: 'Test' };
      const result = await service.put(testItem);
      
      expect(result).toEqual(testItem);
    });

    it('should throw validation error for invalid input', async () => {
      const invalidItem = { invalid: 'data' };
      await expect(service.put(invalidItem)).rejects.toThrow('Validation failed');
    });
  });

  describe('get', () => {
    it('should call DocumentClient.get with correct params', async () => {
      const testId = 'test-id';
      await service.get(testId);

      expect(mockGet).toHaveBeenCalledWith({
        TableName: mockTableName,
        Key: { id: testId }
      });
    });

    it('should return the item when found', async () => {
      const testItem = { id: '123', name: 'Test Item' };
      mockGet.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ Item: testItem })
      });

      const result = await service.get(testItem.id);
      expect(result).toEqual(testItem);
    });

    it('should return undefined when item not found', async () => {
      mockGet.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await service.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should throw when DynamoDB operation fails', async () => {
      const testError = new Error('DynamoDB error');
      mockGet.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(testError)
      });

      await expect(service.get('any-id')).rejects.toThrow(testError);
    });
  });

  describe('update', () => {
    it('should call DocumentClient.update with correct params', async () => {
      const testId = 'test-id';
      const testUpdates = { id: testId, name: 'Updated Name' };
      await service.update(testId, testUpdates);

      expect(mockUpdate).toHaveBeenCalledWith({
        TableName: mockTableName,
        Key: { id: testId },
        UpdateExpression: 'set #name = :name',
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':name': testUpdates.name },
        ReturnValues: 'ALL_NEW'
      });
    });

    it('should return the updated item', async () => {
      const testItem = { id: '123', name: 'Updated Item' };
      mockUpdate.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ Attributes: testItem })
      });

      const result = await service.update(testItem.id, testItem);
      expect(result).toEqual(testItem);
    });

    it('should throw when DynamoDB operation fails', async () => {
      const testError = new Error('Database operation failed');
      mockUpdate.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(testError)
      });

      await expect(service.update('valid-id', { name: 'test' }))
        .rejects
        .toThrow('Database operation failed');
    });

    it('should throw validation error for invalid id', async () => {
      await expect(service.update('', { name: 'test' }))
        .rejects
        .toThrow('Validation failed: "id" is not allowed to be empty');
    });
  });

  describe('delete', () => {
    it('should call DocumentClient.delete with correct params', async () => {
      const testId = 'test-id';
      await service.delete(testId);

      expect(mockDelete).toHaveBeenCalledWith({
        TableName: mockTableName,
        Key: { id: testId }
      });
    });

    it('should complete without errors', async () => {
      const testId = 'test-id';
      await expect(service.delete(testId)).resolves.not.toThrow();
    });

    it('should throw when DynamoDB operation fails', async () => {
      const testError = new Error('DynamoDB error');
      mockDelete.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(testError)
      });

      await expect(service.delete('any-id')).rejects.toThrow(testError);
    });

    it('should throw validation error for invalid id', async () => {
      await expect(service.delete('')).rejects.toThrow('Validation failed');
    });
  });

  describe('query', () => {
    const mockQuery = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Items: [] })
    });

    beforeEach(() => {
      (service as any).dynamoDb.query = mockQuery;
    });

    it('should throw validation error for invalid query params', async () => {
      await expect(service.query({
        TableName: '', // Invalid
        KeyConditionExpression: '', // Invalid
        ExpressionAttributeValues: {} // Invalid
      })).rejects.toThrow('Validation failed');
    });

    it('should call DocumentClient.query with valid params', async () => {
      const validParams = {
       TableName: mockTableName,
       KeyConditionExpression: 'id = :id',
       ExpressionAttributeValues: { ':id': 'test-id' }
      };

      await service.query(validParams);

      expect(mockQuery).toHaveBeenCalledWith(validParams);
    });

    it('should return query results', async () => {
      const testItems = [{ id: '1' }, { id: '2' }];
      mockQuery.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ Items: testItems })
      });

      const result = await service.query({
        TableName: 'valid-table',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': 'test-id' }
      });

      expect(result).toEqual(testItems);
    });
  });
});
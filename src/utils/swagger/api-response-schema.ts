import { getSchemaPath } from '@nestjs/swagger';

export const ApiResSchema = {
  apply: schema => ({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(schema),
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  }),
  applyArr: schema => ({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            $ref: getSchemaPath(schema),
          },
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  }),
  applyType: thisType => ({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
        data: {
          type: thisType,
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  }),
};

import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

export const ApiBatchResponse = () => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
          },
          data: {
            properties: {
              count: {
                type: 'number',
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    }),
  );
};

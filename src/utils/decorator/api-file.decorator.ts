import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export function ApiFile() {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Arquivo excel (xlsx).',
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}

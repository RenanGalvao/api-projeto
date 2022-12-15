import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export function ApiFiles(description = 'Uploads many files at once.') {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description,
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}

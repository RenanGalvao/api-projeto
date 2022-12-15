import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export function ApiFile(description = 'Uploads one file.') {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description,
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

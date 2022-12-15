import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { LoginDto, LoginResponseDto } from 'src/auth/dto';

export const ApiLogin = () => {
  return applyDecorators(
    ApiBody({ type: LoginDto }),
    ApiExtraModels(LoginResponseDto),
    ApiCreatedResponse({
      schema: {
        properties: {
          message: {
            type: 'string',
          },
          data: {
            $ref: getSchemaPath(LoginResponseDto),
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

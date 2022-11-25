import { applyDecorators } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels } from '@nestjs/swagger';

export const ApiController = (
  apiTag: string,
  apiExtraModels: Function[],
  apiBearerAuth = false,
) => {
  return applyDecorators(
    ApiTags(apiTag),
    ApiExtraModels(...apiExtraModels),
    apiBearerAuth ? ApiBearerAuth() : () => {},
  );
};

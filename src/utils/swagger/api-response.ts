import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { CreateFieldDto } from 'src/field/dto';
import {
  CollectionPoints,
  MapOptions,
  PolygonOptions,
} from '../google-maps/classes';
import { ApiResponseOptions } from '../types';

export const ApiResponse = <TModel extends Type<any>>(
  model: TModel,
  options: ApiResponseOptions = {
    paginated: false,
    omitNestedField: false,
  },
) => {
  const field = {
    allOf: [
      { $ref: getSchemaPath(CreateFieldDto) },
      {
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
          deleted: {
            type: 'string',
            format: 'date-time',
            default: null,
          },
          // @TODO maybe ?
          // https://github.com/nestjs/swagger/issues/1323
          mapLocation: {
            $ref: getSchemaPath(MapOptions),
          },
          mapArea: {
            type: 'array',
            items: {
              $ref: getSchemaPath(PolygonOptions),
            },
          },
          collectionPoints: {
            type: 'array',
            items: {
              $ref: getSchemaPath(CollectionPoints),
            },
          },
        },
      },
    ],
  };

  if (options?.paginated) {
    let data = {
      type: 'array',
      items: {
        allOf: [
          { $ref: getSchemaPath(model) },
          {
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
              },
              deleted: {
                type: 'string',
                format: 'date-time',
                default: null,
              },
            },
          },
        ],
      },
    };

    if (!options?.omitNestedField) {
      (data.items.allOf[1].properties as any).field = field;
    }
    if (options?.extend) {
      (data.items.allOf[1].properties as any)[options.extend.key] =
        options.extend.value;
    }

    return applyDecorators(
      ApiOkResponse({
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            data,
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      }),
    );
  } else {
    let data = {
      allOf: [
        { $ref: getSchemaPath(model) },
        {
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            deleted: {
              type: 'string',
              format: 'date-time',
              default: null,
            },
          },
        },
      ],
    };

    if (!options?.omitNestedField) {
      (data.allOf[1].properties as any).field = field;
    }

    if (options?.extend) {
      (data.allOf[1].properties as any)[options.extend.key] =
        options.extend.value;
    }

    return applyDecorators(
      ApiOkResponse({
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            data,
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      }),
    );
  }
};

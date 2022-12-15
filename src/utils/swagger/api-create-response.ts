import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse as ApiCreatedRes,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateFieldDto } from 'src/field/dto';
import {
  MapOptions,
  CollectionPoints,
  PolygonOptions,
} from 'src/utils/google-maps/classes';
import { ApiCreatedResponseOptions } from '../types';

export const ApiCreatedResponse = <TModel extends Type<any>>(
  model: TModel,
  options: ApiCreatedResponseOptions = {
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

    return applyDecorators(
      ApiCreatedRes({
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
    let data: any = {
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
      data.allOf[1].properties.field = field;
    }

    return applyDecorators(
      ApiCreatedRes({
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

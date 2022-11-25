import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ITEMS_PER_PAGE } from 'src/constants';
import { PaginationDto } from './dto';
import { PrismaUtils } from 'src/utils';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private _ITEMS_PER_PAGE = ITEMS_PER_PAGE;
  private _FIRST_PAGE = 1;

  private _defPagOpts: PaginationDto = {
    itemsPerPage: this._ITEMS_PER_PAGE,
    page: this._FIRST_PAGE,
    deleted: false,
    orderKey: 'createdAt',
    orderValue: 'desc'
  };

  async onModuleInit() {
    await this.$connect();

    /***********************************/
    /* SOFT DELETE MIDDLEWARE */
    /***********************************/
    this.$use(async (params, next) => {
      // Use transactions to skip this middleware
      if (params.runInTransaction) {
        return next(params);
      }

      if (params.action === 'findUnique' || params.action === 'findFirst') {
        // Change to findFirst - you cannot filter
        // by anything except ID / unique with findUnique
        params.action = 'findFirst';
        if (params.args.where.deleted == undefined) {
          // Exclude deleted records if they have not been explicitly requested
          params.args.where['deleted'] = null;
        }
      }
      if (params.action === 'findMany') {
        // Find many queries
        if (params.args.where) {
          if (params.args.where.deleted == undefined) {
            // Exclude deleted records if they have not been explicitly requested
            params.args.where['deleted'] = null;
          }
        } else {
          params.args['where'] = { deleted: null };
        }
      }

      if (params.action == 'delete') {
        // Delete queries
        // Change action to an update
        params.action = 'update';
        params.args['data'] = { deleted: new Date() };
      }
      if (params.action == 'deleteMany') {
        // Delete many queries
        params.action = 'updateMany';
        if (params.args.data != undefined) {
          params.args.data['deleted'] = new Date();
        } else {
          params.args['data'] = { deleted: new Date() };
        }
      }

      if (params.action == 'count') {
        if (params.args.where) {
          if (params.args.where.deleted == undefined) {
            // Exclude deleted records if they have not been explicitly requested
            params.args.where['deleted'] = null;
          }
        } else {
          params.args['where'] = { deleted: null };
        }
      }

      return next(params);
    });
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async cleanDataBase() {
    if (process.env.NODE_ENV === 'production') return;
    const models = Reflect.ownKeys(this).filter(key => key[0] !== '_');
    await this.$transaction(models.map(model => this[model].deleteMany()));
  }

  private getPaginationFromQuery(options: PaginationDto = this._defPagOpts) {
    options = {
      ...this._defPagOpts,
      ...options,
    };

    const itemsPerPage = options.itemsPerPage;
    const page = +options.page;
    const take = +itemsPerPage;
    let skip = 0;

    if (page !== this._FIRST_PAGE) {
      skip = (page - 1) * itemsPerPage;
    }

    const orderKey = options.orderKey;
    const orderValue = options.orderValue;

    // Doesn't return docs flagged as deleted
    if (!options.deleted) {
      return {
        skip,
        take,
        where: { deleted: null },
        orderBy: { [orderKey]: orderValue }
      };
    } else {
      return {
        skip,
        take,
        orderBy: { [orderKey]: orderValue }
      };
    }
  }

  async paginatedQuery(modelKey: string, query?: PaginationDto, options: any = {}) {
    const pagination = this.getPaginationFromQuery(query);
    let findAllQuery: any;

    if (options.include) {
      findAllQuery = this[modelKey].findMany({ ...pagination, include: options.include });
    } else {
      findAllQuery = this[modelKey].findMany({ ...pagination });
    }
    
    const totalItemsQuery = this[modelKey].count();
    let totalCount = 0;
    let data = null;

    if (options.excludeKeys) {
      let tmp = null;
      [tmp, totalCount] = await this.$transaction([findAllQuery, totalItemsQuery]);
      // @ts-ignore
      data = PrismaUtils.excludeMany(tmp, ...options.excludeKeys);
    } else {
      [data, totalCount] = await this.$transaction([findAllQuery, totalItemsQuery]);
    }
    const totalPages = Math.ceil(totalCount / pagination.take);
    return { data, totalCount, totalPages };
  }
}

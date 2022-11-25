import {
  CACHE_MANAGER,
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SERVER_NAME } from './constants';
import { Cache } from 'cache-manager';
import { cacheKeysToDelete, cacheNeedsReset, getRoute } from './utils';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap(async () => {
        response.header('Server', SERVER_NAME);

        if (cacheNeedsReset(handler, response.statusCode)) {
          const domain = getRoute(request.path);
          const cacheKeys = await this.cacheManager.store.keys();

          for (const key of cacheKeysToDelete(domain, cacheKeys)) {
            await this.cacheManager.del(key);
          }
        }
      }),
    );
  }
}

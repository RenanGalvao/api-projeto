import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { getRoute, generateMessage, handleData } from './utils';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler().name;
    const route = getRoute(request.path);

    return next.handle().pipe(
      map((data) => ({
        message: generateMessage(route, handler),
        data: handleData(context, handler, data),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

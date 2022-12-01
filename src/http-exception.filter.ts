import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MESSAGE } from './constants';
import * as fs from 'fs';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    if (status === 401) {
      return response.status(status).json({
        message: MESSAGE.RESPONSE.NOT_AUTHORIZED,
        data: {},
        timestamp: new Date().toISOString(),
      });
    }
    // Remove File if uploaded
    else if ((status === 422 && request.file) || request.files) {
      if (request.file) {
        if (fs.existsSync(request.file.path)) {
          fs.unlinkSync(request.file.path);
        }
      } else if (request.files) {
        for (const file of request.files as Express.Multer.File[]) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }
    } else if (status === 429) {
      return response.status(status).json({
        message: MESSAGE.EXCEPTION.TOO_MANY_REQUESTS,
        data: {},
        timestamp: new Date().toISOString(),
      });
    }

    // FallBack
    if (
      typeof exception.getResponse() == 'object' &&
      !Object.keys(exception.getResponse()).includes('statusCode')
    ) {
      return response.status(status).json({
        ...(exception.getResponse() as object),
        timestamp: new Date().toISOString(),
      });
    } else {
      return response.status(status).json({
        message: (exception.getResponse() as any).error || exception.message,
        data: (exception.getResponse() as any).message || {},
        timestamp: new Date().toISOString(),
      });
    }
  }
}

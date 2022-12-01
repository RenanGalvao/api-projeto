import { ExecutionContext } from '@nestjs/common';
import { Response } from 'express';
import { MESSAGE, TEMPLATE } from 'src/constants';
import { routes } from './routes-object';

export function getRoute(route: string) {
  for (const routeKey in orderKeysDescending(routes)) {
    if (route.match(RegExp(routeKey))) {
      return routeKey;
    }
  }
}

// sort alphabetically
function orderKeysDescending(object) {
  return Object.keys(object)
    .sort((a, b) => {
      if (a < b) return 1;
      if (a > b) return -1;
      return 0;
    })
    .reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
}

export function generateMessage(route: string, handler: string): string {
  if (handler.match(/bulkCreate/i)) {
    return TEMPLATE.ROUTES.BULK_CREATE(
      routes[route].plural,
      routes[route].gender,
    );
  } else if (handler.match(/create/i)) {
    return TEMPLATE.ROUTES.CREATE(routes[route].singular, routes[route].gender);
  } else if (handler.match(/all/i)) {
    return TEMPLATE.ROUTES.FIND_ALL(routes[route].plural, routes[route].gender);
  } else if (handler.match(/one/i)) {
    return TEMPLATE.ROUTES.FIND_ONE(
      routes[route].singular,
      routes[route].gender,
    );
  } else if (handler.match(/update/i)) {
    return TEMPLATE.ROUTES.UPDATE(routes[route].singular, routes[route].gender);
  } else if (handler.match(/bulkRemove/i)) {
    return TEMPLATE.ROUTES.BULK_REMOVE(
      routes[route].plural,
      routes[route].gender,
    );
  } else if (handler.match(/remove/i)) {
    return TEMPLATE.ROUTES.REMOVE(routes[route].singular, routes[route].gender);
  } else if (handler.match(/restore/i)) {
    return TEMPLATE.ROUTES.RESTORE(
      routes[route].singular,
      routes[route].gender,
    );
  } else if (handler.match(/clean/i)) {
    return TEMPLATE.ROUTES.CLEAN(routes[route].singular, routes[route].gender);
  } else if (handler.match(/hardRemove/i)) {
    return TEMPLATE.ROUTES.HARD_REMOVE(
      routes[route].singular,
      routes[route].gender,
    );
  }

  // Auth Routes
  else if (handler.match(/signin/i)) {
    return MESSAGE.ROUTES.LOGIN;
  } else if (handler.match(/validate/i)) {
    return MESSAGE.ROUTES.VALIDATE_TOKEN;
  } else if (handler.match(/sendRecoverEmail/i)) {
    return MESSAGE.ROUTES.SEND_RECOVER_EMAIL;
  } else if (handler.match(/confirmRecoverEmail/i)) {
    return MESSAGE.ROUTES.CONFIRM_RECOVER_EMAIL;
  }
}

export function handleData(
  context: ExecutionContext,
  handler: string,
  resData: any,
) {
  if (
    handler.match(/findAll/i) &&
    Object.keys(resData).includes('totalCount')
  ) {
    const response = context.switchToHttp().getResponse<Response>();
    const { data, totalCount, totalPages } = resData;

    response.header('X-Total-Count', totalCount);
    response.header('X-Total-Pages', totalPages);
    return data;
  } else {
    return resData;
  }
}

// Cache Control Interceptor
export function cacheNeedsReset(handler: string, statusCode: number) {
  return (
    (handler.match(/create|update|remove|restore/i) && statusCode == 200) ||
    statusCode == 201
  );
}

export function cacheKeysToDelete(domain: string, cacheKeys: string[]) {
  const pattern = RegExp(`^\/${domain}`);
  const keysToDelete = [];

  for (const key of cacheKeys) {
    if (pattern.test(key)) {
      keysToDelete.push(key);
    }
  }
  return keysToDelete;
}

import type { IncomingHttpHeaders } from 'node:http';
import type { Response } from 'express';

export function toHeaders(headers: IncomingHttpHeaders): Headers {
  const normalizedHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        normalizedHeaders.append(key, item);
      }

      continue;
    }

    if (typeof value === 'string') {
      normalizedHeaders.set(key, value);
    }
  }

  return normalizedHeaders;
}

export function appendResponseHeaders(
  response: Response,
  headers: Headers,
): void {
  const setCookies = getSetCookies(headers);

  if (setCookies.length > 0) {
    response.setHeader('Set-Cookie', setCookies);
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }

    response.setHeader(key, value);
  });
}

function getSetCookies(headers: Headers): string[] {
  const headerBag = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headerBag.getSetCookie === 'function') {
    return headerBag.getSetCookie();
  }

  const singleHeader = headers.get('set-cookie');

  return singleHeader ? [singleHeader] : [];
}

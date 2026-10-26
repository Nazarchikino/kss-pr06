import {
  StandardSchemaValidationPipe,
  UnprocessableEntityException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

export interface FieldError {
  field: string;
  message: string;
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    return [...own, ...flattenValidationErrors(e.children ?? [], field)];
  });
}

export function createFieldErrorException(
  field: string,
  message: string,
): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: 'Дані не відповідають вимогам',
    errors: [{ field, message }],
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new UnprocessableEntityException({
        message: 'Дані не відповідають вимогам',
        errors: flattenValidationErrors(errors),
      }),
  });
}

export function createStandardSchemaValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues) => {
      const errors: FieldError[] = issues.flatMap((issue) => {
        if ('keys' in issue && Array.isArray(issue.keys)) {
          return issue.keys.map((key) => ({
            field: String(key),
            message: issue.message,
          }));
        }
        const path = (issue.path ?? [])
          .map((seg) =>
            typeof seg === 'object' && seg !== null && 'key' in seg
              ? String(seg.key)
              : String(seg),
          )
          .join('.');
        return [{ field: path || 'body', message: issue.message }];
      });
      return new UnprocessableEntityException({
        message: 'Дані не відповідають вимогам',
        errors,
      });
    },
  });
}

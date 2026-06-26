import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { MappingStrategy, ProblemDetails } from './strategy';
import { CombinedMapperRegistryFactory } from './registry';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const req = ctx.getRequest<any>();

    // Try mapping standard domain / custom exceptions
    const mappingStrategy = new MappingStrategy(CombinedMapperRegistryFactory.create());
    const problemDetails = mappingStrategy.map(exception);

    if (problemDetails) {
      problemDetails.instance = req?.url;
      return response.status(problemDetails.status).json(problemDetails);
    }

    // Try mapping HttpException to RFC 7807 problem details structure
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      const detail = typeof exceptionResponse === 'object' 
        ? exceptionResponse.message || exception.message 
        : exceptionResponse || exception.message;

      const problem: ProblemDetails = {
        status,
        title: exception.name,
        detail: Array.isArray(detail) ? detail.join(', ') : String(detail),
        type: `/problem/${exception.constructor.name}`,
        instance: req?.url,
      };

      if (typeof exceptionResponse === 'object' && exceptionResponse.error) {
        problem.title = exceptionResponse.error;
      }

      return response.status(status).json(problem);
    }

    // fallback to NestJS default exception filter behavior for unhandled errors
    super.catch(exception, host);
  }
}

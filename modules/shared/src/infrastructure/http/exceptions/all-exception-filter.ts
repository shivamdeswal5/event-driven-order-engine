import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { DefaultMappingStrategy } from 'http-problem-details-mapper';
import { ProblemDocument } from 'http-problem-details';
import { CombinedMapperRegistryFactory } from './registry';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const req = ctx.getRequest<any>();

    // Try mapping standard domain / custom exceptions
    const mappingStrategy = new DefaultMappingStrategy(CombinedMapperRegistryFactory.create());
    const problemDetails = mappingStrategy.map(exception);

    if (problemDetails) {
      // problemDetails is a ProblemDocument instance
      const json = { ...problemDetails, instance: req?.url };
      return response.status(problemDetails.status).json(json);
    }

    // Try mapping HttpException to RFC 7807 problem details structure
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      const detail = typeof exceptionResponse === 'object' 
        ? exceptionResponse.message || exception.message 
        : exceptionResponse || exception.message;

      const problem = new ProblemDocument({
        status,
        title: typeof exceptionResponse === 'object' && exceptionResponse.error ? exceptionResponse.error : exception.name,
        detail: Array.isArray(detail) ? detail.join(', ') : String(detail),
        type: `/problem/${exception.constructor.name}`,
      });

      const json = { ...problem, instance: req?.url };
      return response.status(status).json(json);
    }

    // fallback to NestJS default exception filter behavior for unhandled errors
    super.catch(exception, host);
  }
}

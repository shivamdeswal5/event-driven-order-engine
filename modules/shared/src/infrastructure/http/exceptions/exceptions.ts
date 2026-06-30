import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class DtoValidation extends BadRequestException {
  constructor(errors: ValidationError[]) {
    const messages = DtoValidation.extractMessages(errors);
    super(messages, 'Validation failed');
  }

  private static extractMessages(
    errors: ValidationError[],
    parentProperty: string = '',
  ): { name: string; message: string }[] {
    const messages: { name: string; message: string }[] = [];

    errors.forEach((error) => {
      const propertyName = parentProperty
        ? `${parentProperty}.${error.property}`
        : error.property;

      if (error.constraints) {
        messages.push({
          name: propertyName,
          message: Object.values(error.constraints).join(', '),
        });
      } else if (error?.children?.length) {
        const childMessages = this.extractMessages(
          error.children,
          propertyName,
        );
        messages.push(...childMessages);
      }
    });

    return messages;
  }
}

export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

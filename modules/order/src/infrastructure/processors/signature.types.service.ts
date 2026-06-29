import { Injectable } from '@nestjs/common';
import { SignatureTypes } from '@shared/infrastructure/message-bus/rabbitmq/signature-types';
import { LazyLoadHandler } from '@shared/infrastructure/message-bus/lazy-load-handler.service';

@Injectable()
export class OrderSignatureTypes extends SignatureTypes {
  constructor(readonly lazyLoader: LazyLoadHandler) {
    super(lazyLoader);
  }

  // Register subscription handlers here in future phases (e.g., when reacting to inventory or payment events).
  // Format: Record<routingKey, Array<HandlerClass>>
  public override signatureTypes: Record<string, any[]> = {};
}

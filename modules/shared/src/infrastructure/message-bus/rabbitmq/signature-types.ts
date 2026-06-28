import { Injectable } from '@nestjs/common';
import { LazyLoadHandler } from '../lazy-load-handler.service';

@Injectable()
export abstract class SignatureTypes {
  constructor(readonly lazyLoader: LazyLoadHandler) {}

  public signatureTypes: Record<string, any[]> = {};

  public getSignatureTypes(): Record<string, any[]> {
    return this.signatureTypes;
  }
}

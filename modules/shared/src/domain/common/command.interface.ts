export interface Command<TPayload = any> {
  commandId: string;
  commandType: string;
  occurredAt: Date;
  payload: TPayload;
}

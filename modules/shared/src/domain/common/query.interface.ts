export interface Query<TPayload = any> {
  queryId: string;
  queryType: string;
  occurredAt: Date;
  payload: TPayload;
}

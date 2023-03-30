
export interface WorkerMessage<T> {
  type: string;
  data: T
}

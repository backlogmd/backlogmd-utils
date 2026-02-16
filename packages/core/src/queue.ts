type Operation<T> = () => Promise<T>;

export class OperationQueue {
  private running: Promise<unknown> = Promise.resolve();

  async enqueue<T>(op: Operation<T>): Promise<T> {
    let result: T;
    this.running = this.running.then(async () => {
      result = await op();
    });
    await this.running;
    return result!;
  }
}

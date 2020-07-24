
class CancelToken {
    cancel(): void;
}

class Future<T> extends Promise<T> {
    setTimeout(timeout: Number): Future<T>;
    setCancelToken(cancelToken: CancelToken): Future<T>;
}

class Client {
    static of(name: String): Client;
    on(method: String, event: (payload?: any, ack: (payload: any, error: any) => any, cancel?: (cancelToken: CancelToken) => void) =>void ): void;
    emit(method: String, payload: any): void;
    deliver<T>(method: String, payload: any): Future<T>;
}

module.exports.default = Client;
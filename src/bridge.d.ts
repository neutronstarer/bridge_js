type CancelContext = any;

interface Future<T> extends Promise<T> {

    setTimeout(timeout: Number): Future<T>;

    setCancelToken(cancelToken: CancelToken): Future<T>;
}

interface Handler {

    setOnEvent(onEvent: (payload: any, ack: (res: any, error: any) => void) => CancelContext): Handler;
    
    setOnCancel(onCancel: (cancelContext: CancelContext) => void): Handler;
}

interface CancelToken {
    cancel(): void;
}

export default interface Bridge {

    static of(name: String): Bridge;

    on(method: String): Handler;

    emit(method: String, payload?: any): void;

    deliver<T>(method: String, req: any): Future<T>;
    
}
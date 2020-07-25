
declare class Future<T> extends Promise<T> {
    //set timeout
    setTimeout(timeout: Number): Future<T>;
    //set cancel token
    setCancelToken(cancelToken: CancelToken): Future<T>;
}

declare class Handler {
    // on event, event may be emit or deliver
    // must reply deliver event
    onEvent( onEvent: (payload: any|null, ack: (payload: any|null, error: any|null) => void ) => any ): Handler;
    // on cancel
    onCancel(onCancel: (cancelContext: any|null) => void): Handler;
}

export declare class CancelToken {
    cancel(): void;
}

export declare class Client {

    // get a unique client from current window context
    static of(name: String): Client;

    // get a unique handler from current client
    on(method: String): Handler;

    // emit a message to server
    emit(method: String, payload?: any): void;

    //deliver a message to server
    deliver<T>(method: String, payload: any): Future<T>;
}
type CancelContext = any;

/**
 * future is a custom promise, with additional fuctions named setTimeout and SetCancelToken
 *
 * @interface Future
 * @extends {Promise<T>}
 * @template T
 */
interface Future<T> extends Promise<T> {
    /**
     * set timeout for promise
     *
     * @param {Number} timeout time interval in millseconds, 1000 = 1s
     * @return {*}  {Future<T>}
     * @memberof Future
     */
    setTimeout(timeout: Number): Future<T>;

    /**
     * set cancel token for promise
     *
     * @param {CancelToken} cancelToken e.g. setCancelToken(new CancelToken)
     * @return {*}  {Future<T>}
     * @memberof Future
     */
    setCancelToken(cancelToken: CancelToken): Future<T>;
}

interface Handler {
    
    /**
     *  handle a event message
     *
     * @param {(payload: any, ack: (payload: any, error: any) => void) => CancelContext} event on event
     * @return {*}  {Handler}
     * @memberof Handler
     */
    event(event: (payload: any, ack: (payload: any, error: any) => void) => CancelContext): Handler;
    
    /**
     * handle a cancel message for a event
     *
     * @param {(cancelContext: CancelContext) => void} cancel cancel function, cancelContext is from handler.event
     * @return {*}  {Handler}
     * @memberof Handler
     */
    cancel(cancel: (cancelContext: CancelContext) => void): Handler;
}

interface CancelToken {
    cancel(): void;
}

export class Bridge {

    /**
     *
     *
     * @param {String} name equal name in the global will return consistent bridge
     * @return {*} {Bridge} bridge instance
     */
    static of(name: String): Bridge;

    /**
     *
     *
     * @param {String} method unique method
     * @return {*}  {Handler}
     * @memberof Bridge
     */
    on(method: String): Handler;

    
    /**
     * emit is one-way notification to server, will not receive ack
     *
     * @param {String} method
     * @param {*} [payload]
     * @memberof Bridge
     */
    emit(method: String, payload?: any): void;
    
    /**
     * deliver is a request to server, server will respond
     *
     * @template T
     * @param {String} method
     * @param {*} payload
     * @return {*}  {Future<T>}
     * @memberof Bridge
     */
    deliver<T>(method: String, payload: any): Future<T>;
}
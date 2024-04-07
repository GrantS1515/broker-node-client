import { WebSocket } from "ws";
import { SingleEvent, IndexedEvent, MultipleEventsResponse } from "broker-types";
import { Observable } from "rxjs";
import { Maybe } from "maybe";
export type Client = {
    ws: WebSocket;
    indexedSingleEvent$: Observable<IndexedEvent>;
    multipleEvents$: Observable<MultipleEventsResponse>;
};
interface ClientSender {
    sendSingleEvent(event: SingleEvent): void;
    sendMultipleEventsRequest(): void;
}
export declare class NodeSender implements ClientSender {
    private client;
    constructor(client: Client);
    sendSingleEvent(event: SingleEvent): void;
    sendMultipleEventsRequest(): void;
}
export declare function newClient(port: number): Promise<Maybe<Client>>;
export declare function closeClient(client: Client): Promise<void>;
export {};

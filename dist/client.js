import { WebSocket } from "ws";
import { isSingleEvent, isIndexedEvent, newMultipleEventRequest, isMultipleEventsResponse } from "broker-types";
import { Subject, filter, map } from "rxjs";
import { Maybe } from "maybe";
export class NodeSender {
    client;
    constructor(client) {
        this.client = client;
    }
    sendSingleEvent(event) {
        this.client.ws.send(JSON.stringify(event));
    }
    sendMultipleEventsRequest() {
        this.client.ws.send(JSON.stringify(newMultipleEventRequest()));
    }
}
export async function newClient(port) {
    const msg$ = new Subject();
    const indexedSingleEvent$ = new Subject();
    const multipleEvents$ = new Subject();
    const openPro = (ws) => {
        new Promise(res => {
            ws.on("open", () => res);
        });
    };
    const myPromise = new Promise(res => {
        try {
            const ws = new WebSocket(`ws://localhost:${port}`);
            ws.on("message", (msg) => {
                msg$.next({ ws: ws, message: JSON.parse(msg) });
            });
            msg$.pipe(filter((e) => isIndexedEvent(e.message)), map((e) => e.message), filter((e) => isSingleEvent(e.event))).subscribe((e) => indexedSingleEvent$.next(e));
            msg$.pipe(filter((e) => isMultipleEventsResponse(e.message)), map((e) => e.message)).subscribe((e) => multipleEvents$.next(e));
            ws.on("open", () => {
                res(Maybe({ ws: ws,
                    indexedSingleEvent$: indexedSingleEvent$,
                    multipleEvents$: multipleEvents$ }));
            });
        }
        catch {
            res(Maybe(undefined));
        }
    });
    return myPromise;
}
export function closeClient(client) {
    const closePro = new Promise(res => {
        client.ws.on("close", () => res());
        client.ws.close();
    });
    return closePro;
}

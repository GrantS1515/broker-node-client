import { WebSocket } from "ws";
import { SingleEvent, isSingleEvent, IndexedEvent, 
	isIndexedEvent, MultipleEventsResponse, newMultipleEventsResponse,
	newMultipleEventRequest, isMultipleEventsResponse 
} from "broker-types/broker-types.js"
import { Observable, Subject, filter, map, tap } from "rxjs"
import { Maybe } from "maybe/src/maybe.js";

export type Client = {
	ws: WebSocket,
	indexedSingleEvent$: Observable<IndexedEvent>,
	multipleEvents$: Observable<MultipleEventsResponse>
}

interface ClientSender {
	sendSingleEvent(event: SingleEvent): void,
	sendMultipleEventsRequest(): void,
}

export class NodeClient implements ClientSender {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}
	sendSingleEvent(event: SingleEvent) {
		this.client.ws.send(JSON.stringify(event))
	}

	sendMultipleEventsRequest(): void {
		this.client.ws.send(JSON.stringify(newMultipleEventRequest()))
	}
}

type ClientEvent = {
	ws: WebSocket,
	message: object,
}

export async function newClient(port: number): Promise<Maybe<Client>> {
	const msg$: Subject<ClientEvent> = new Subject();
	const indexedSingleEvent$: Subject<IndexedEvent> = new Subject();
	const multipleEvents$: Subject<MultipleEventsResponse> = new Subject();

	const openPro = (ws: WebSocket) => {
		new Promise(res => {
			ws.on("open", () => res);
		})
	}

	const myPromise: Promise<Maybe<Client>> = new Promise(res => {
		try {
			const ws = new WebSocket(`ws://localhost:${port}`);
			ws.on("message", (msg: string) => {
				msg$.next({ ws: ws, message: JSON.parse(msg) })
			});
			msg$.pipe(
				filter((e: ClientEvent) => isIndexedEvent(e.message)),
				map((e: ClientEvent) => e.message), 
				filter((e: IndexedEvent) => isSingleEvent(e.event)),
			).subscribe(
				(e: IndexedEvent) => indexedSingleEvent$.next(e)
			);

			msg$.pipe(
				filter((e: ClientEvent) => isMultipleEventsResponse(e.message)),
				map((e: ClientEvent) => e.message),
			).subscribe(
				(e: MultipleEventsResponse) => multipleEvents$.next(e)
			);

			ws.on("open", () => {
				res(Maybe<Client>(
					{ ws: ws, 
					indexedSingleEvent$: indexedSingleEvent$,
					multipleEvents$: multipleEvents$ }))
			})
		} catch {
			res(Maybe<Client>(undefined))
		}
	})

	return myPromise
}

export function closeClient(client: Client): Promise<void> {
	const closePro: Promise<void> = new Promise(res => {
		client.ws.on("close", () => res())
		client.ws.close();
	})

	return closePro
}
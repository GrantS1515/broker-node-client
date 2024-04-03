// make a client that connects with a broker that allows us to send
// a message to a broker

// decode a message into a single or other message
import { expect } from "chai";
import { WebSocketServer, WebSocket } from "ws";
import { map, tap } from "rxjs"
import { MaybeType } from "maybe/src/maybe.js";
import { newSingleEvent, IndexedEvent, SingleEvent, 
newMultipleEventRequest, isMultipleEventsResponse, isMultipleEventsRequest,
newMultipleEventsResponse, MultipleEventsResponse
} from "broker-types/broker-types.js";
import { Client, newClient, closeClient, NodeSender} from "./client.js";


describe("send single messages to a broker", () => {
	let wss: WebSocketServer;
	let client: Client;

	beforeEach(async () => {

		// create the wss
		const wssStart: Promise<WebSocketServer> = new Promise(res => {
			wss = new WebSocketServer({ port: 8081 })
			wss.on("listening", () => {
				res(wss)
			})
		})

		wss = await wssStart;

		wss.on("connection", (ws: WebSocket) => {
			ws.on("message", (msg: string) => {
				wss.clients.forEach((client: WebSocket) => {
					const se: SingleEvent = JSON.parse(msg);
					const ie: IndexedEvent = { index: 0, event: se };
					client.send(JSON.stringify(ie));
				})
			})
		})

		// create the client
		const maybeClient = await newClient(8081);
		switch (maybeClient.type) {
			case MaybeType.Just:
				client = maybeClient.value;
				break;
			case MaybeType.Nothing:
				expect.fail("Unable to create a client");
				break;
		}
	})

	afterEach(async () => {
		await closeClient(client);

		const wssClose: Promise<void> = new Promise(res => {
			wss.close(() => res())
		})

	})

	it("can have a client send to a broker", async () => {
		const startEvent = newSingleEvent({ name: "hello" })
		const goalEvent = { index: 0, event: startEvent };
		const myClient = new NodeSender(client);

		const gotEvent: Promise<IndexedEvent> = new Promise(res => {
			client.indexedSingleEvent$.subscribe((e: IndexedEvent) => res(e));
			myClient.sendSingleEvent(startEvent);
		})

		const recievedEvent = await gotEvent;
		expect(recievedEvent).to.deep.equal(goalEvent)
	})
})

describe("send request for multiple events", () => {
	let wss: WebSocketServer;
	let client: Client;

	beforeEach(async () => {

		// create the wss
		const wssStart: Promise<WebSocketServer> = new Promise(res => {
			wss = new WebSocketServer({ port: 8081 })
			wss.on("listening", () => {
				res(wss)
			})
		})

		wss = await wssStart;

		wss.on("connection", (ws: WebSocket) => {
			ws.on("message", (msg: string) => {
				if (isMultipleEventsRequest(JSON.parse(msg))) {
					const e1 = { index: 0, event: newSingleEvent({ name: "hello" }) };
					const e2 = { index: 1, event: newSingleEvent({ name: "world" }) };
					ws.send(JSON.stringify(newMultipleEventsResponse([e1, e2])))
				}
			})
		})

		// create the client
		const maybeClient = await newClient(8081);
		switch (maybeClient.type) {
			case MaybeType.Just:
				client = maybeClient.value;
				break;
			case MaybeType.Nothing:
				expect.fail("Unable to create a client");
				break;
		}
	})

	afterEach(async () => {
		await closeClient(client);

		const wssClose: Promise<void> = new Promise(res => {
			wss.close(() => res())
		})

	})
	it("request multiple events", async () => {
		const myClient = new NodeSender(client);

		const gotEvent: Promise<IndexedEvent[]> = new Promise(res => {
			client.multipleEvents$.pipe(
				map((e: MultipleEventsResponse) => e.events),
			).subscribe((es: IndexedEvent[]) => res(es));
			myClient.sendMultipleEventsRequest();
		})

		const recievedEvents = await gotEvent;

		const e1 = { index: 0, event: newSingleEvent({ name: "hello" }) };
		const e2 = { index: 1, event: newSingleEvent({ name: "world" }) };
		expect(recievedEvents).to.deep.equal([e1, e2])


	})
})
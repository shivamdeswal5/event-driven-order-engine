# Real-Time Event Streaming with WebSockets and NestJS

This document serves as a complete, beginner-to-pro guide explaining how real-time event streaming works in our architecture, covering the core principles of WebSockets, Socket.io, namespaces, rooms, subscription flows, security, and integration with RabbitMQ.

---

## 1. What Are WebSockets? (WebSockets vs. HTTP vs. SSE)

To understand WebSockets, we first need to look at how clients and servers traditionally communicate.

### Traditional HTTP: Polling
In standard HTTP (REST APIs), communication is **unidirectional**. The client sends a request, and the server sends a response. The server cannot initiate communication on its own.
* **Short Polling**: The client repeatedly asks the server every few seconds: *"Is there any new notification?"* This is highly inefficient, wastes bandwidth, and puts massive load on the database.
* **Long Polling**: The client sends a request. The server holds the request open until new data is available, then responds. Once the client receives the response, it immediately opens a new request. While better than short polling, it still carries significant connection overhead.

### Server-Sent Events (SSE)
SSE is a **unidirectional** real-time push mechanism. The client establishes a persistent HTTP connection using the standard `EventSource` API, and the server streams events to the client.
* **Pros**: Simple, built-in browser support, automatic reconnection.
* **Cons**: Unidirectional (server-to-client only), runs over HTTP (subject to maximum browser connection limits per domain, typically 6 concurrent connections).

### WebSockets (WS / WSS)
WebSockets provide a **bidirectional, full-duplex persistent TCP connection** between the client and the server over a single connection.
* Once the connection is established (via a handshake), both client and server can send messages to each other at any time with extremely low overhead.
* It operates on ports `80` (ws) or `443` (wss).

```
Traditional HTTP Request/Response:
Client  ============> Request ============>  Server
Client  <============ Response <===========  Server

WebSocket Persistent Connection:
Client  --- [1. Upgrade HTTP Handshake] --->  Server
Client  <== [2. Persistent TCP Connection] => Server
Client  <======== [3. Bidirectional Push] => Server
```

---

## 2. Why Socket.io?

While the native HTML5 WebSocket API is powerful, it is low-level and lacks critical features required for production systems. **Socket.io** is a library built on top of WebSockets that provides:
1. **Engine.io Handshake**: It starts with HTTP Long-Polling first, then seamlessly upgrades to WebSockets to bypass restrictive firewalls/proxies.
2. **Auto-Reconnection**: Automatically attempts to reconnect if the network drops.
3. **Namespaces and Rooms**: Virtual grouping mechanisms to manage connections without writing complex stateful routing logic (explained below).
4. **Packet Buffering**: Buffers packets when the client is temporarily disconnected and flushes them once reconnected.

---

## 3. Namespaces & Rooms

Socket.io provides two core mechanisms for structuring and multiplexing connections: **Namespaces** and **Rooms**.

### Namespaces
A Namespace is a **virtual multiplexed communication channel**. It allows you to split the logic of your application over a single shared connection.
* **Default Namespace**: `/`
* **Custom Namespace**: `/notifications`, `/chat`, `/admin`
* *Think of namespaces as different API base paths (e.g., `/api/v1` vs `/api/admin`).* A client connecting to `/notifications` only receives messages emitted in that namespace.

### Rooms
A Room is a **virtual channel that sockets can join and leave**. Sockets in the same room can broadcast messages to each other.
* Rooms are **entirely in-memory** and managed dynamically by Socket.io.
* A socket connection can be in multiple rooms at the same time.
* **Crucial Rule**: The server can put sockets into rooms, but the client cannot directly join a room. The client must ask the server to join them (via a subscription message).

```
               Namespace: /notifications
             ┌─────────────────────────┐
             │                         │
             │   Room: order:123       │
             │  ┌───────────────────┐  │
             │  │ 👤 Client A (web) │  │
             │  │ 👤 Client B (iOS) │  │
             │  └───────────────────┘  │
             │                         │
             │   Room: order:456       │
             │  ┌───────────────────┐  │
             │  │ 👤 Client C       │  │
             │  └───────────────────┘  │
             └─────────────────────────┘
```

---

## 4. Subscription Flow: Step-by-Step

In our order engine, we want users to receive notifications *only* for the orders they place. We implement a **Room-Based Subscription Flow**:

1. **Establish Connection**:
   The frontend connects to the `/notifications` namespace:
   ```javascript
   const socket = io("http://localhost:8080/notifications");
   ```
2. **Request Subscription**:
   Once the client places an order and obtains an `orderId`, it sends a subscription message:
   ```javascript
   socket.emit("subscribeToOrder", { orderId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" });
   ```
3. **Server Joins Room**:
   The NestJS WebSocket Gateway receives the message, validates the `orderId`, and calls:
   ```typescript
   client.join(`order:${orderId}`);
   ```
4. **Push Events**:
   When the database updates (via RabbitMQ consumer):
   ```typescript
   this.server.to(`order:${orderId}`).emit("notification", {
     eventType: "PaymentCompletedEvent",
     message: "Payment processed successfully!"
   });
   ```

---

## 5. NestJS WebSocket Decorators

NestJS makes implementing WebSockets simple via `@nestjs/websockets`. Here are the primary decorators we use:

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@WebSocketGateway()` | Declares a gateway class (similar to a Controller). | `@WebSocketGateway({ namespace: '/notifications' })` |
| `@WebSocketServer()` | Injects the raw Socket.io `Server` instance into the gateway. | `@WebSocketServer() server: Server;` |
| `@SubscribeMessage()` | Binds an incoming message event name to a handler method. | `@SubscribeMessage('subscribeToOrder')` |
| `@ConnectedSocket()` | Injects the active client connection `Socket` instance. | `handle(@ConnectedSocket() client: Socket)` |
| `@MessageBody()` | Injects the parsed request payload from the client. | `handle(@MessageBody() data: any)` |

---

## 6. How RabbitMQ Integrates with WebSockets

A common mistake is trying to connect RabbitMQ directly to the frontend. Web browsers cannot speak AMQP (RabbitMQ's protocol) natively. Instead, the backend act as the bridge:

```
[ RabbitMQ Broker ]
        │ (AMQP Event: PaymentCompletedEvent)
        ▼
[ Notification CLI Consumer ]
        │ (1. Saves to DB, then calls WebSocket Gateway)
        ▼
[ Notification Gateway ] 
        │ (2. Resolves Room "order:123")
        ▼
   [ socket.io ] ── (3. WebSockets Push) ──► [ Browser Frontend ]
```

### Flow Breakdown:
1. The **CLI Consumer** receives `PaymentCompletedEvent` from `notification-queue`.
2. The consumer processes the message inside a database transaction, ensuring idempotency via the Inbox pattern.
3. If database transaction succeeds, the consumer calls `gateway.broadcastToOrder(orderId, eventType, message)`.
4. The gateway runs `server.to('order:' + orderId).emit('notification', ...)` pushing the frame immediately to the browser.

---

## 7. Security and Authentication (Token-based Handshake)

In a production environment, we cannot allow anonymous sockets to subscribe to arbitrary order rooms. We secure our WebSocket Gateway using the following best practices:

1. **Handshake Authentication**:
   The client must send their JWT authorization token in the connection handshake parameters:
   ```javascript
   const socket = io("http://localhost:8080/notifications", {
     auth: {
       token: "Bearer eyJhbGciOi..."
     }
   });
   ```
2. **Connection Guard**:
   In the gateway's `handleConnection` hook:
   - Extract the token from `client.handshake.auth.token`.
   - Validate the token using the authentication service.
   - If invalid, reject the connection immediately: `client.disconnect(true)`.
   - Attach the authenticated user's ID/details to the socket object: `client.data.userId = payload.sub`.
3. **Subscription Validation**:
   When joining `subscribeToOrder`, verify that `client.data.userId` owns the order before running `client.join(...)`.

import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { RequestContext } from '@mikro-orm/core';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../modules/app.module';
import { AllExceptionsFilter } from '../modules/shared/src/infrastructure/http/exceptions/all-exception-filter';

// Repositories
import { OrderRepository } from '../modules/order/src/infrastructure/repository/order.repository';
import { PaymentRepository } from '../modules/payment/src/infrastructure/repository/payment.repository';
import { InventoryReservationRepository } from '../modules/inventory/src/infrastructure/repository/inventory-reservation.repository';

// Entities & Enums
import { Payment } from '../modules/payment/src/domain/payment/payment.entity';
import { PaymentStatus } from '../modules/payment/src/domain/payment/enum/payment-status.enum';
import { InventoryReservation } from '../modules/inventory/src/domain/reservation/inventory-reservation.entity';
import { ReservationStatus } from '../modules/inventory/src/domain/reservation/enum/reservation-status.enum';

// Processors
import { PaymentCompletedProcessor as ShippingPaymentCompletedProcessor } from '../modules/shipping/src/infrastructure/processors/payment-completed/payment-completed.processor';
import { PaymentCompletedProcessorModule as ShippingPaymentCompletedProcessorModule } from '../modules/shipping/src/infrastructure/processors/payment-completed/payment-completed.module';

import { OrderCancelledProcessor as ShippingOrderCancelledProcessor } from '../modules/shipping/src/infrastructure/processors/order-cancelled/order-cancelled.processor';
import { OrderCancelledProcessorModule as ShippingOrderCancelledProcessorModule } from '../modules/shipping/src/infrastructure/processors/order-cancelled/order-cancelled.module';

import { OrderPlacedProcessor } from '../modules/notification/src/infrastructure/processors/order-placed/order-placed.processor';
import { OrderPlacedProcessorModule } from '../modules/notification/src/infrastructure/processors/order-placed/order-placed.module';

// New Processors - Order Module
import { InventoryReservationFailedProcessor } from '../modules/order/src/infrastructure/processors/inventory-reservation-failed/inventory-reservation-failed.processor';
import { InventoryReservationFailedProcessorModule } from '../modules/order/src/infrastructure/processors/inventory-reservation-failed/inventory-reservation-failed.module';

import { PaymentFailedProcessor } from '../modules/order/src/infrastructure/processors/payment-failed/payment-failed.processor';
import { PaymentFailedProcessorModule } from '../modules/order/src/infrastructure/processors/payment-failed/payment-failed.module';

import { PaymentCompletedProcessor as OrderPaymentCompletedProcessor } from '../modules/order/src/infrastructure/processors/payment-completed/payment-completed.processor';
import { PaymentCompletedProcessorModule as OrderPaymentCompletedProcessorModule } from '../modules/order/src/infrastructure/processors/payment-completed/payment-completed.module';

import { ShipmentCreatedProcessor as OrderShipmentCreatedProcessor } from '../modules/order/src/infrastructure/processors/shipment-created/shipment-created.processor';
import { ShipmentCreatedProcessorModule as OrderShipmentCreatedProcessorModule } from '../modules/order/src/infrastructure/processors/shipment-created/shipment-created.module';

import { ShipmentDeliveredProcessor as OrderShipmentDeliveredProcessor } from '../modules/order/src/infrastructure/processors/shipment-delivered/shipment-delivered.processor';
import { ShipmentDeliveredProcessorModule as OrderShipmentDeliveredProcessorModule } from '../modules/order/src/infrastructure/processors/shipment-delivered/shipment-delivered.module';

// New Processors - Payment Module
import { OrderCancelledProcessor as PaymentOrderCancelledProcessor } from '../modules/payment/src/infrastructure/processors/order-cancelled/order-cancelled.processor';
import { OrderCancelledProcessorModule as PaymentOrderCancelledProcessorModule } from '../modules/payment/src/infrastructure/processors/order-cancelled/order-cancelled.module';

// New Processors - Inventory Module (Order Cancelled)
import { OrderCancelledProcessor as InventoryOrderCancelledProcessor } from '../modules/inventory/src/infrastructure/processors/order-cancelled/order-cancelled.processor';
import { OrderCancelledProcessorModule as InventoryOrderCancelledProcessorModule } from '../modules/inventory/src/infrastructure/processors/order-cancelled/order-cancelled.module';

import { io, Socket } from 'socket.io-client';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let shippingPaymentCompletedProcessor: ShippingPaymentCompletedProcessor;
  let shippingOrderCancelledProcessor: ShippingOrderCancelledProcessor;
  let orderPlacedProcessor: OrderPlacedProcessor;

  // New dependencies
  let orderRepository: OrderRepository;
  let paymentRepository: PaymentRepository;
  let inventoryReservationRepository: InventoryReservationRepository;

  let orderPaymentCompletedProcessor: OrderPaymentCompletedProcessor;
  let orderPaymentFailedProcessor: PaymentFailedProcessor;
  let orderInventoryReservationFailedProcessor: InventoryReservationFailedProcessor;
  let orderShipmentCreatedProcessor: OrderShipmentCreatedProcessor;
  let orderShipmentDeliveredProcessor: OrderShipmentDeliveredProcessor;

  let paymentOrderCancelledProcessor: PaymentOrderCancelledProcessor;
  let inventoryOrderCancelledProcessor: InventoryOrderCancelledProcessor;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ShippingPaymentCompletedProcessorModule,
        ShippingOrderCancelledProcessorModule,
        OrderPlacedProcessorModule,
        InventoryReservationFailedProcessorModule,
        PaymentFailedProcessorModule,
        OrderPaymentCompletedProcessorModule,
        OrderShipmentCreatedProcessorModule,
        OrderShipmentDeliveredProcessorModule,
        PaymentOrderCancelledProcessorModule,
        InventoryOrderCancelledProcessorModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
    await app.listen(0);

    shippingPaymentCompletedProcessor = app.get(
      ShippingPaymentCompletedProcessor,
    );
    shippingOrderCancelledProcessor = app.get(ShippingOrderCancelledProcessor);
    orderPlacedProcessor = app.get(OrderPlacedProcessor);

    orderRepository = app.get(OrderRepository);
    paymentRepository = app.get(PaymentRepository);
    inventoryReservationRepository = app.get(InventoryReservationRepository);

    orderPaymentCompletedProcessor = app.get(OrderPaymentCompletedProcessor);
    orderPaymentFailedProcessor = app.get(PaymentFailedProcessor);

    orderInventoryReservationFailedProcessor = app.get(
      InventoryReservationFailedProcessor,
    );
    orderShipmentCreatedProcessor = app.get(OrderShipmentCreatedProcessor);
    orderShipmentDeliveredProcessor = app.get(OrderShipmentDeliveredProcessor);
    paymentOrderCancelledProcessor = app.get(PaymentOrderCancelledProcessor);
    inventoryOrderCancelledProcessor = app.get(
      InventoryOrderCancelledProcessor,
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/orders (GET)', () => {
    return request(app.getHttpServer()).get('/api/orders').expect(200);
  });

  it('/shipments (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/shipments')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('total');
      });
  });

  it('/shipments/:orderId (GET) - not found', () => {
    const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';
    return request(app.getHttpServer())
      .get(`/api/shipments/${nonExistentOrderId}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.type).toBe(
          'https://api.order-engine.com/errors/shipment-not-found',
        );
        expect(res.body.title).toBe('Shipment Not Found');
        expect(res.body.status).toBe(404);
      });
  });

  it('/shipments/:orderId/ship (POST) - not found', () => {
    const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';
    return request(app.getHttpServer())
      .post(`/api/shipments/${nonExistentOrderId}/ship`)
      .send({ carrier: 'UPS', trackingNumber: '1Z999AA10123456784' })
      .expect(404)
      .expect((res) => {
        expect(res.body.type).toBe(
          'https://api.order-engine.com/errors/shipment-not-found',
        );
        expect(res.body.title).toBe('Shipment Not Found');
      });
  });

  it('/shipments/:orderId/deliver (POST) - not found', () => {
    const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';
    return request(app.getHttpServer())
      .post(`/api/shipments/${nonExistentOrderId}/deliver`)
      .expect(404)
      .expect((res) => {
        expect(res.body.type).toBe(
          'https://api.order-engine.com/errors/shipment-not-found',
        );
        expect(res.body.title).toBe('Shipment Not Found');
      });
  });

  it('should process happy path: payment completed -> get pending -> ship -> deliver', async () => {
    const orderId = randomUUID();
    const messageId = randomUUID();

    // 1. Simulate PaymentCompletedEvent triggering shipment creation
    await shippingPaymentCompletedProcessor.handle({
      messageId,
      body: { payload: { orderId } },
    });

    // 2. Retrieve shipment and verify status is PENDING
    let res = await request(app.getHttpServer())
      .get(`/api/shipments/${orderId}`)
      .expect(200);
    expect(res.body.orderId).toBe(orderId);
    expect(res.body.status).toBe('PENDING');

    // 3. Mark shipment as SHIPPED
    res = await request(app.getHttpServer())
      .post(`/api/shipments/${orderId}/ship`)
      .send({ carrier: 'FedEx', trackingNumber: '123456789012' })
      .expect(200);
    expect(res.body.message).toBe('Shipment marked as SHIPPED successfully.');

    // 4. Retrieve and verify tracking info and status is SHIPPED
    res = await request(app.getHttpServer())
      .get(`/api/shipments/${orderId}`)
      .expect(200);
    expect(res.body.status).toBe('SHIPPED');
    expect(res.body.carrier).toBe('FedEx');
    expect(res.body.trackingNumber).toBe('123456789012');

    // 5. Deliver the shipment
    res = await request(app.getHttpServer())
      .post(`/api/shipments/${orderId}/deliver`)
      .expect(200);
    expect(res.body.message).toBe('Shipment marked as DELIVERED successfully.');

    // 6. Retrieve and verify status is DELIVERED
    res = await request(app.getHttpServer())
      .get(`/api/shipments/${orderId}`)
      .expect(200);
    expect(res.body.status).toBe('DELIVERED');
  });

  it('should process compensation flow: payment completed -> order cancelled -> check cancelled -> reject shipping', async () => {
    const orderId = randomUUID();
    const paymentMsgId = randomUUID();
    const cancelMsgId = randomUUID();

    // 1. Simulate PaymentCompletedEvent triggering shipment creation
    await shippingPaymentCompletedProcessor.handle({
      messageId: paymentMsgId,
      body: { payload: { orderId } },
    });

    // 2. Simulate OrderCancelledEvent triggering compensation saga (cancellation)
    await shippingOrderCancelledProcessor.handle({
      messageId: cancelMsgId,
      body: { payload: { orderId } },
    });

    // 3. Retrieve shipment and verify status is CANCELLED
    let res = await request(app.getHttpServer())
      .get(`/api/shipments/${orderId}`)
      .expect(200);
    expect(res.body.status).toBe('CANCELLED');

    // 4. Try to ship a CANCELLED shipment and expect 409 Conflict
    res = await request(app.getHttpServer())
      .post(`/api/shipments/${orderId}/ship`)
      .send({ carrier: 'DHL', trackingNumber: '9876543210' })
      .expect(409);
    expect(res.body.type).toBe(
      'https://api.order-engine.com/errors/invalid-shipment-state',
    );
    expect(res.body.title).toBe('Invalid Shipment State');
  });

  describe('Notification Gateway & History (e2e)', () => {
    it('should receive real-time notifications via WebSocket and persist them in history', async () => {
      const orderId = randomUUID();
      const messageId = randomUUID();
      const url = await app.getUrl();

      // Connect to WebSocket gateway
      const socket: Socket = io(`${url}/notifications`, {
        transports: ['websocket'],
        forceNew: true,
      });

      // Wait for socket to connect
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err) => reject(err));
      });

      // Subscribe to order room
      socket.emit('subscribeToOrder', { orderId });

      // Prepare promise to receive real-time event
      const notificationPromise = new Promise<any>((resolve) => {
        socket.on('notification', (data) => {
          resolve(data);
        });
      });

      // Trigger order placed processor event
      await orderPlacedProcessor.handle({
        messageId,
        body: { payload: { orderId } },
      });

      // Wait for websocket notification to be received
      const wsData = await notificationPromise;
      expect(wsData.orderId).toBe(orderId);
      expect(wsData.eventType).toBe('OrderPlacedEvent');
      expect(wsData.message).toContain('successfully placed');

      // Cleanup socket
      socket.disconnect();

      // Retrieve notification history via API
      const res = await request(app.getHttpServer())
        .get(`/api/notifications?orderId=${orderId}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].orderId).toBe(orderId);
      expect(res.body.items[0].eventType).toBe('OrderPlacedEvent');
      expect(res.body.items[0].message).toContain('successfully placed');
    });
  });

  describe('Saga & Compensation Choreography (e2e)', () => {
    it('should process happy path saga: place order -> pay order -> ship order -> deliver order', async () => {
      const customerId = randomUUID();
      const productId = randomUUID();

      // 1. Place the order
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          customerId,
          items: [{ productId, quantity: 2, price: 49.99 }],
        })
        .expect(201);

      // 2. Fetch the created order via HTTP list API to get orderId
      const listRes = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);
      const order = listRes.body.items.find(
        (item: any) => item.customerId === customerId,
      );
      expect(order).toBeDefined();
      expect(order.status).toBe('PLACED');
      const orderId = order.id;

      // 3. Simulate PaymentCompletedEvent received by Order module
      await orderPaymentCompletedProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId } },
      });

      // Verify order transitions to PAID via HTTP GET API
      let orderRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200);
      expect(orderRes.body.status).toBe('PAID');

      // 4. Simulate ShipmentCreatedEvent received by Order module
      await orderShipmentCreatedProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId } },
      });

      // Verify order transitions to SHIPPED
      orderRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200);
      expect(orderRes.body.status).toBe('SHIPPED');

      // 5. Simulate ShipmentDeliveredEvent received by Order module
      await orderShipmentDeliveredProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId } },
      });

      // Verify order transitions to DELIVERED
      orderRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200);
      expect(orderRes.body.status).toBe('DELIVERED');
    });

    it('should process payment failure saga: place order -> payment failed -> order cancelled -> inventory reservation released', async () => {
      const customerId = randomUUID();
      const productId = randomUUID();

      // 1. Place the order
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          customerId,
          items: [{ productId, quantity: 1, price: 99.99 }],
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);
      const order = listRes.body.items.find(
        (item: any) => item.customerId === customerId,
      );
      const orderId = order.id;

      // 2. Seed a mock inventory reservation to simulate successful stock lock
      const reservation = new InventoryReservation();
      reservation.orderId = orderId;
      reservation.productId = productId;
      reservation.quantity = 1;
      reservation.status = ReservationStatus.RESERVED;

      let reservations: any[] = [];
      await RequestContext.create(
        inventoryReservationRepository['em'],
        async () => {
          await inventoryReservationRepository.save(reservation);
          reservations =
            await inventoryReservationRepository.findByOrderId(orderId);
        },
      );

      // Verify reservation is active
      expect(reservations.length).toBe(1);
      expect(reservations[0].status).toBe(ReservationStatus.RESERVED);

      // 3. Simulate PaymentFailedEvent received by Order module
      await orderPaymentFailedProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId, reason: 'Insufficient funds' } },
      });

      // Verify order is CANCELLED via HTTP GET API
      const orderRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200);
      expect(orderRes.body.status).toBe('CANCELLED');

      // 4. Simulate OrderCancelledEvent received by Inventory module to trigger compensation
      await inventoryOrderCancelledProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId, cancelReason: 'Payment failed' } },
      });

      // Verify reservation is RELEASED
      await RequestContext.create(
        inventoryReservationRepository['em'],
        async () => {
          reservations =
            await inventoryReservationRepository.findByOrderId(orderId);
        },
      );
      expect(reservations.length).toBe(1);
      expect(reservations[0].status).toBe(ReservationStatus.RELEASED);
    });

    it('should process manual cancellation compensation: place order -> complete payment & shipment -> cancel order -> refund payment & cancel shipment', async () => {
      const customerId = randomUUID();
      const productId = randomUUID();

      // 1. Place the order
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          customerId,
          items: [{ productId, quantity: 1, price: 50.0 }],
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);
      const order = listRes.body.items.find(
        (item: any) => item.customerId === customerId,
      );
      const orderId = order.id;

      // 2. Setup completed payment and pending shipment
      const payment = new Payment();
      payment.orderId = orderId;
      payment.amount = 50.0;
      payment.status = PaymentStatus.COMPLETED;

      let initialPayment: any = null;
      await RequestContext.create(paymentRepository['em'], async () => {
        await paymentRepository.save(payment);
        initialPayment = await paymentRepository.findByOrderId(orderId);
      });

      // Create shipment using shipping module payment completed processor
      await shippingPaymentCompletedProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId } },
      });

      // Verify initial setup states
      expect(initialPayment!.status).toBe(PaymentStatus.COMPLETED);

      let shipmentRes = await request(app.getHttpServer())
        .get(`/api/shipments/${orderId}`)
        .expect(200);
      expect(shipmentRes.body.status).toBe('PENDING');

      // 3. Manually cancel the order via API
      await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/cancel`)
        .send({ reason: 'Customer changed mind' })
        .expect(201);

      // Verify order is CANCELLED via HTTP GET API
      const orderRes = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200);
      expect(orderRes.body.status).toBe('CANCELLED');

      // 4. Simulate OrderCancelledEvent reaching Payment module to trigger refund
      await paymentOrderCancelledProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId, cancelReason: 'Customer changed mind' } },
      });

      // Verify payment is REFUNDED
      let updatedPayment: any = null;
      await RequestContext.create(paymentRepository['em'], async () => {
        updatedPayment = await paymentRepository.findByOrderId(orderId);
      });
      expect(updatedPayment!.status).toBe(PaymentStatus.REFUNDED);

      // 5. Simulate OrderCancelledEvent reaching Shipping module to cancel shipment
      await shippingOrderCancelledProcessor.handle({
        messageId: randomUUID(),
        body: { payload: { orderId, cancelReason: 'Customer changed mind' } },
      });

      // Verify shipment is CANCELLED
      shipmentRes = await request(app.getHttpServer())
        .get(`/api/shipments/${orderId}`)
        .expect(200);
      expect(shipmentRes.body.status).toBe('CANCELLED');
    });
  });
});

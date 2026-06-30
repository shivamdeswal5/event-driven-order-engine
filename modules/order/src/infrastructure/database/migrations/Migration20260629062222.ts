import { Migration } from '@mikro-orm/migrations';

export class Migration20260629062222 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create schema if not exists "order_schema";`);
    this.addSql(
      `create table "order_schema"."inbox_messages" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "message_id" uuid not null, "handler_name" varchar(255) not null, "event_type" varchar(255) not null, constraint "inbox_messages_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "order_schema"."inbox_messages" add constraint "uq_inbox_message_handler" unique ("message_id", "handler_name");`,
    );

    this.addSql(
      `create table "order_schema"."orders" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "customer_id" uuid not null, "total_price" numeric(10,0) not null, "status" integer not null default 0, "cancel_reason" varchar(255) null, constraint "orders_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "order_schema"."outbox_messages" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "event_type" varchar(255) not null, "payload" jsonb not null, "exchange" varchar(255) not null, "routing_key" varchar(255) not null, "correlation_id" varchar(255) not null, "causation_id" varchar(255) null, "processed" boolean not null default false, "processed_at" timestamptz null, constraint "outbox_messages_pkey" primary key ("id"));`,
    );

    this.addSql(`drop table if exists "undefined"."inbox_messages" cascade;`);

    this.addSql(`drop table if exists "inbox_messages" cascade;`);

    this.addSql(`drop table if exists "shared_schema"."migrations" cascade;`);

    this.addSql(`drop table if exists "mikro_orm_migrations" cascade;`);

    this.addSql(`drop table if exists "undefined"."orders" cascade;`);

    this.addSql(`drop table if exists "undefined"."outbox_messages" cascade;`);

    this.addSql(`drop table if exists "outbox_messages" cascade;`);

    this.addSql(`drop schema if exists "undefined";`);
    this.addSql(`drop schema if exists "shared_schema";`);
  }

  override async down(): Promise<void> {
    this.addSql(`create schema if not exists "undefined";`);
    this.addSql(`create schema if not exists "shared_schema";`);
    this.addSql(
      `create table "undefined"."inbox_messages" ("id" uuid not null, "message_id" uuid not null, "handler_name" varchar(255) not null, "event_type" varchar(255) not null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now(), constraint "inbox_messages_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "undefined"."inbox_messages" add constraint "uq_inbox_message_handler" unique ("message_id", "handler_name");`,
    );

    this.addSql(
      `create table "inbox_messages" ("id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "message_id" uuid not null, "handler_name" varchar(255) not null, "event_type" varchar(255) not null, constraint "inbox_messages_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "inbox_messages" add constraint "uq_inbox_message_handler" unique ("message_id", "handler_name");`,
    );

    this.addSql(
      `create table "shared_schema"."migrations" ("id" serial primary key, "name" varchar(255) null, "executed_at" timestamptz(6) null default CURRENT_TIMESTAMP);`,
    );

    this.addSql(
      `create table "mikro_orm_migrations" ("id" serial primary key, "name" varchar(255) null, "executed_at" timestamptz(6) null default CURRENT_TIMESTAMP);`,
    );

    this.addSql(
      `create table "undefined"."orders" ("id" uuid not null, "customer_id" uuid not null, "total_price" numeric(10,2) not null, "status" varchar(255) not null default 'PENDING', "cancel_reason" varchar(255) null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now(), constraint "orders_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "undefined"."outbox_messages" ("id" uuid not null, "event_type" varchar(255) not null, "payload" json not null, "exchange" varchar(255) not null, "routing_key" varchar(255) not null, "correlation_id" varchar(255) not null, "causation_id" varchar(255) null, "processed" bool not null default false, "processed_at" timestamp(6) null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now(), constraint "outbox_messages_pkey" primary key ("id"));`,
    );

    this.addSql(
      `create table "outbox_messages" ("id" uuid not null, "created_at" timestamptz(6) not null, "updated_at" timestamptz(6) not null, "event_type" varchar(255) not null, "payload" jsonb not null, "exchange" varchar(255) not null, "routing_key" varchar(255) not null, "correlation_id" varchar(255) not null, "causation_id" varchar(255) null, "processed" bool not null default false, "processed_at" timestamptz(6) null, constraint "outbox_messages_pkey" primary key ("id"));`,
    );

    this.addSql(
      `drop table if exists "order_schema"."inbox_messages" cascade;`,
    );

    this.addSql(`drop table if exists "order_schema"."orders" cascade;`);

    this.addSql(
      `drop table if exists "order_schema"."outbox_messages" cascade;`,
    );

    this.addSql(`drop schema if exists "order_schema";`);
  }
}

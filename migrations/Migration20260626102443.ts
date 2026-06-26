import { Migration } from '@mikro-orm/migrations';

export class Migration20260626102443 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "inbox_messages" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "message_id" uuid not null, "handler_name" varchar(255) not null, "event_type" varchar(255) not null, constraint "inbox_messages_pkey" primary key ("id"));`);
    this.addSql(`alter table "inbox_messages" add constraint "uq_inbox_message_handler" unique ("message_id", "handler_name");`);

    this.addSql(`create table "outbox_messages" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "event_type" varchar(255) not null, "payload" jsonb not null, "exchange" varchar(255) not null, "routing_key" varchar(255) not null, "correlation_id" varchar(255) not null, "causation_id" varchar(255) null, "processed" boolean not null default false, "processed_at" timestamptz null, constraint "outbox_messages_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "inbox_messages" cascade;`);

    this.addSql(`drop table if exists "outbox_messages" cascade;`);
  }

}

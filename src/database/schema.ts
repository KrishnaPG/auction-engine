import { relations, sql } from "drizzle-orm";
import {
	boolean,
	decimal,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const auctions = pgTable("auctions", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	type: varchar("type", { length: 50 }).notNull(), // AuctionType enum
	startingPrice: decimal("starting_price", {
		precision: 15,
		scale: 2,
	}).notNull(),
	reservePrice: decimal("reserve_price", { precision: 15, scale: 2 }),
	minIncrement: decimal("min_increment", { precision: 15, scale: 2 }).notNull(),
	currentPrice: decimal("current_price", { precision: 15, scale: 2 }).default(sql`0`).notNull(),
	startTime: timestamp("start_time").notNull(),
	endTime: timestamp("end_time").notNull(),
	status: varchar("status", { length: 50 }).notNull().default("draft"), // AuctionStatus
	version: integer("version").default(1),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),
});

export const bids = pgTable("bids", {
	id: uuid("id").primaryKey().defaultRandom(),
	auctionId: uuid("auction_id")
		.notNull()
		.references(() => auctions.id, { onDelete: "cascade" }),
	bidderId: uuid("bidder_id").notNull(),
	amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
	quantity: integer("quantity").default(1),
	timestamp: timestamp("timestamp").defaultNow(),
	status: varchar("status", { length: 50 }).notNull().default("active"), // BidStatus
	isWinning: boolean("is_winning").default(false),
	visible: boolean("visible").default(false).notNull(),
	version: integer("version").default(1),
	idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),
});

export const outboxEvents = pgTable("outbox_events", {
	id: serial("id").primaryKey(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	auctionId: uuid("auction_id").references(() => auctions.id),
	payload: jsonb("payload").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	processedAt: timestamp("processed_at"),
	attempts: integer("attempts").default(0),
});

export const auctionConfigurations = pgTable("auction_configurations", {
	auctionId: uuid("auction_id").notNull().references(() => auctions.id, { onDelete: "cascade" }),
	typeSpecificParams: jsonb("type_specific_params").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
	pk: primaryKey({ columns: [table.auctionId] }),
}));

export const auctionsRelations = relations(auctions, ({ many, one }) => ({
	bids: many(bids),
	config: one(auctionConfigurations, {
		fields: [auctions.id],
		references: [auctionConfigurations.auctionId],
	}),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
	auction: one(auctions, {
		fields: [bids.auctionId],
		references: [auctions.id],
	}),
}));

// Indexes from docs/0-2-indexing-strategy-performance.md
// For auctions: idx_auctions_status_endtime, idx_auctions_type_creator, idx_auctions_id_type_status_timestamp
// For bids: idx_bids_auction_amount, idx_bids_realtime_auction, idx_bids_idempotency, idx_bids_auction_visible
// For auction_configurations: idx_auction_configurations_auction_id
// For outbox_events: idx_outbox_events_auction_id_processed

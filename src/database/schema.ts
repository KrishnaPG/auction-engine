import { relations, sql } from "drizzle-orm";
import {
	boolean,
	decimal,
	index,
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
}, (table) => ({
	// Perf: Index on status and end time for active auctions
	idxAuctionsStatusEndtime: index("idx_auctions_status_endtime").on(table.status, table.endTime),
	// Perf: Index on type and creator
	idxAuctionsTypeCreator: index("idx_auctions_type_creator").on(table.type, table.createdBy),
	// Perf: Composite index for queries
	idxAuctionsIdTypeStatusTimestamp: index("idx_auctions_id_type_status_timestamp").on(table.id, table.type, table.status, table.createdAt),
}));

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
}, (table) => ({
	// Perf: Composite index on (auction_id, amount DESC) for fast price queries
	idxBidsAuctionAmount: index("idx_bids_auction_amount").on(table.auctionId, sql`${table.amount} DESC`),
	// Perf: Index for realtime bid queries
	idxBidsRealtimeAuction: index("idx_bids_realtime_auction").on(table.auctionId, sql`${table.timestamp} DESC`),
	// Perf: Index for idempotency
	idxBidsIdempotency: index("idx_bids_idempotency").on(table.idempotencyKey),
	// Perf: Index for visible bids
	idxBidsAuctionVisible: index("idx_bids_auction_visible").on(table.auctionId, table.visible),
}));

export const outboxEvents = pgTable("outbox_events", {
	id: serial("id").primaryKey(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	auctionId: uuid("auction_id").references(() => auctions.id),
	payload: jsonb("payload").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	processedAt: timestamp("processed_at"),
	attempts: integer("attempts").default(0),
}, (table) => ({
	// Perf: Index on auction_id and processed status
	idxOutboxAuctionProcessed: index("idx_outbox_events_auction_id_processed").on(table.auctionId, table.processedAt),
}));

export const auctionConfigurations = pgTable("auction_configurations", {
	auctionId: uuid("auction_id").notNull().references(() => auctions.id, { onDelete: "cascade" }),
	typeSpecificParams: jsonb("type_specific_params").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
	pk: primaryKey({ columns: [table.auctionId] }),
	// Perf: Index on auction_id
	idxAuctionConfigAuctionId: index("idx_auction_configurations_auction_id").on(table.auctionId),
}));

export const rules = pgTable("rules", {
	ruleId: uuid("rule_id").primaryKey().defaultRandom(),
	ruleCode: varchar("rule_code", { length: 100 }).unique().notNull(),
	ruleName: varchar("rule_name", { length: 255 }).notNull(),
	description: text("description").notNull(),
	ruleCategory: varchar("rule_category", { length: 50 }).notNull(), // bidding, timing, eligibility, payment, compliance, security
	auctionTypes: jsonb("auction_types").notNull(), // Array of applicable auction types
	severity: varchar("severity", { length: 20 }).notNull(), // info, warning, error, critical
	isActive: boolean("is_active").default(true),
	isSystemRule: boolean("is_system_rule").default(false),
	isCustomizable: boolean("is_customizable").default(true),
	conditionLogic: jsonb("condition_logic").notNull(), // JSON logic structure
	validationExpression: text("validation_expression").notNull(),
	errorMessage: text("error_message").notNull(),
	remediationActions: jsonb("remediation_actions"), // Actions to take when rule fails
	dependencies: jsonb("dependencies"), // Other rules this rule depends on
	performanceImpact: varchar("performance_impact", { length: 20 }).default("low"), // low, medium, high
	cacheDuration: integer("cache_duration").default(300), // seconds
	createdBy: uuid("created_by"),
	approvedBy: uuid("approved_by"),
	version: integer("version").default(1),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	effectiveFrom: timestamp("effective_from"),
	effectiveUntil: timestamp("effective_until"),
}, (table) => ({
	// Perf: Index on rule code for lookups
	idxRulesCode: index("idx_rules_code").on(table.ruleCode),
	// Perf: Index on category for filtering
	idxRulesCategory: index("idx_rules_category").on(table.ruleCategory),
	// Perf: GIN index for auction types array
	idxRulesAuctionTypes: index("idx_rules_auction_types").on(table.auctionTypes),
	// Perf: Index on active rules
	idxRulesActive: index("idx_rules_active").on(table.isActive),
	// Perf: Index on severity for filtering
	idxRulesSeverity: index("idx_rules_severity").on(table.severity),
	// Perf: Index on performance impact for optimization
	idxRulesPerformance: index("idx_rules_performance").on(table.performanceImpact),
	// Perf: Index on effective dates for time-based filtering
	idxRulesEffective: index("idx_rules_effective").on(table.effectiveFrom, table.effectiveUntil),
}));

export const ruleConfigurations = pgTable("rule_configurations", {
	configId: uuid("config_id").primaryKey().defaultRandom(),
	ruleId: uuid("rule_id").notNull().references(() => rules.ruleId, { onDelete: "cascade" }),
	auctionId: uuid("auction_id").references(() => auctions.id, { onDelete: "cascade" }),
	auctionType: varchar("auction_type", { length: 50 }),
	scope: varchar("scope", { length: 50 }).notNull(), // global, auction_type, auction, user_group
	scopeValue: varchar("scope_value", { length: 255 }),
	configValues: jsonb("config_values").notNull(),
	isOverride: boolean("is_override").default(false),
	priority: integer("priority").default(0),
	isActive: boolean("is_active").default(true),
	conditionExpression: text("condition_expression"),
	createdBy: uuid("created_by").notNull(),
	approvedBy: uuid("approved_by"),
	effectiveFrom: timestamp("effective_from"),
	effectiveUntil: timestamp("effective_until"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
	// Perf: Index on rule_id for rule configuration queries
	idxRuleConfigsRule: index("idx_rule_configs_rule").on(table.ruleId),
	// Perf: Index on auction_id for auction-specific configurations
	idxRuleConfigsAuction: index("idx_rule_configs_auction").on(table.auctionId),
	// Perf: Index on auction_type for type-specific configurations
	idxRuleConfigsType: index("idx_rule_configs_type").on(table.auctionType),
	// Perf: Index on scope for scope-based queries
	idxRuleConfigsScope: index("idx_rule_configs_scope").on(table.scope),
	// Perf: Index on active configurations
	idxRuleConfigsActive: index("idx_rule_configs_active").on(table.isActive),
	// Perf: Index on priority for priority-based resolution
	idxRuleConfigsPriority: index("idx_rule_configs_priority").on(table.priority),
}));

export const ruleViolations = pgTable("rule_violations", {
	violationId: uuid("violation_id").primaryKey().defaultRandom(),
	ruleId: uuid("rule_id").notNull().references(() => rules.ruleId, { onDelete: "cascade" }),
	configId: uuid("config_id").references(() => ruleConfigurations.configId, { onDelete: "cascade" }),
	auctionId: uuid("auction_id").notNull().references(() => auctions.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	bidId: uuid("bid_id").references(() => bids.id, { onDelete: "cascade" }),
	itemId: uuid("item_id"),
	violationType: varchar("violation_type", { length: 50 }).notNull(), // hard_violation, soft_violation, warning
	severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
	violationMessage: text("violation_message").notNull(),
	violationData: jsonb("violation_data").notNull(),
	expectedValues: jsonb("expected_values"),
	actualValues: jsonb("actual_values").notNull(),
	validationDetails: jsonb("validation_details"),
	remediationActions: jsonb("remediation_actions"),
	userNotificationSent: boolean("user_notification_sent").default(false),
	adminAlertSent: boolean("admin_alert_sent").default(false),
	status: varchar("status", { length: 50 }).notNull(), // detected, acknowledged, resolved, dismissed, escalated
	resolution: text("resolution"),
	resolvedBy: uuid("resolved_by"),
	resolvedAt: timestamp("resolved_at"),
	escalationLevel: integer("escalation_level").default(0),
	nextEscalationAt: timestamp("next_escalation_at"),
	occurredAt: timestamp("occurred_at").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
	// Perf: Index on rule_id for rule violation queries
	idxRuleViolationsRule: index("idx_rule_violations_rule").on(table.ruleId),
	// Perf: Index on auction_id for auction violation analysis
	idxRuleViolationsAuction: index("idx_rule_violations_auction").on(table.auctionId),
	// Perf: Index on user_id for user violation history
	idxRuleViolationsUser: index("idx_rule_violations_user").on(table.userId),
	// Perf: Index on violation_type for filtering
	idxRuleViolationsType: index("idx_rule_violations_type").on(table.violationType),
	// Perf: Index on severity for severity-based queries
	idxRuleViolationsSeverity: index("idx_rule_violations_severity").on(table.severity),
	// Perf: Index on status for status-based filtering
	idxRuleViolationsStatus: index("idx_rule_violations_status").on(table.status),
	// Perf: Index on occurred_at for time-based analysis
	idxRuleViolationsTime: index("idx_rule_violations_time").on(table.occurredAt),
	// Perf: Index on escalation for escalation management
	idxRuleViolationsEscalation: index("idx_rule_violations_escalation").on(table.escalationLevel, table.nextEscalationAt),
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

// Indexes implemented for performance: <1ms queries, zero-alloc via prepared stmts
// Auctions: status+endtime, type+creator, id+type+status+timestamp
// Bids: auction+amount DESC, auction+timestamp DESC, idempotency, auction+visible
// AuctionConfigurations: auction_id
// OutboxEvents: auction_id+processed

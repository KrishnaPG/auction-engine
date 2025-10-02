// Core Domain Interfaces for Auction System

export type {
	TAuctionEndTime,
	TAuctionId,
	TAuctionStartTime,
	TBidAmount,
	TBidId,
	TCurrentPrice,
	TIdempotencyKey,
	TMinimumIncrement,
	TTimestamp,
	TUserId,
} from "./branded-types";

import type {
	TApprovalState,
	TAuctionDuration,
	TAuctionEndTime,
	TAuctionId,
	TAuctionStartTime,
	TBidAmount,
	TBidId,
	TBidQuantity,
	TCurrency,
	TCurrentPrice,
	TIdempotencyKey,
	TItemId,
	TItemQuantity,
	TMinimumIncrement,
	TReservePrice,
	TStartingPrice,
	TTimestamp,
	TUserId,
	TValidationStatus,
} from "./branded-types";

export type Tx = ITransaction;

// Enums for auction system
export enum AuctionType {
	ENGLISH = "english",
	DUTCH = "dutch",
	SEALED_BID = "sealed_bid",
	REVERSE = "reverse",
	VICKREY = "vickrey",
	BUY_IT_NOW = "buy_it_now",
	DOUBLE = "double",
	ALL_PAY = "all_pay",
	JAPANESE = "japanese",
	CHINESE = "chinese",
	PENNY = "penny",
	MULTI_UNIT = "multi_unit",
	COMBINATORIAL = "combinatorial",
}

export enum AuctionStatus {
	DRAFT = "draft",
	SCHEDULED = "scheduled",
	ACTIVE = "active",
	PAUSED = "paused",
	COMPLETED = "completed",
	CANCELLED = "cancelled",
	SUSPENDED = "suspended",
}

export enum BidStatus {
	ACTIVE = "active",
	RETRACTED = "retracted",
	OUTBID = "outbid",
	WINNING = "winning",
	LOSING = "losing",
}

export enum UserRole {
	BIDDER = "bidder",
	SELLER = "seller",
	ADMIN = "admin",
	MODERATOR = "moderator",
	SYSTEM = "system",
}

export enum AccountStatus {
	ACTIVE = "active",
	SUSPENDED = "suspended",
	DEACTIVATED = "deactivated",
	PENDING_VERIFICATION = "pending_verification",
	BANNED = "banned",
}

// Value Objects (Branded/Thin)
export class Money {
	constructor(
		public readonly value: number,
		public readonly currency: TCurrency,
	) {}
	static fromDb(dbValue: { amount: number; currency: string }): Money {
		return new Money(dbValue.amount, dbValue.currency as TCurrency);
	}
	add(other: Money): Money {
		return new Money(this.value + other.value, this.currency);
	}
	subtract(other: Money): Money {
		return new Money(this.value - other.value, this.currency);
	}
	multiply(factor: number): Money {
		return new Money(this.value * factor, this.currency);
	}
	isGreaterThan(other: Money): boolean {
		return this.value > other.value;
	}
	isLessThan(other: Money): boolean {
		return this.value < other.value;
	}
	isEqualTo(other: Money): boolean {
		return this.value === other.value && this.currency === other.currency;
	}
	toCents(): number {
		return Math.round(this.value * 100);
	}
	toValue(): number {
		return this.value;
	}
}

export interface Duration {
	readonly milliseconds: number;

	add(other: Duration): Duration;
	subtract(other: Duration): Duration;
	toSeconds(): number;
	toMinutes(): number;
	toHours(): number;
	toDays(): number;
	isGreaterThan(other: Duration): boolean;
	isLessThan(other: Duration): boolean;
}

// Data Types (Plain Objects from DB)

export interface AuctionData {
	id: TAuctionId;
	title: string;
	description: string;
	type: AuctionType;
	startTime: TAuctionStartTime;
	endTime: TAuctionEndTime;
	startingPrice: TStartingPrice;
	reservePrice?: TReservePrice;
	minIncrement: TMinimumIncrement;
	status: AuctionStatus; // Computed via SQL
	version: number;
	createdBy: TUserId;
	createdAt: TTimestamp;
	updatedAt: TTimestamp;
	itemCount: number;
}

export interface BidData {
	id: TBidId;
	auctionId: TAuctionId;
	bidderId: TUserId;
	amount: TBidAmount;
	quantity: TBidQuantity;
	timestamp: TTimestamp;
	status: BidStatus;
	isWinning: boolean; // Computed via SQL
	version: number;
}

export interface UserData {
	id: TUserId;
	username: string;
	email: string;
	roles: UserRole[];
	accountStatus: AccountStatus;
	isEmailVerified: boolean;
	createdAt: TTimestamp;
	lastLoginAt?: TTimestamp;
}

export interface ItemData {
	id: TItemId;
	auctionId: TAuctionId;
	title: string;
	description: string;
	category: string;
	quantity: TItemQuantity;
	startingBid?: TStartingPrice;
	buyItNowPrice?: TStartingPrice;
	fairMarketValue?: TStartingPrice;
	images: string[];
	specifications: Record<string, string>;
	condition: string;
	location?: string;
	shippingInfo: Record<string, any>;
}

// Request/Response Types

export interface CreateAuctionRequest {
	readonly title: string;
	readonly description?: string;
	readonly type: AuctionType;
	readonly startingPrice: Money;
	readonly reservePrice?: Money;
	readonly minIncrement: Money;
	readonly startTime: TAuctionStartTime;
	readonly endTime: TAuctionEndTime;
	readonly items: ReadonlyArray<CreateItemRequest>;
	readonly configurations: ReadonlyMap<string, any>;
	readonly createdBy: TUserId;
	idempotencyKey?: TIdempotencyKey;
}

export interface CreateItemRequest {
	readonly title: string;
	readonly description?: string;
	readonly category?: string;
	readonly quantity: TItemQuantity;
	readonly startingBid?: Money;
	readonly buyItNowPrice?: Money;
	readonly fairMarketValue?: Money;
	readonly images?: ReadonlyArray<string>;
	readonly specifications?: ReadonlyMap<string, string>;
	readonly condition?: string;
	readonly location?: string;
	readonly shippingInfo?: ReadonlyMap<string, any>;
}

export interface PlaceBidRequest {
	readonly auctionId: TAuctionId;
	readonly bidderId: TUserId;
	readonly amount: Money;
	readonly quantity?: TBidQuantity;
	readonly maxProxyAmount?: Money;
	readonly isAnonymous?: boolean;
	idempotencyKey?: TIdempotencyKey;
}

export interface BidResult {
	readonly success: boolean;
	readonly bidId?: TBidId;
	readonly errors?: ReadonlyArray<string>;
	readonly warnings?: ReadonlyArray<string>;
}

export interface AuctionResult {
	readonly auctionId: TAuctionId;
	readonly winnerId?: TUserId;
	readonly winningBidId?: TBidId;
	readonly finalPrice?: Money;
	readonly totalBids: number;
	readonly endedAt: TTimestamp;
	readonly resultType: "sold" | "reserve_not_met" | "no_bids" | "cancelled";
}

// Query Interfaces (Stateless DB Access)

export interface IAuctionQueries {
	getAuctionData(id: TAuctionId): Promise<AuctionData | null>; // SELECT * FROM auctions WHERE id = ?
	getCurrentPrice(
		auctionId: TAuctionId,
		type: AuctionType,
	): Promise<TCurrentPrice>; // Type-specific CASE SQL
	getStatus(id: TAuctionId): Promise<AuctionStatus>; // CASE on times/bids
	canPlaceBid(auctionId: TAuctionId, amount: TBidAmount): Promise<boolean>; // SQL checks
	createAuction(tx: Tx, req: CreateAuctionRequest): Promise<TAuctionId>; // Prepared INSERT with idempotency
	updateAuction(
		tx: Tx,
		id: TAuctionId,
		updates: Partial<AuctionData>,
	): Promise<void>; // UPDATE with version
	setAuctionConfig(
		tx: Tx,
		auctionId: TAuctionId,
		config: AuctionConfig,
	): Promise<void>; // INSERT/UPDATE JSONB
	updateAuctionStatus(
		tx: Tx,
		auctionId: TAuctionId,
		newStatus: AuctionStatus,
		reason?: string,
	): Promise<void>; // UPDATE status + outbox
	findAuctions(criteria?: QueryCriteria): Promise<AuctionData[]>; // Dynamic filters
	findActiveAuctions(): Promise<AuctionData[]>;
	findAuctionsByType(type: AuctionType): Promise<AuctionData[]>;
	findAuctionsByCreator(creatorId: TUserId): Promise<AuctionData[]>;
	getByIdempotency(key: TIdempotencyKey): Promise<TAuctionId | null>; // SELECT for idempotency
}

export interface IBidQueries {
	placeBid(tx: Tx, req: PlaceBidRequest): Promise<TBidId>; // Idempotency SELECT, INSERT (tx)
	getBidsByAuction(auctionId: TAuctionId): Promise<BidData[]>;
	getWinningBids(auctionId: TAuctionId): Promise<BidData[]>; // ROW_NUMBER ORDER BY amount DESC
	getByIdempotency(key: TIdempotencyKey): Promise<BidData | null>;
	retractBid(bidId: TBidId): Promise<void>; // UPDATE status
	findBidsByBidder(bidderId: TUserId): Promise<BidData[]>;
	getBidData(bidId: TBidId): Promise<BidData | null>;
}

export interface IWinnerQueries {
	determineWinner(
		auctionId: TAuctionId,
		type: AuctionType,
	): Promise<TUserId | null>; // Parameterized SQL
	determineWinners(auctionId: TAuctionId): Promise<Map<TUserId, TBidId>>; // Multi-unit/combinatorial
}

export interface IUserQueries {
	getUserData(id: TUserId): Promise<UserData | null>;
	findByUsername(username: string): Promise<UserData | null>;
	findActiveUsers(): Promise<UserData[]>;
}

// Query Specification Pattern

export interface QueryCriteria {
	readonly filters?: ReadonlyArray<QueryFilter>;
	readonly sortBy?: ReadonlyArray<SortCriteria>;
	readonly pagination?: PaginationOptions;
	readonly includes?: ReadonlyArray<string>;
}

export interface QueryFilter {
	readonly field: string;
	readonly operator:
		| "equals"
		| "not_equals"
		| "greater_than"
		| "less_than"
		| "greater_than_or_equal"
		| "less_than_or_equal"
		| "contains"
		| "in"
		| "between";
	readonly value: any;
}

export interface SortCriteria {
	readonly field: string;
	readonly direction: "asc" | "desc";
}

export interface PaginationOptions {
	readonly page: number;
	readonly limit: number;
	readonly offset?: number;
}

// Service Interfaces (Thin, Query-Based)

export interface IAuctionService {
	createAuction(req: CreateAuctionRequest): Promise<TAuctionId>;
	endAuction(id: TAuctionId): Promise<AuctionResult>;
	extendAuction(id: TAuctionId, duration: number): Promise<void>; // seconds
	getAuctionData(id: TAuctionId): Promise<AuctionData | null>; // Delegate
	findAuctionsByStatus(status: AuctionStatus): Promise<AuctionData[]>;
	findAuctionsByType(type: AuctionType): Promise<AuctionData[]>;
}

export interface IBidService {
	placeBid(req: PlaceBidRequest): Promise<TBidId>;
	validateBid(
		auctionId: TAuctionId,
		amount: TBidAmount,
	): Promise<BidValidation>;
	getBidHistory(auctionId: TAuctionId): Promise<BidData[]>;
	getWinningBids(auctionId: TAuctionId): Promise<BidData[]>;
	getUserBids(userId: TUserId): Promise<BidData[]>;
}

export interface IUserService {
	createUser(req: CreateUserRequest): Promise<TUserId>;
	getUserData(id: TUserId): Promise<UserData | null>;
	updateUser(id: TUserId, updates: UserUpdateRequest): Promise<void>;
}

// No strategies: Logic in SQL parameterized by type

// Database Interfaces

// export interface IDatabaseAdapter {
// 	connect(): Promise<void>;
// 	disconnect(): Promise<void>;
// 	isConnected(): boolean;

// 	query<T = any>(sql: string, params?: readonly any[]): Promise<T[]>;
// 	queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
// 	queryValue<T = any>(sql: string, params?: any[]): Promise<T>;

// 	beginTransaction(): Promise<ITransaction>;
// 	executeInTransaction<T>(
// 		operation: (tx: ITransaction) => Promise<T>,
// 	): Promise<T>;

// 	migrate(): Promise<void>;
// 	rollback(steps: number): Promise<void>;
// 	healthCheck(): Promise<DatabaseHealth>;
// }

// export interface ITransaction {
// 	query<T = any>(sql: string, params?: readonly any[]): Promise<T[]>;
// 	queryOne<T = any>(sql: string, params?: readonly any[]): Promise<T | null>;
// 	insert(table: any): { values(data: any): Promise<any> };
// 	update(table: any): { set(data: any): { where(condition: any): Promise<void> } };
// 	commit(): Promise<void>;
// 	rollback(): Promise<void>;
// 	isActive(): boolean;
// }

// Notification Interfaces

export interface INotificationService {
	notifyBidPlaced(bid: BidData): Promise<void>;
	notifyAuctionStarted(auction: AuctionData): Promise<void>;
	notifyAuctionEnded(
		auction: AuctionData,
		result: AuctionResult,
	): Promise<void>;
	notifyOutbid(bidder: UserData, auction: AuctionData): Promise<void>;
	notifyAuctionExtended(
		auction: AuctionData,
		newEndTime: TAuctionEndTime,
	): Promise<void>;
	notifyWinnerAnnounced(auction: AuctionData, winner: UserData): Promise<void>;
	sendCustomNotification(
		recipients: TUserId[],
		message: NotificationMessage,
	): Promise<unknown>;
	handleReconnect(
		userId: TUserId,
		auctionIds: TAuctionId[],
		lastSeen: TTimestamp,
	): Promise<unknown>;
}

// EventBus for pub/sub
export interface IEventBus {
	publish(topic: string, event: any): Promise<void>;
	subscribe(topic: string, handler: (event: any) => void): Promise<void>;
	replayEvents(
		auctionId: TAuctionId,
		from: TTimestamp,
	): Promise<ReadonlyArray<any>>;
}

// Configuration Interfaces

export interface IAuctionConfig {
	readonly minBidIncrement: Money;
	readonly reservePrice?: Money;
	readonly maxAutoExtensions: number;
	readonly extensionTriggerSeconds: number;
	readonly extensionDurationSeconds: number;
	readonly allowBidRetraction: boolean;
	readonly minBidIntervalMs: number;
	readonly maxBidsPerUser?: number;
	readonly antiSnipingEnabled?: boolean;
	readonly proxyBiddingEnabled?: boolean;
	readonly bidFeeAmount?: Money;
	readonly timeExtensionSeconds?: number;
	readonly maxExtensions?: number;
	readonly priceDecrementAmount?: Money;
	readonly decrementIntervalSeconds?: number;
	readonly minimumPrice?: Money;
	readonly bidRevealTime?: TAuctionEndTime;
	readonly allowLateBids?: boolean;
	readonly maxBidsPerBidder?: number;
	readonly allowPackageBidding?: boolean;
	readonly maxPackageSize?: number;
	readonly complementarityRules?: ReadonlyMap<string, number>;
	readonly packageValuationMethod?: "additive" | "multiplicative" | "custom";
}

export interface AuctionConfig {
	min_increment: TMinimumIncrement;
	auto_extend: boolean;
	// Extend for type-specific, e.g., decrement_rate: TPriceDrop for dutch
}

// Result Types

export interface BidValidation {
	readonly isValid: boolean;
	readonly errors: ReadonlyArray<string>;
	readonly warnings: ReadonlyArray<string>;
	readonly suggestedAmount?: Money;
}

export interface BidProcessingResult {
	readonly success: boolean;
	readonly newPrice?: Money;
	readonly shouldNotify: boolean;
	readonly notifications: ReadonlyArray<string>;
	readonly errors?: ReadonlyArray<string>;
	readonly extensions?: ReadonlyArray<AuctionExtension>;
}

export interface WinnerDeterminationResult {
	readonly hasWinner: boolean;
	readonly winner?: TUserId;
	readonly winningBid?: TBidId;
	readonly winningPrice?: Money;
	readonly secondPrice?: Money;
	readonly errors?: ReadonlyArray<string>;
}

export interface WinnersDeterminationResult {
	readonly hasWinners: boolean;
	readonly winners: ReadonlyMap<TUserId, TBidId>;
	readonly winningPrices: ReadonlyMap<TBidId, Money>;
	readonly errors?: ReadonlyArray<string>;
}

export interface AuctionFinalizationResult {
	readonly success: boolean;
	readonly winner?: TUserId;
	readonly finalPrice?: Money;
	readonly totalBids: number;
	readonly endedAt: TTimestamp;
	readonly errors?: ReadonlyArray<string>;
}

export interface BidImpact {
	readonly position: number;
	readonly totalBids: number;
	readonly isWinning: boolean;
	readonly percentile: number;
	readonly amountToWin: Money;
}

export interface AuctionExtension {
	readonly reason: string;
	readonly duration: Duration;
	readonly newEndTime: TAuctionEndTime;
}

export interface ValidationResult {
	readonly isValid: boolean;
	readonly errors: ReadonlyArray<string>;
	readonly warnings: ReadonlyArray<string>;
}

export interface DatabaseHealth {
	readonly isHealthy: boolean;
	readonly responseTime: number;
	readonly activeConnections: number;
	readonly errors?: ReadonlyArray<string>;
}

// Additional Request/Response Types

export interface CreateUserRequest {
	readonly username: string;
	readonly email: string;
	readonly password: string;
	readonly roles?: ReadonlyArray<UserRole>;
}

export interface UserUpdateRequest {
	readonly email?: string;
	readonly roles?: ReadonlyArray<UserRole>;
	readonly accountStatus?: AccountStatus;
}

export interface AuthenticationResult {
	readonly success: boolean;
	readonly user?: UserData;
	readonly token?: string;
	readonly expiresAt?: TTimestamp;
	readonly errors?: string[];
}

export interface NotificationMessage {
	readonly id: string;
	readonly type: string;
	readonly priority: "low" | "normal" | "high" | "urgent";
	readonly title: string;
	readonly content: string;
	readonly metadata?: ReadonlyMap<string, any>;
	readonly scheduledFor?: TTimestamp;
	readonly expiresAt?: TTimestamp;
}

// Error Types

export interface DomainError {
	readonly code: string;
	readonly message: string;
	readonly details?: ReadonlyMap<string, any>;
}

export interface ValidationError extends DomainError {
	readonly field?: string;
	readonly value?: any;
}

export interface BusinessRuleError extends DomainError {
	readonly ruleId?: string;
	readonly context?: ReadonlyMap<string, any>;
}

export interface InfrastructureError extends DomainError {
	readonly component: string;
	readonly operation: string;
}

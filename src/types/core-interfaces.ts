// Core Domain Interfaces for Auction System

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
	TItemId,
	TItemQuantity,
	TMinimumIncrement,
	TReservePrice,
	TStartingPrice,
	TTimestamp,
	TUserId,
	TValidationStatus,
} from "./branded-types";

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

// Value Objects
export interface Money {
	readonly amount: number;
	readonly currency: TCurrency;

	add(other: Money): Money;
	subtract(other: Money): Money;
	multiply(factor: number): Money;
	isGreaterThan(other: Money): boolean;
	isLessThan(other: Money): boolean;
	isEqualTo(other: Money): boolean;
	toCents(): number;
	toDollars(): number;
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

// Core Domain Entities

export interface IAuction {
	// Identity & Status
	getId(): TAuctionId;
	getStatus(): AuctionStatus;
	getVersion(): number;

	// Core Properties
	getTitle(): string;
	getDescription(): string;
	getType(): AuctionType;
	getStartTime(): TAuctionStartTime;
	getEndTime(): TAuctionEndTime;

	// Pricing
	getStartingPrice(): Money;
	getCurrentPrice(): Money;
	getReservePrice(): Money | null;
	getMinBidIncrement(): Money;

	// Business Rules
	canPlaceBid(bid: IBid): boolean;
	canEnd(): boolean;
	canExtend(): boolean;
	canPause(): boolean;
	canResume(): boolean;
	canCancel(): boolean;

	// State Changes
	placeBid(bid: IBid): void;
	end(): void;
	extend(duration: Duration): void;
	pause(reason: string): void;
	resume(): void;
	cancel(reason: string): void;

	// Metadata
	getCreatedBy(): TUserId;
	getCreatedAt(): TTimestamp;
	getUpdatedAt(): TTimestamp;
	getBids(): ReadonlyArray<IBid>;
	getItemCount(): number;
}

export interface IBid {
	getId(): TBidId;
	getAuctionId(): TAuctionId;
	getBidderId(): TUserId;
	getAmount(): Money;
	getQuantity(): TBidQuantity;
	getTimestamp(): TTimestamp;
	getStatus(): BidStatus;
	isWinning(): boolean;
	isRetracted(): boolean;
	canRetract(): boolean;
	retract(reason: string): void;
	getVersion(): number;
}

export interface IUser {
	getId(): TUserId;
	getUsername(): string;
	getEmail(): string;
	getRoles(): ReadonlyArray<UserRole>;
	getAccountStatus(): AccountStatus;
	canParticipateInAuction(auction: IAuction): boolean;
	hasPermission(permission: string): boolean;
	isEmailVerified(): boolean;
	isActive(): boolean;
	getCreatedAt(): TTimestamp;
	getLastLoginAt(): TTimestamp | null;
}

export interface IItem {
	getId(): TItemId;
	getAuctionId(): TAuctionId;
	getTitle(): string;
	getDescription(): string;
	getCategory(): string;
	getQuantity(): TItemQuantity;
	getStartingBid(): Money | null;
	getBuyItNowPrice(): Money | null;
	getFairMarketValue(): Money | null;
	getImages(): ReadonlyArray<string>;
	getSpecifications(): ReadonlyMap<string, string>;
	getCondition(): string;
	getLocation(): string | null;
	getShippingInfo(): ReadonlyMap<string, any>;
}

// Request/Response Types

export interface CreateAuctionRequest {
	readonly title: string;
	readonly description?: string;
	readonly type: AuctionType;
	readonly startingPrice: Money;
	readonly reservePrice?: Money;
	readonly minBidIncrement: Money;
	readonly startTime: TAuctionStartTime;
	readonly endTime: TAuctionEndTime;
	readonly items: ReadonlyArray<CreateItemRequest>;
	readonly configurations: ReadonlyMap<string, any>;
	readonly createdBy: TUserId;
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

// Repository Interfaces

export interface IRepository<T, TId> {
	findById(id: TId): Promise<T | null>;
	findAll(criteria?: QueryCriteria): Promise<ReadonlyArray<T>>;
	save(entity: T): Promise<T>;
	saveAll(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
	delete(id: TId): Promise<boolean>;
	deleteByCriteria(criteria: QueryCriteria): Promise<number>;
	exists(id: TId): Promise<boolean>;
	count(criteria?: QueryCriteria): Promise<number>;
}

export interface IAuctionRepository extends IRepository<IAuction, TAuctionId> {
	findActiveAuctions(): Promise<ReadonlyArray<IAuction>>;
	findAuctionsByType(type: AuctionType): Promise<ReadonlyArray<IAuction>>;
	findAuctionsByStatus(status: AuctionStatus): Promise<ReadonlyArray<IAuction>>;
	findAuctionsEndingSoon(minutes: number): Promise<ReadonlyArray<IAuction>>;
	findAuctionsByBidder(bidderId: TUserId): Promise<ReadonlyArray<IAuction>>;
	findAuctionsByPriceRange(
		minPrice: Money,
		maxPrice: Money,
	): Promise<ReadonlyArray<IAuction>>;
	findAuctionsByCreator(creatorId: TUserId): Promise<ReadonlyArray<IAuction>>;
	findScheduledAuctions(): Promise<ReadonlyArray<IAuction>>;
	findCompletedAuctions(since?: TTimestamp): Promise<ReadonlyArray<IAuction>>;
}

export interface IBidRepository extends IRepository<IBid, TBidId> {
	findBidsByAuction(auctionId: TAuctionId): Promise<ReadonlyArray<IBid>>;
	findBidsByBidder(bidderId: TUserId): Promise<ReadonlyArray<IBid>>;
	findWinningBidsByAuction(auctionId: TAuctionId): Promise<ReadonlyArray<IBid>>;
	findHighestBidByAuction(auctionId: TAuctionId): Promise<IBid | null>;
	findBidsInTimeRange(
		startTime: TTimestamp,
		endTime: TTimestamp,
	): Promise<ReadonlyArray<IBid>>;
	findActiveBidsByAuction(auctionId: TAuctionId): Promise<ReadonlyArray<IBid>>;
	findRetractedBidsByBidder(bidderId: TUserId): Promise<ReadonlyArray<IBid>>;
	findBidsByAmountRange(
		minAmount: Money,
		maxAmount: Money,
	): Promise<ReadonlyArray<IBid>>;
}

export interface IUserRepository extends IRepository<IUser, TUserId> {
	findByUsername(username: string): Promise<IUser | null>;
	findByEmail(email: string): Promise<IUser | null>;
	findByRole(role: UserRole): Promise<ReadonlyArray<IUser>>;
	findByAccountStatus(status: AccountStatus): Promise<ReadonlyArray<IUser>>;
	findActiveUsers(): Promise<ReadonlyArray<IUser>>;
	findUsersByCreationDate(
		startDate: TTimestamp,
		endDate: TTimestamp,
	): Promise<ReadonlyArray<IUser>>;
	findUsersByLastLogin(since: TTimestamp): Promise<ReadonlyArray<IUser>>;
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

// Service Interfaces

export interface IAuctionService {
	createAuction(request: CreateAuctionRequest): Promise<IAuction>;
	startAuction(auctionId: TAuctionId): Promise<void>;
	pauseAuction(auctionId: TAuctionId, reason: string): Promise<void>;
	resumeAuction(auctionId: TAuctionId): Promise<void>;
	endAuction(auctionId: TAuctionId): Promise<AuctionResult>;
	cancelAuction(auctionId: TAuctionId, reason: string): Promise<void>;
	extendAuction(auctionId: TAuctionId, duration: Duration): Promise<void>;
	getAuction(auctionId: TAuctionId): Promise<IAuction | null>;
	getAuctionsByStatus(status: AuctionStatus): Promise<ReadonlyArray<IAuction>>;
	getAuctionsByType(type: AuctionType): Promise<ReadonlyArray<IAuction>>;
}

export interface IBidService {
	placeBid(request: PlaceBidRequest): Promise<BidResult>;
	retractBid(bidId: TBidId, reason: string): Promise<void>;
	validateBid(auctionId: TAuctionId, bidAmount: Money): Promise<BidValidation>;
	getBidHistory(auctionId: TAuctionId): Promise<ReadonlyArray<IBid>>;
	getUserBids(userId: TUserId): Promise<ReadonlyArray<IBid>>;
	getWinningBids(auctionId: TAuctionId): Promise<ReadonlyArray<IBid>>;
	getBid(bidId: TBidId): Promise<IBid | null>;
}

export interface IUserService {
	createUser(request: CreateUserRequest): Promise<IUser>;
	authenticateUser(
		username: string,
		password: string,
	): Promise<AuthenticationResult>;
	getUser(userId: TUserId): Promise<IUser | null>;
	updateUser(userId: TUserId, updates: UserUpdateRequest): Promise<IUser>;
	deactivateUser(userId: TUserId, reason: string): Promise<void>;
	verifyEmail(userId: TUserId, token: string): Promise<boolean>;
	resetPassword(userId: TUserId, newPassword: string): Promise<void>;
}

// Strategy Interfaces

export interface IAuctionStrategy {
	readonly strategyType: AuctionType;
	readonly strategyName: string;

	canPlaceBid(auction: IAuction, bid: IBid): boolean;
	calculateNextPrice(auction: IAuction, currentBid?: IBid): Money;
	determineWinner(auction: IAuction): WinnerDeterminationResult;
	shouldExtendAuction(auction: IAuction): boolean;
	calculateExtensionDuration(auction: IAuction): Duration;
	processBid(auction: IAuction, bid: IBid): BidProcessingResult;
	finalizeAuction(auction: IAuction): AuctionFinalizationResult;
	validateAuctionConfig(config: any): ValidationResult;
}

export interface IBidProcessingStrategy {
	processBid(auction: IAuction, bid: IBid): BidProcessingResult;
	validateBid(auction: IAuction, bid: IBid): BidValidation;
	calculateBidImpact(auction: IAuction, bid: IBid): BidImpact;
	shouldNotifyBidUpdate(bid: IBid): boolean;
}

export interface IWinnerDeterminationStrategy {
	determineWinner(auction: IAuction): WinnerDeterminationResult;
	determineWinners(auction: IAuction): WinnersDeterminationResult;
	isAuctionComplete(auction: IAuction): boolean;
	calculateFinalPrices(auction: IAuction): ReadonlyMap<TBidId, Money>;
}

// Database Interfaces

export interface IDatabaseAdapter {
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	isConnected(): boolean;

	query<T = any>(sql: string, params?: any[]): Promise<T[]>;
	queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
	queryValue<T = any>(sql: string, params?: any[]): Promise<T>;

	beginTransaction(): Promise<ITransaction>;
	executeInTransaction<T>(
		operation: (tx: ITransaction) => Promise<T>,
	): Promise<T>;

	migrate(): Promise<void>;
	rollback(steps: number): Promise<void>;
	healthCheck(): Promise<DatabaseHealth>;
}

export interface ITransaction {
	query<T = any>(sql: string, params?: any[]): Promise<T[]>;
	queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
	commit(): Promise<void>;
	rollback(): Promise<void>;
	isActive(): boolean;
}

// Notification Interfaces

export interface INotificationService {
	notifyBidPlaced(bid: IBid): Promise<void>;
	notifyAuctionStarted(auction: IAuction): Promise<void>;
	notifyAuctionEnded(auction: IAuction, result: AuctionResult): Promise<void>;
	notifyOutbid(bidder: IUser, auction: IAuction): Promise<void>;
	notifyAuctionExtended(
		auction: IAuction,
		newEndTime: TAuctionEndTime,
	): Promise<void>;
	notifyWinnerAnnounced(auction: IAuction, winner: IUser): Promise<void>;
	sendCustomNotification(
		recipients: ReadonlyArray<TUserId>,
		message: NotificationMessage,
	): Promise<void>;
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
	readonly user?: IUser;
	readonly token?: string;
	readonly expiresAt?: TTimestamp;
	readonly errors?: ReadonlyArray<string>;
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

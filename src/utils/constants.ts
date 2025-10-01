// Core Constants for Auction Engine

import {
	createAuctionDuration,
	createAutoExtensionCount,
	createBidTimeout,
	createMaxBidders,
	createMaxBidsPerUser,
	createMinimumIncrement,
	createTimeExtension,
} from "../types/branded-constructors";
import type {
	TAuctionDuration,
	TAutoExtensionCount,
	TBidTimeout,
	TMaxBidders,
	TMaxBidsPerUser,
	TMinimumIncrement,
	TTimeExtension,
} from "../types/branded-types";

// Auction Duration Constants
export const AUCTION_DURATION = {
	MINIMUM: createAuctionDuration(60000), // 1 minute
	MAXIMUM: createAuctionDuration(2592000000), // 30 days
	DEFAULT: createAuctionDuration(86400000), // 24 hours

	// Common presets
	QUICK: createAuctionDuration(3600000), // 1 hour
	STANDARD: createAuctionDuration(86400000), // 24 hours
	EXTENDED: createAuctionDuration(604800000), // 7 days
	MARATHON: createAuctionDuration(1209600000), // 14 days
} as const;

// Time Extension Constants
export const TIME_EXTENSION = {
	MINIMUM: createTimeExtension(1000), // 1 second
	DEFAULT: createTimeExtension(300000), // 5 minutes
	MAXIMUM: createTimeExtension(3600000), // 1 hour

	// Auction type specific
	PENNY_AUCTION: createTimeExtension(10000), // 10 seconds
	SNIPING_PROTECTION: createTimeExtension(120000), // 2 minutes
} as const;

// Bid Timeout Constants
export const BID_TIMEOUT = {
	MINIMUM: createBidTimeout(5000), // 5 seconds
	DEFAULT: createBidTimeout(30000), // 30 seconds
	MAXIMUM: createBidTimeout(300000), // 5 minutes

	// High-frequency scenarios
	RAPID_BIDDING: createBidTimeout(1000), // 1 second
	NORMAL_BIDDING: createBidTimeout(10000), // 10 seconds
} as const;

// Price Increment Constants
export const PRICE_INCREMENT = {
	MINIMUM: createMinimumIncrement(1), // 1 cent
	STANDARD: createMinimumIncrement(100), // $1.00
	PREMIUM: createMinimumIncrement(500), // $5.00

	// Auction type specific
	PENNY_AUCTION: createMinimumIncrement(1), // 1 cent
	ART_AUCTION: createMinimumIncrement(1000), // $10.00
	REAL_ESTATE: createMinimumIncrement(10000), // $100.00
} as const;

// Bidder Limits
export const BIDDER_LIMITS = {
	MAX_BIDDERS_PER_AUCTION: createMaxBidders(10000),
	MAX_BIDS_PER_USER: createMaxBidsPerUser(100),
	MAX_BIDS_PER_AUCTION: createMaxBidsPerUser(50),

	// High-frequency limits
	RAPID_BIDDING_MAX_PER_MINUTE: createMaxBidsPerUser(30),
	NORMAL_BIDDING_MAX_PER_HOUR: createMaxBidsPerUser(100),
} as const;

// Auto Extension Constants
export const AUTO_EXTENSION = {
	MAX_EXTENSIONS: createAutoExtensionCount(10),
	DEFAULT_TRIGGER_SECONDS: 300, // 5 minutes
	DEFAULT_EXTENSION_DURATION: 300000, // 5 minutes

	// Auction type specific
	ENGLISH_AUCTION: {
		MAX_EXTENSIONS: createAutoExtensionCount(5),
		TRIGGER_SECONDS: 120, // 2 minutes
		EXTENSION_DURATION: 120000, // 2 minutes
	},
	PENNY_AUCTION: {
		MAX_EXTENSIONS: createAutoExtensionCount(100),
		TRIGGER_SECONDS: 10, // 10 seconds
		EXTENSION_DURATION: 10000, // 10 seconds
	},
} as const;

// Auction Status Transition Rules
export const AUCTION_STATUS_TRANSITIONS = {
	DRAFT: ["scheduled", "cancelled"],
	SCHEDULED: ["active", "cancelled"],
	ACTIVE: ["paused", "completed", "cancelled"],
	PAUSED: ["active", "cancelled"],
	COMPLETED: [], // Terminal state
	CANCELLED: [], // Terminal state
	SUSPENDED: ["active", "cancelled"],
} as const;

// Bid Status Rules
export const BID_STATUS_RULES = {
	ACTIVE: ["retracted", "outbid", "winning", "losing"],
	RETRACTED: [], // Terminal state
	OUTBID: ["active"], // Can re-bid
	WINNING: ["losing"], // Can lose if outbid
	LOSING: ["winning"], // Can win if others retract
} as const;

// Currency Constants
export const CURRENCIES = {
	USD: "USD",
	EUR: "EUR",
	GBP: "GBP",
	JPY: "JPY",
	CAD: "CAD",
	AUD: "AUD",
	CHF: "CHF",
	CNY: "CNY",
} as const;

// Supported Auction Types
export const AUCTION_TYPES = {
	ENGLISH: "english",
	DUTCH: "dutch",
	SEALED_BID: "sealed_bid",
	REVERSE: "reverse",
	VICKREY: "vickrey",
	BUY_IT_NOW: "buy_it_now",
	DOUBLE: "double",
	ALL_PAY: "all_pay",
	JAPANESE: "japanese",
	CHINESE: "chinese",
	PENNY: "penny",
	MULTI_UNIT: "multi_unit",
	COMBINATORIAL: "combinatorial",
} as const;

// User Roles
export const USER_ROLES = {
	BIDDER: "bidder",
	SELLER: "seller",
	ADMIN: "admin",
	MODERATOR: "moderator",
	SYSTEM: "system",
} as const;

// Account Status Values
export const ACCOUNT_STATUSES = {
	ACTIVE: "active",
	SUSPENDED: "suspended",
	DEACTIVATED: "deactivated",
	PENDING_VERIFICATION: "pending_verification",
	BANNED: "banned",
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
	AUCTION_STARTED: "auction_started",
	AUCTION_ENDED: "auction_ended",
	BID_PLACED: "bid_placed",
	OUTBID: "outbid",
	AUCTION_EXTENDED: "auction_extended",
	WINNER_ANNOUNCED: "winner_announced",
	PAYMENT_DUE: "payment_due",
	ITEM_SHIPPED: "item_shipped",
	SYSTEM_ALERT: "system_alert",
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
	LOW: "low",
	NORMAL: "normal",
	HIGH: "high",
	URGENT: "urgent",
	CRITICAL: "critical",
} as const;

// Validation Rules
export const VALIDATION_RULES = {
	USERNAME: {
		MIN_LENGTH: 3,
		MAX_LENGTH: 50,
		PATTERN: /^[a-zA-Z0-9_]+$/,
	},
	EMAIL: {
		MAX_LENGTH: 255,
		PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	},
	PASSWORD: {
		MIN_LENGTH: 8,
		MAX_LENGTH: 128,
		REQUIRE_UPPERCASE: true,
		REQUIRE_LOWERCASE: true,
		REQUIRE_NUMBERS: true,
		REQUIRE_SPECIAL_CHARS: true,
	},
	AUCTION_TITLE: {
		MIN_LENGTH: 5,
		MAX_LENGTH: 255,
	},
	AUCTION_DESCRIPTION: {
		MAX_LENGTH: 5000,
	},
} as const;

// Performance Constants
export const PERFORMANCE_LIMITS = {
	MAX_CONCURRENT_AUCTIONS: 10000,
	MAX_BIDS_PER_SECOND: 1000,
	MAX_CONNECTIONS_PER_USER: 5,
	MAX_NOTIFICATIONS_PER_MINUTE: 100,
	CACHE_TTL_SECONDS: {
		AUCTION_STATE: 30,
		BID_HISTORY: 60,
		USER_PROFILE: 300,
		SYSTEM_CONFIG: 600,
	},
} as const;

// Error Codes
export const ERROR_CODES = {
	// Auction Errors
	AUCTION_NOT_FOUND: "AUCTION_NOT_FOUND",
	AUCTION_NOT_ACTIVE: "AUCTION_NOT_ACTIVE",
	AUCTION_ALREADY_ENDED: "AUCTION_ALREADY_ENDED",
	AUCTION_INVALID_TRANSITION: "AUCTION_INVALID_TRANSITION",

	// Bid Errors
	BID_INVALID_AMOUNT: "BID_INVALID_AMOUNT",
	BID_TOO_LOW: "BID_TOO_LOW",
	BID_TOO_HIGH: "BID_TOO_HIGH",
	BID_NOT_ALLOWED: "BID_NOT_ALLOWED",
	BID_RETRACTED: "BID_RETRACTED",

	// User Errors
	USER_NOT_FOUND: "USER_NOT_FOUND",
	USER_NOT_AUTHORIZED: "USER_NOT_AUTHORIZED",
	USER_SUSPENDED: "USER_SUSPENDED",
	USER_NOT_VERIFIED: "USER_NOT_VERIFIED",

	// System Errors
	DATABASE_ERROR: "DATABASE_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
} as const;

// Rate Limiting
export const RATE_LIMITS = {
	BID_PLACEMENT: {
		WINDOW_MS: 60000, // 1 minute
		MAX_REQUESTS: 30,
	},
	AUCTION_CREATION: {
		WINDOW_MS: 3600000, // 1 hour
		MAX_REQUESTS: 10,
	},
	USER_REGISTRATION: {
		WINDOW_MS: 86400000, // 24 hours
		MAX_REQUESTS: 5,
	},
} as const;

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
	PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100,
	DEFAULT_PAGE: 1,
} as const;

// Sorting Options
export const SORT_OPTIONS = {
	AUCTIONS: {
		END_TIME_ASC: "end_time_asc",
		END_TIME_DESC: "end_time_desc",
		STARTING_PRICE_ASC: "starting_price_asc",
		STARTING_PRICE_DESC: "starting_price_desc",
		TITLE_ASC: "title_asc",
		TITLE_DESC: "title_desc",
		CREATED_AT_DESC: "created_at_desc",
	},
	BIDS: {
		AMOUNT_DESC: "amount_desc",
		AMOUNT_ASC: "amount_asc",
		TIMESTAMP_DESC: "timestamp_desc",
		TIMESTAMP_ASC: "timestamp_asc",
	},
} as const;

// File Upload Limits
export const FILE_UPLOAD_LIMITS = {
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
	MAX_IMAGES_PER_ITEM: 10,
	ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
	ALLOWED_DOCUMENT_TYPES: ["application/pdf", "image/jpeg", "image/png"],
} as const;

// Geographic Constants
export const GEOGRAPHIC_LIMITS = {
	MAX_SHIPPING_ZONES: 50,
	SUPPORTED_COUNTRIES: [
		"US",
		"CA",
		"GB",
		"DE",
		"FR",
		"IT",
		"ES",
		"AU",
		"JP",
		"CN",
		"IN",
		"BR",
		"MX",
		"NL",
		"BE",
		"CH",
		"AT",
		"SE",
		"NO",
		"DK",
	],
	DEFAULT_CURRENCY_BY_COUNTRY: {
		US: "USD",
		CA: "CAD",
		GB: "GBP",
		EU: "EUR",
		JP: "JPY",
		AU: "AUD",
		CH: "CHF",
		CN: "CNY",
		IN: "INR",
		BR: "BRL",
	} as Record<string, string>,
} as const;

// Security Constants
export const SECURITY_CONFIG = {
	PASSWORD_HASH_ROUNDS: 12,
	JWT_EXPIRY_SECONDS: 3600, // 1 hour
	REFRESH_TOKEN_EXPIRY_SECONDS: 604800, // 7 days
	MAX_LOGIN_ATTEMPTS: 5,
	ACCOUNT_LOCKOUT_MINUTES: 30,
	SESSION_TIMEOUT_MINUTES: 480, // 8 hours
	PASSWORD_RESET_EXPIRY_MINUTES: 15,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
	ENABLE_PROXY_BIDDING: true,
	ENABLE_ANONYMOUS_BIDDING: true,
	ENABLE_REAL_TIME_NOTIFICATIONS: true,
	ENABLE_AUCTION_EXTENSIONS: true,
	ENABLE_BID_RETRACTION: true,
	ENABLE_COMBINATORIAL_AUCTIONS: false, // Disabled until implemented
	ENABLE_MULTI_UNIT_AUCTIONS: true,
	ENABLE_PENNY_AUCTIONS: true,
	ENABLE_JAPANESE_AUCTIONS: true,
	ENABLE_CHINESE_AUCTIONS: true,
} as const;

// API Configuration
export const API_CONFIG = {
	DEFAULT_PORT: 3000,
	API_VERSION: "v1",
	REQUEST_TIMEOUT_MS: 30000,
	MAX_REQUEST_SIZE: "50mb",
	CORS_ORIGINS: ["http://localhost:3000", "http://localhost:3001"],
	ENABLE_API_DOCUMENTATION: true,
	ENABLE_REQUEST_LOGGING: true,
} as const;

// Monitoring and Metrics
export const MONITORING_CONFIG = {
	ENABLE_METRICS_COLLECTION: true,
	METRICS_RETENTION_DAYS: 30,
	SLOW_QUERY_THRESHOLD_MS: 1000,
	HIGH_ERROR_RATE_THRESHOLD: 0.05,
	ENABLE_PERFORMANCE_PROFILING: false,
	LOG_LEVEL: "info",
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
	DEFAULT_TTL_SECONDS: 300,
	MAX_CACHE_SIZE: 1000,
	ENABLE_CACHE_COMPRESSION: true,
	CACHE_KEY_PREFIX: "auction_engine:",
} as const;

// Database Configuration Defaults
export const DATABASE_DEFAULTS = {
	CONNECTION_POOL: {
		MIN: 2,
		MAX: 20,
		ACQUIRE_TIMEOUT_MS: 60000,
		IDLE_TIMEOUT_MS: 30000,
	},
	QUERY_TIMEOUT_MS: 30000,
	CONNECTION_TIMEOUT_MS: 10000,
	RETRY_ATTEMPTS: 3,
	RETRY_DELAY_MS: 1000,
} as const;

// Business Rule Defaults
export const BUSINESS_RULE_DEFAULTS = {
	MIN_BID_INCREMENT_PERCENTAGE: 0.05, // 5%
	MAX_BID_INCREMENT_PERCENTAGE: 0.2, // 20%
	RESERVE_PRICE_PERCENTAGE: 0.8, // 80% of estimated value
	ANTI_SNIPING_EXTENSION_MINUTES: 2,
	MAX_AUCTION_EXTENSIONS: 5,
	BID_RETRACTION_GRACE_MINUTES: 5,
} as const;

// Export type-safe constants
export type AuctionDurationPreset = keyof typeof AUCTION_DURATION;
export type TimeExtensionPreset = keyof typeof TIME_EXTENSION;
export type BidTimeoutPreset = keyof typeof BID_TIMEOUT;
export type PriceIncrementPreset = keyof typeof PRICE_INCREMENT;
export type CurrencyCode = keyof typeof CURRENCIES;
export type AuctionTypeCode = keyof typeof AUCTION_TYPES;
export type UserRoleCode = keyof typeof USER_ROLES;
export type NotificationTypeCode = keyof typeof NOTIFICATION_TYPES;
export type ErrorCode = keyof typeof ERROR_CODES;

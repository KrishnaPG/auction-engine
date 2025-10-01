# Core Auction Tables Schema Design

## Overview
This document defines the core database schema for auction management, supporting all 13 auction types with a flexible, database-agnostic design.

## 1. auctions

**Purpose**: Central table storing auction instances with type-specific configurations and lifecycle management.

**Key Columns**:
- `auction_id` (UUID, PRIMARY KEY) - Unique auction identifier
- `auction_type` (ENUM) - Type: english, dutch, sealed_bid, reverse, vickrey, buy_it_now, double, all_pay, japanese, chinese, penny, multi_unit, combinatorial
- `title` (VARCHAR(255), NOT NULL) - Auction title/description
- `description` (TEXT, NULLABLE) - Detailed auction description
- `status` (ENUM, NOT NULL) - Status: draft, scheduled, active, paused, completed, cancelled, suspended
- `start_time` (TIMESTAMP, NOT NULL) - When auction begins
- `end_time` (TIMESTAMP, NOT NULL) - When auction ends
- `actual_end_time` (TIMESTAMP, NULLABLE) - Actual end time (for extended auctions)
- `starting_price` (DECIMAL(15,2), NOT NULL) - Initial price
- `current_price` (DECIMAL(15,2), NULLABLE) - Current highest bid (for English/Vickrey)
- `reserve_price` (DECIMAL(15,2), NULLABLE) - Minimum acceptable price
- `min_bid_increment` (DECIMAL(15,2), NOT NULL) - Minimum bid increase amount
- `max_auto_extensions` (INTEGER, DEFAULT 0) - Maximum automatic extensions allowed
- `extension_trigger_seconds` (INTEGER, DEFAULT 0) - Seconds before end to trigger extension
- `extension_duration_seconds` (INTEGER, DEFAULT 0) - Duration to extend when triggered
- `created_by` (UUID, NOT NULL) - User who created the auction
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp
- `version` (INTEGER, DEFAULT 1) - Optimistic locking version

**Primary Key**: `auction_id`

**Foreign Keys**:
- `created_by` → `users.user_id`

**Indexes**:
- `idx_auctions_status` (status) - For filtering active auctions
- `idx_auctions_type` (auction_type) - For auction type queries
- `idx_auctions_time` (start_time, end_time) - For time-based queries
- `idx_auctions_price` (current_price, reserve_price) - For price-based filtering
- `idx_auctions_creator` (created_by) - For user auction queries
- `idx_auctions_composite` (status, auction_type, start_time) - For dashboard queries

**Special Considerations**:
- **Penny Auction**: Requires time extension tracking and bid fee management
- **Multi-Unit**: Supports quantity fields for multiple identical items
- **Combinatorial**: Requires package/bundling support in related tables
- **Dutch/Chinese**: Needs price decrement tracking
- **Japanese**: Requires round-based bidding support

## 2. auction_items

**Purpose**: Items being auctioned, supporting single and multi-item auctions with detailed metadata.

**Key Columns**:
- `item_id` (UUID, PRIMARY KEY) - Unique item identifier
- `auction_id` (UUID, NOT NULL) - Associated auction
- `title` (VARCHAR(255), NOT NULL) - Item title
- `description` (TEXT, NULLABLE) - Detailed item description
- `category` (VARCHAR(100), NULLABLE) - Item category classification
- `condition` (ENUM, NULLABLE) - Condition: new, used, refurbished, damaged
- `quantity` (INTEGER, DEFAULT 1) - Quantity available (for multi-unit auctions)
- `min_quantity` (INTEGER, DEFAULT 1) - Minimum quantity per bid (multi-unit)
- `max_quantity` (INTEGER, DEFAULT 1) - Maximum quantity per bid (multi-unit)
- `images` (JSON, NULLABLE) - Array of image URLs/metadata
- `specifications` (JSON, NULLABLE) - Technical specifications as key-value pairs
- `location` (VARCHAR(255), NULLABLE) - Physical location for pickup/shipping
- `shipping_info` (JSON, NULLABLE) - Shipping options and costs
- `starting_bid` (DECIMAL(15,2), NULLABLE) - Starting bid per item
- `buy_it_now_price` (DECIMAL(15,2), NULLABLE) - Buy It Now price (for hybrid auctions)
- `fair_market_value` (DECIMAL(15,2), NULLABLE) - Estimated market value
- `custom_fields` (JSON, NULLABLE) - Auction-type specific custom fields
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `item_id`

**Foreign Keys**:
- `auction_id` → `auctions.auction_id`

**Indexes**:
- `idx_auction_items_auction` (auction_id) - For auction item queries
- `idx_auction_items_category` (category) - For category-based searches
- `idx_auction_items_price` (starting_bid, buy_it_now_price) - For price filtering
- `idx_auction_items_quantity` (quantity, min_quantity, max_quantity) - For multi-unit queries

**Special Considerations**:
- **Multi-Unit**: Quantity fields enable multiple identical items
- **Combinatorial**: Package relationships stored in separate table
- **Buy-It-Now**: BIN price field for hybrid auction support
- **Image Management**: JSON structure supports multiple images with metadata

## 3. auction_configurations

**Purpose**: Type-specific configuration parameters that control auction behavior and business rules.

**Key Columns**:
- `config_id` (UUID, PRIMARY KEY) - Unique configuration identifier
- `auction_id` (UUID, NOT NULL) - Associated auction
- `config_type` (VARCHAR(50), NOT NULL) - Configuration category
- `config_key` (VARCHAR(100), NOT NULL) - Configuration parameter name
- `config_value` (JSON, NOT NULL) - Configuration value (JSON for flexibility)
- `data_type` (VARCHAR(20), NOT NULL) - Value type: string, number, boolean, json, array
- `is_system_config` (BOOLEAN, DEFAULT FALSE) - Whether this is system-level config
- `is_editable` (BOOLEAN, DEFAULT TRUE) - Whether users can modify this config
- `validation_rules` (JSON, NULLABLE) - Rules for validating config values
- `description` (TEXT, NULLABLE) - Human-readable description
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `config_id`

**Foreign Keys**:
- `auction_id` → `auctions.auction_id`

**Unique Constraint**:
- `uq_auction_config` (auction_id, config_key) - One config per key per auction

**Indexes**:
- `idx_auction_configs_auction` (auction_id) - For auction configuration queries
- `idx_auction_configs_type` (config_type) - For configuration type filtering
- `idx_auction_configs_system` (is_system_config) - For system vs user configs

**Special Considerations**:
- **Flexible Configuration**: JSON values support complex nested configurations
- **Type-Specific Rules**: Different auction types have different required configurations
- **Validation Support**: Built-in validation rules for configuration integrity
- **Extensibility**: Easy to add new configuration parameters without schema changes

## Common Configuration Examples by Auction Type

### English Auction
```json
{
  "min_bid_increment": "10.00",
  "max_bids_per_user": null,
  "allow_bid_retraction": false,
  "auto_extend_auction": true,
  "extend_time_seconds": 300
}
```

### Dutch Auction
```json
{
  "price_decrement_amount": "5.00",
  "decrement_interval_seconds": 30,
  "minimum_price": "50.00",
  "starting_price": "500.00"
}
```

### Vickrey Auction
```json
{
  "reveal_bids_at_end": true,
  "allow_proxy_bidding": false,
  "second_price_payment": true
}
```

### Penny Auction
```json
{
  "bid_fee_amount": "0.50",
  "time_extension_seconds": 10,
  "max_extensions": 100,
  "bid_fee_currency": "USD"
}
```

### Combinatorial Auction
```json
{
  "allow_package_bidding": true,
  "max_package_size": 10,
  "complementarity_rules": {},
  "package_valuation_method": "additive"
}
```

## Design Principles

1. **Database Agnostic**: Uses standard SQL types that work across PostgreSQL, MySQL, SQLite
2. **Immutability Support**: Version fields and audit trails for historical tracking
3. **Performance Optimized**: Strategic indexes for common query patterns
4. **Scalability**: Supports concurrent auctions and high-throughput bidding
5. **Flexibility**: JSON fields allow for auction-type specific customizations
6. **Audit Trail**: All timestamp and version fields support comprehensive logging

## Relationships

```
auctions (1) ──── (M) auction_items
   │
   └─── (1) ──── (M) auction_configurations
```

This core schema provides a solid foundation for all 13 auction types while maintaining flexibility for future enhancements and auction-specific customizations.
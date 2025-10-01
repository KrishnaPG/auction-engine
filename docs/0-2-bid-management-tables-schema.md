# Bid Management Tables Schema Design

## Overview
This document defines the database schema for comprehensive bid management, supporting real-time bidding, audit trails, and all 13 auction types with their specific requirements.

## 1. bids

**Purpose**: Core table storing all bids with support for different auction types, proxy bidding, and multi-unit quantities.

**Key Columns**:
- `bid_id` (UUID, PRIMARY KEY) - Unique bid identifier
- `auction_id` (UUID, NOT NULL) - Associated auction
- `item_id` (UUID, NULLABLE) - Specific item (for multi-item auctions)
- `user_id` (UUID, NOT NULL) - Bidder user ID
- `bid_amount` (DECIMAL(15,2), NOT NULL) - Bid amount per unit
- `quantity` (INTEGER, DEFAULT 1) - Quantity of items/units being bid on
- `total_amount` (DECIMAL(15,2), NOT NULL) - Total bid value (amount × quantity)
- `bid_type` (ENUM, NOT NULL) - Type: regular, proxy, package, all_or_nothing
- `max_proxy_amount` (DECIMAL(15,2), NULLABLE) - Maximum amount for proxy bidding
- `package_items` (JSON, NULLABLE) - Item IDs for package bids (combinatorial)
- `package_bid_amount` (DECIMAL(15,2), NULLABLE) - Total for package (combinatorial)
- `status` (ENUM, NOT NULL) - Status: active, retracted, outbid, winning, losing
- `bid_source` (ENUM, NOT NULL) - Source: web, api, proxy, system
- `ip_address` (INET, NULLABLE) - Bidder's IP address for fraud detection
- `user_agent` (TEXT, NULLABLE) - Browser/client information
- `is_anonymous` (BOOLEAN, DEFAULT FALSE) - Whether bid is anonymous (sealed-bid)
- `bid_fee_amount` (DECIMAL(15,2), DEFAULT 0) - Fee charged for this bid (penny auctions)
- `submitted_at` (TIMESTAMP, NOT NULL) - When bid was submitted
- `processed_at` (TIMESTAMP, NULLABLE) - When bid was processed by system
- `created_at` (TIMESTAMP, NOT NULL) - Record creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp
- `version` (INTEGER, DEFAULT 1) - Optimistic locking version

**Primary Key**: `bid_id`

**Foreign Keys**:
- `auction_id` → `auctions.auction_id`
- `item_id` → `auction_items.item_id` (nullable for single-item auctions)
- `user_id` → `users.user_id`

**Indexes**:
- `idx_bids_auction` (auction_id) - For auction bid queries
- `idx_bids_user` (user_id) - For user bid history
- `idx_bids_item` (item_id) - For item-specific bids
- `idx_bids_amount` (bid_amount) - For price-based queries
- `idx_bids_status` (status) - For filtering active bids
- `idx_bids_time` (submitted_at) - For time-based bid analysis
- `idx_bids_type` (bid_type) - For bid type filtering
- `idx_bids_composite` (auction_id, status, submitted_at) - For real-time auction queries
- `idx_bids_proxy` (auction_id, max_proxy_amount) - For proxy bidding queries
- `idx_bids_winning` (auction_id, status, bid_amount DESC) - For winner determination

**Special Considerations**:
- **Proxy Bidding**: `max_proxy_amount` enables automatic bidding up to specified limit
- **Multi-Unit**: `quantity` field supports bidding on multiple identical items
- **Combinatorial**: `package_items` JSON stores item combinations for package bids
- **Penny Auctions**: `bid_fee_amount` tracks fees charged per bid
- **Sealed-Bid**: `is_anonymous` flag for privacy protection
- **Real-time Performance**: Composite indexes support fast bid retrieval and winner determination

## 2. bid_history

**Purpose**: Immutable audit trail of all bid state changes, supporting comprehensive tracking and rollback capabilities.

**Key Columns**:
- `history_id` (UUID, PRIMARY KEY) - Unique history record identifier
- `bid_id` (UUID, NOT NULL) - Associated bid
- `auction_id` (UUID, NOT NULL) - Associated auction (for quick queries)
- `event_type` (ENUM, NOT NULL) - Type: created, updated, retracted, outbid, won, lost
- `old_status` (ENUM, NULLABLE) - Previous bid status
- `new_status` (ENUM, NOT NULL) - New bid status
- `old_amount` (DECIMAL(15,2), NULLABLE) - Previous bid amount
- `new_amount` (DECIMAL(15,2), NOT NULL) - New bid amount
- `old_quantity` (INTEGER, NULLABLE) - Previous quantity
- `new_quantity` (INTEGER, NOT NULL) - New quantity
- `change_reason` (VARCHAR(255), NULLABLE) - Reason for change (outbid, retraction, etc.)
- `changed_by` (UUID, NULLABLE) - User/system that made the change
- `change_source` (ENUM, NOT NULL) - Source: user, proxy_system, auction_engine, admin
- `previous_history_id` (UUID, NULLABLE) - Link to previous history record for this bid
- `event_metadata` (JSON, NULLABLE) - Additional event-specific data
- `occurred_at` (TIMESTAMP, NOT NULL) - When the change occurred
- `created_at` (TIMESTAMP, NOT NULL) - Record creation timestamp

**Primary Key**: `history_id`

**Foreign Keys**:
- `bid_id` → `bids.bid_id`
- `auction_id` → `auctions.auction_id`
- `changed_by` → `users.user_id` (nullable for system changes)

**Indexes**:
- `idx_bid_history_bid` (bid_id) - For bid history queries
- `idx_bid_history_auction` (auction_id) - For auction history analysis
- `idx_bid_history_time` (occurred_at) - For time-based analysis
- `idx_bid_history_event` (event_type) - For event type filtering
- `idx_bid_history_chain` (bid_id, occurred_at) - For chronological bid history
- `idx_bid_history_user` (changed_by) - For user activity tracking

**Special Considerations**:
- **Immutability**: Append-only table for complete audit trail
- **Chain Tracking**: `previous_history_id` creates immutable chain of changes
- **Performance**: Separate from main bids table to avoid bloating active bid queries
- **Compliance**: Supports regulatory requirements for bid history retention
- **Debugging**: Complete metadata for troubleshooting bid disputes

## 3. bid_retractions

**Purpose**: Manages bid withdrawals within auction-specific time limits and business rules.

**Key Columns**:
- `retraction_id` (UUID, PRIMARY KEY) - Unique retraction identifier
- `bid_id` (UUID, NOT NULL) - Associated bid being retracted
- `auction_id` (UUID, NOT NULL) - Associated auction
- `user_id` (UUID, NOT NULL) - User requesting retraction
- `retraction_reason` (ENUM, NOT NULL) - Reason: time_limit, error, changed_mind, system
- `retraction_type` (ENUM, NOT NULL) - Type: full, partial, proxy_cancel
- `original_bid_amount` (DECIMAL(15,2), NOT NULL) - Original bid amount
- `retracted_amount` (DECIMAL(15,2), NOT NULL) - Amount being retracted
- `remaining_amount` (DECIMAL(15,2), NULLABLE) - Remaining bid amount (partial retractions)
- `retraction_deadline` (TIMESTAMP, NOT NULL) - Latest time retraction was allowed
- `requested_at` (TIMESTAMP, NOT NULL) - When retraction was requested
- `processed_at` (TIMESTAMP, NULLABLE) - When retraction was processed
- `status` (ENUM, NOT NULL) - Status: pending, approved, rejected, expired
- `admin_user_id` (UUID, NULLABLE) - Admin who approved/rejected (if required)
- `rejection_reason` (TEXT, NULLABLE) - Reason for rejection (if applicable)
- `refund_amount` (DECIMAL(15,2), DEFAULT 0) - Amount refunded to user
- `refund_status` (ENUM, DEFAULT 'none') - Refund status: none, pending, completed, failed
- `created_at` (TIMESTAMP, NOT NULL) - Record creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Primary Key**: `retraction_id`

**Foreign Keys**:
- `bid_id` → `bids.bid_id`
- `auction_id` → `auctions.auction_id`
- `user_id` → `users.user_id`
- `admin_user_id` → `users.user_id` (nullable)

**Indexes**:
- `idx_bid_retractions_bid` (bid_id) - For bid retraction queries
- `idx_bid_retractions_auction` (auction_id) - For auction retraction analysis
- `idx_bid_retractions_user` (user_id) - For user retraction history
- `idx_bid_retractions_status` (status) - For pending retraction processing
- `idx_bid_retractions_time` (requested_at) - For time-based retraction analysis
- `idx_bid_retractions_deadline` (retraction_deadline) - For deadline-based processing

**Special Considerations**:
- **Time Limits**: `retraction_deadline` enforces auction-specific retraction windows
- **Partial Retractions**: Support for reducing bid amounts rather than full withdrawal
- **Admin Approval**: Some auction types may require administrative approval
- **Refund Processing**: Tracks financial impact of retractions
- **Audit Trail**: Complete tracking for compliance and dispute resolution

## Auction Type Specific Bid Behaviors

### English Auction Bidding
```sql
-- Support for proxy bidding and bid increments
bid_type IN ('regular', 'proxy')
max_proxy_amount IS NOT NULL  -- For proxy bids
bid_amount >= current_price + min_bid_increment
```

### Vickrey Auction Bidding
```sql
-- Sealed bids, revealed only at auction end
is_anonymous = true
status = 'active'  -- Hidden until auction ends
```

### All-Pay Auction Bidding
```sql
-- All bidders pay their bid amount regardless of outcome
bid_fee_amount = bid_amount  -- Full amount charged
refund_amount = 0  -- No refunds for losers
```

### Penny Auction Bidding
```sql
-- Each bid costs money and extends auction time
bid_fee_amount > 0  -- Fee charged per bid
time_extension_triggered = true  -- Extends auction duration
```

### Multi-Unit Auction Bidding
```sql
-- Bidders specify quantity desired
quantity BETWEEN min_quantity AND max_quantity
total_amount = bid_amount * quantity
```

### Combinatorial Auction Bidding
```sql
-- Package bidding with complementarities
package_items IS NOT NULL
package_bid_amount IS NOT NULL
-- Winner determination considers package values vs individual items
```

## Design Principles

1. **Real-time Performance**: Optimized indexes for sub-millisecond bid queries
2. **Concurrency Control**: Supports thousands of concurrent bids
3. **Immutability**: Complete audit trail for all bid activities
4. **Flexibility**: JSON fields support auction-type specific requirements
5. **Scalability**: Partitioning strategy for high-volume auctions
6. **Compliance**: Full audit trail for regulatory requirements

## Relationships

```
auctions (1) ──── (M) bids
   │                    │
   │                    └─── (1) ──── (M) bid_history
   │                    │
   │                    └─── (1) ──── (M) bid_retractions
   │
   └─── (1) ──── (M) auction_items ──── (M) bids (for multi-item auctions)
```

This bid management schema provides comprehensive support for all 13 auction types while maintaining high performance, complete audit trails, and flexible configuration for complex bidding scenarios.
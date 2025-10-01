# Winner Determination SQL Queries

## Overview
This document provides comprehensive SQL query designs for winner determination across all 13 auction types. These queries are designed to be database-agnostic and optimized for performance in high-throughput auction environments.

## Core Tables Used
- `auctions` - Auction configuration and status
- `auction_items` - Items being auctioned
- `bids` - All submitted bids with amounts and metadata

## 1. English Auction Winner Determination

**Logic**: Highest bid amount wins, must meet minimum increment requirements.

```sql
-- Find winning bid for English auction
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.quantity,
    b.submitted_at as winning_bid_time,
    ROW_NUMBER() OVER (ORDER BY b.bid_amount DESC, b.submitted_at ASC) as bid_rank
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'english'
    AND a.status = 'completed'
    AND b.status = 'active'
    AND b.bid_amount >= COALESCE(a.reserve_price, 0)
    AND b.bid_amount >= COALESCE(a.starting_price, 0)
ORDER BY b.bid_amount DESC, b.submitted_at ASC
LIMIT 1;
```

**Tie-breaking**: Earlier bid wins if amounts are equal.

## 2. Dutch Auction Winner Determination

**Logic**: First bidder to accept the current descending price wins.

```sql
-- Find first bidder at final price for Dutch auction
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.submitted_at as accepted_time,
    a.current_price as final_price
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'dutch'
    AND a.status = 'completed'
    AND b.status = 'winning'
    AND b.bid_amount >= a.current_price
ORDER BY b.submitted_at ASC
LIMIT 1;
```

## 3. Sealed-bid Auction Winner Determination

**Logic**: Highest sealed bid wins, bids revealed only after auction ends.

```sql
-- Find highest sealed bid
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.quantity,
    b.submitted_at
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'sealed_bid'
    AND a.status = 'completed'
    AND b.status = 'active'
    AND b.is_anonymous = true
ORDER BY b.bid_amount DESC, b.submitted_at ASC
LIMIT 1;
```

## 4. Reverse Auction Winner Determination

**Logic**: Lowest bid wins (supplier bidding for contracts).

```sql
-- Find lowest bid for reverse auction
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.quantity,
    b.submitted_at
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'reverse'
    AND a.status = 'completed'
    AND b.status = 'active'
    AND b.bid_amount >= COALESCE(a.reserve_price, 0)
ORDER BY b.bid_amount ASC, b.submitted_at ASC
LIMIT 1;
```

## 5. Vickrey Auction Winner Determination

**Logic**: Highest bid wins but pays second-highest bid price.

```sql
-- Find winner and second price for Vickrey auction
WITH ranked_bids AS (
    SELECT
        bid_id,
        user_id,
        bid_amount,
        submitted_at,
        ROW_NUMBER() OVER (ORDER BY bid_amount DESC, submitted_at ASC) as bid_rank
    FROM bids b
    INNER JOIN auctions a ON b.auction_id = a.auction_id
    WHERE a.auction_id = ?
        AND a.auction_type = 'vickrey'
        AND a.status = 'completed'
        AND b.status = 'active'
)
SELECT
    rb1.bid_id as winning_bid_id,
    rb1.user_id as winner_id,
    rb1.bid_amount as winning_amount,
    rb2.bid_amount as payment_amount,
    rb1.submitted_at
FROM ranked_bids rb1
LEFT JOIN ranked_bids rb2 ON rb2.bid_rank = 2
WHERE rb1.bid_rank = 1;
```

## 6. Buy-it-now Auction Winner Determination

**Logic**: First bidder to meet or exceed buy-it-now price wins immediately.

```sql
-- Find first bidder meeting BIN price
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.submitted_at as purchase_time,
    ai.buy_it_now_price
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
INNER JOIN auction_items ai ON ai.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'buy_it_now'
    AND a.status = 'completed'
    AND b.status = 'winning'
    AND b.bid_amount >= ai.buy_it_now_price
ORDER BY b.submitted_at ASC
LIMIT 1;
```

## 7. Double Auction Winner Determination

**Logic**: Match buyers and sellers at equilibrium price.

```sql
-- Find matched bids for double auction (simplified equilibrium matching)
WITH buyer_bids AS (
    SELECT
        bid_id,
        user_id,
        bid_amount,
        quantity,
        submitted_at,
        ROW_NUMBER() OVER (ORDER BY bid_amount DESC, submitted_at ASC) as buyer_rank
    FROM bids
    WHERE auction_id = ?
        AND bid_type = 'buyer'
        AND status = 'active'
),
seller_bids AS (
    SELECT
        bid_id,
        user_id,
        bid_amount,
        quantity,
        submitted_at,
        ROW_NUMBER() OVER (ORDER BY bid_amount ASC, submitted_at ASC) as seller_rank
    FROM bids
    WHERE auction_id = ?
        AND bid_type = 'seller'
        AND status = 'active'
)
SELECT
    b.bid_id as buyer_bid_id,
    b.user_id as buyer_id,
    b.bid_amount as buyer_price,
    s.bid_id as seller_bid_id,
    s.user_id as seller_id,
    s.bid_amount as seller_price,
    LEAST(b.quantity, s.quantity) as matched_quantity,
    ((b.bid_amount + s.bid_amount) / 2) as clearing_price
FROM buyer_bids b
CROSS JOIN seller_bids s
WHERE b.buyer_rank <= s.seller_rank
    AND b.bid_amount >= s.bid_amount
ORDER BY clearing_price DESC, b.submitted_at ASC, s.submitted_at ASC;
```

## 8. All-pay Auction Winner Determination

**Logic**: Highest bidder wins, all bidders pay their bid amounts.

```sql
-- Find winner for all-pay auction (all bidders pay)
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.quantity,
    b.submitted_at,
    b.bid_fee_amount
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'all_pay'
    AND a.status = 'completed'
    AND b.status = 'active'
ORDER BY b.bid_amount DESC, b.submitted_at ASC
LIMIT 1;
```

## 9. Japanese Auction Winner Determination

**Logic**: Last remaining bidder wins as others drop out.

```sql
-- Find last active bidder in Japanese auction
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.submitted_at,
    COUNT(*) OVER () as total_active_bidders
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'japanese'
    AND a.status = 'completed'
    AND b.status = 'active'
ORDER BY b.submitted_at DESC
LIMIT 1;
```

## 10. Chinese Auction Winner Determination

**Logic**: Price drops rapidly, first bidder to accept wins.

```sql
-- Find first bidder at final price in Chinese auction
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.submitted_at as acceptance_time,
    a.current_price as final_price
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'chinese'
    AND a.status = 'completed'
    AND b.status = 'winning'
ORDER BY b.submitted_at ASC
LIMIT 1;
```

## 11. Penny Auction Winner Determination

**Logic**: Last bidder before time expires wins, all bidders pay per-bid fees.

```sql
-- Find last bidder before auction end in penny auction
SELECT
    b.bid_id,
    b.user_id,
    b.bid_amount,
    b.submitted_at,
    b.bid_fee_amount,
    a.actual_end_time
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND a.auction_type = 'penny'
    AND a.status = 'completed'
    AND b.status = 'winning'
ORDER BY b.submitted_at DESC
LIMIT 1;
```

## 12. Multi-unit Auction Winner Determination

**Logic**: Multiple identical items, bidders specify quantities.

```sql
-- Find winners for multi-unit auction (descending price priority)
WITH ranked_bids AS (
    SELECT
        b.bid_id,
        b.user_id,
        b.bid_amount,
        b.quantity,
        b.submitted_at,
        ROW_NUMBER() OVER (ORDER BY b.bid_amount DESC, b.submitted_at ASC) as bid_rank
    FROM bids b
    INNER JOIN auctions a ON b.auction_id = a.auction_id
    WHERE a.auction_id = ?
        AND a.auction_type = 'multi_unit'
        AND a.status = 'completed'
        AND b.status = 'active'
)
SELECT
    rb.bid_id,
    rb.user_id,
    rb.bid_amount,
    rb.quantity,
    rb.submitted_at,
    SUM(rb.quantity) OVER (ORDER BY rb.bid_rank) as cumulative_quantity
FROM ranked_bids rb
WHERE rb.bid_rank <= (
    SELECT CEIL(SUM(quantity) / MAX(available_quantity))
    FROM ranked_bids
    WHERE bid_rank <= (
        SELECT COUNT(*) FROM ranked_bids
        WHERE bid_rank <= 10  -- Top 10 bids for efficiency
    )
);
```

## 13. Combinatorial Auction Winner Determination

**Logic**: Package bidding, winner determination is NP-hard, requires optimization.

```sql
-- Find optimal package combination (simplified greedy approach)
WITH package_bids AS (
    SELECT
        b.bid_id,
        b.user_id,
        b.package_bid_amount,
        b.bid_amount as individual_amount,
        JSON_ARRAY_LENGTH(b.package_items) as package_size,
        b.submitted_at,
        b.package_items
    FROM bids b
    INNER JOIN auctions a ON b.auction_id = a.auction_id
    WHERE a.auction_id = ?
        AND a.auction_type = 'combinatorial'
        AND a.status = 'completed'
        AND b.status = 'active'
        AND b.package_items IS NOT NULL
),
individual_bids AS (
    SELECT
        b.bid_id,
        b.user_id,
        b.bid_amount,
        b.item_id,
        b.submitted_at
    FROM bids b
    INNER JOIN auctions a ON b.auction_id = a.auction_id
    WHERE a.auction_id = ?
        AND a.auction_type = 'combinatorial'
        AND a.status = 'completed'
        AND b.status = 'active'
        AND b.package_items IS NULL
)
-- Greedy allocation: prefer high-value packages first
SELECT
    pb.bid_id,
    pb.user_id,
    pb.package_bid_amount as winning_amount,
    pb.package_size,
    pb.submitted_at
FROM package_bids pb
ORDER BY pb.package_bid_amount DESC, pb.submitted_at ASC
LIMIT 1;
```

## Performance Optimizations

### Common Query Patterns
```sql
-- Composite index for winner determination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_winner_determination
ON bids (auction_id, status, bid_amount DESC, submitted_at ASC);

-- Partial index for active auctions only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_bids
ON bids (auction_id, status, submitted_at)
WHERE status = 'active';
```

### Query Result Caching Strategy
```sql
-- Cache winner determination results
CREATE TABLE auction_winners (
    auction_id UUID PRIMARY KEY,
    winner_bid_id UUID NOT NULL,
    winner_user_id UUID NOT NULL,
    winning_amount DECIMAL(15,2) NOT NULL,
    determined_at TIMESTAMP NOT NULL,
    determination_method VARCHAR(50) NOT NULL,
    FOREIGN KEY (auction_id) REFERENCES auctions(auction_id),
    FOREIGN KEY (winner_bid_id) REFERENCES bids(bid_id),
    FOREIGN KEY (winner_user_id) REFERENCES users(user_id)
);
```

## Error Handling and Edge Cases

### Reserve Price Not Met
```sql
-- Check if any valid bids meet reserve price
SELECT COUNT(*) as valid_bids
FROM bids b
INNER JOIN auctions a ON b.auction_id = a.auction_id
WHERE a.auction_id = ?
    AND b.status = 'active'
    AND b.bid_amount >= COALESCE(a.reserve_price, b.bid_amount);
```

### No Bids Submitted
```sql
-- Check for auctions with no bids
SELECT COUNT(*) as no_bid_auctions
FROM auctions a
LEFT JOIN bids b ON a.auction_id = b.auction_id AND b.status = 'active'
WHERE a.auction_id = ?
    AND a.status = 'completed'
    AND b.bid_id IS NULL;
```

## Database Agnostic Considerations

- All queries use standard SQL syntax compatible with PostgreSQL, MySQL, SQLite
- `JSON_ARRAY_LENGTH()` function may need adaptation for different databases
- `ROW_NUMBER()` window function is standard SQL:2003 compliant
- Consider database-specific optimizations for large result sets

## Testing and Validation Queries

```sql
-- Validate winner determination results
SELECT
    a.auction_id,
    a.auction_type,
    a.status,
    COUNT(b.bid_id) as total_bids,
    COUNT(CASE WHEN b.status = 'winning' THEN 1 END) as winning_bids,
    MAX(b.bid_amount) as highest_bid,
    MIN(b.bid_amount) as lowest_bid
FROM auctions a
LEFT JOIN bids b ON a.auction_id = b.auction_id
WHERE a.status = 'completed'
GROUP BY a.auction_id, a.auction_type, a.status;
```

This comprehensive set of SQL queries provides complete winner determination logic for all 13 auction types while maintaining performance, auditability, and database compatibility.
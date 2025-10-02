/** biome-ignore-all lint/complexity/noStaticOnlyClass: namespace */
import { sql } from "drizzle-orm";
import { db } from "./drizzle-adapter";

export class WinnerViews {
  // Create a simple view for determining winners on demand
  static async createWinnerDeterminationView(): Promise<void> {
    await db.execute(sql`
      CREATE OR REPLACE VIEW v_auction_winners AS
      WITH ranked_bids AS (
        SELECT
          b.id as bid_id,
          b.auction_id,
          b.bidder_id,
          b.amount,
          b.quantity,
          b.timestamp,
          a.type as auction_type,
          a.starting_price,
          a.reserve_price,
          a.current_price,
          ROW_NUMBER() OVER (
            PARTITION BY b.auction_id
            ORDER BY
              CASE a.type
                -- Standard auctions: highest bid wins
                WHEN 'english' THEN b.amount DESC
                WHEN 'sealed_bid' THEN b.amount DESC
                WHEN 'buy_it_now' THEN b.amount DESC
                WHEN 'penny' THEN b.amount DESC
                WHEN 'combinatorial' THEN (b.amount * b.quantity) DESC
                
                -- Price-based auctions: lowest bid wins
                WHEN 'dutch' THEN b.amount ASC
                WHEN 'reverse' THEN b.amount ASC
                WHEN 'japanese' THEN b.amount ASC
                WHEN 'chinese' THEN b.amount ASC
                
                -- Special auctions
                WHEN 'vickrey' THEN b.amount DESC -- Second price wins
                WHEN 'multi_unit' THEN (b.amount * b.quantity) DESC -- Market clearing
                WHEN 'all_pay' THEN b.amount DESC -- All pay
                
                -- Fallback
                ELSE b.amount DESC
              END,
              b.timestamp ASC
          ) as bid_rank,
          COUNT(*) OVER (PARTITION BY b.auction_id) as total_bids,
          MAX(b.amount) OVER (PARTITION BY b.auction_id) as highest_bid,
          MIN(b.amount) OVER (PARTITION BY b.auction_id) as lowest_bid,
          AVG(b.amount) OVER (PARTITION BY b.auction_id) as average_bid
        FROM bids b
        INNER JOIN auctions a ON b.auction_id = a.id
        WHERE b.status = 'active' AND a.status = 'completed'
      ),
      vickrey_prices AS (
        SELECT
          auction_id,
          amount,
          LAG(amount, 1, starting_price) OVER (
            PARTITION BY auction_id
            ORDER BY amount DESC
          ) as second_highest_price
        FROM (
          SELECT DISTINCT ON (auction_id, amount)
            auction_id, amount
          FROM bids
          WHERE status = 'active'
          ORDER BY auction_id, amount DESC
        ) t
      ),
      multi_unit_analysis AS (
        SELECT
          auction_id,
          amount,
          quantity,
          SUM(quantity) OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as cumulative_quantity,
          LEAD(amount, 1, starting_price) OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as next_price_level
        FROM bids
        WHERE status = 'active'
      )
      SELECT
        rb.auction_id,
        rb.bid_id as winning_bid_id,
        rb.bidder_id as winner_id,
        rb.amount as winning_amount,
        CASE
          -- Vickrey: second price wins
          WHEN rb.auction_type = 'vickrey' THEN COALESCE(vp.second_highest_price, rb.starting_price)
          
          -- Multi-unit: market clearing price
          WHEN rb.auction_type = 'multi_unit' THEN (
            SELECT COALESCE(mua.next_price_level, mua.starting_price)
            FROM multi_unit_analysis mua
            WHERE mua.auction_id = rb.auction_id
              AND mua.cumulative_quantity <= (
                SELECT COALESCE(JSONB_EXTRACT_PATH_TEXT(a.type_specific_params, 'total_units'), '10')::integer
                FROM auctions a
                WHERE a.id = rb.auction_id
              )
            ORDER BY mua.amount DESC
            LIMIT 1
          )
          
          -- Dutch: current price (descending)
          WHEN rb.auction_type = 'dutch' THEN rb.current_price
          
          -- Reverse: lowest bid wins
          WHEN rb.auction_type = 'reverse' THEN rb.amount
          
          -- All pay: highest bid wins but all pay
          WHEN rb.auction_type = 'all_pay' THEN rb.amount
          
          -- Japanese: last highest bid before end
          WHEN rb.auction_type = 'japanese' THEN rb.amount
          
          -- Chinese: winning bid
          WHEN rb.auction_type = 'chinese' THEN rb.amount
          
          -- Penny: lowest winning bid
          WHEN rb.auction_type = 'penny' THEN rb.amount
          
          -- Combinatorial: total value
          WHEN rb.auction_type = 'combinatorial' THEN (rb.amount * rb.quantity)
          
          -- Default: winning bid amount
          ELSE rb.amount
        END as final_price,
        rb.auction_type,
        rb.bid_rank,
        rb.total_bids,
        rb.highest_bid,
        rb.lowest_bid,
        rb.average_bid,
        rb.timestamp as winning_timestamp,
        CASE
          WHEN rb.amount >= rb.reserve_price THEN 'meets_reserve'
          ELSE 'below_reserve'
        END as reserve_status,
        CASE
          -- Special determination methods
          WHEN rb.auction_type = 'vickrey' THEN 'second_price'
          WHEN rb.auction_type = 'multi_unit' THEN 'market_clearing'
          WHEN rb.auction_type = 'dutch' THEN 'descending_price'
          WHEN rb.auction_type = 'reverse' THEN 'lowest_bid'
          WHEN rb.auction_type = 'all_pay' THEN 'all_pay'
          WHEN rb.auction_type = 'japanese' THEN 'last_highest'
          WHEN rb.auction_type = 'chinese' THEN 'winning_bid'
          WHEN rb.auction_type = 'penny' THEN 'lowest_winning'
          WHEN rb.auction_type = 'combinatorial' THEN 'total_value'
          ELSE 'highest_bid'
        END as determination_method,
        NOW() as determined_at
      FROM ranked_bids rb
      LEFT JOIN vickrey_prices vp ON rb.auction_id = vp.auction_id
      WHERE rb.bid_rank = 1
        AND (rb.amount >= rb.reserve_price OR rb.reserve_price IS NULL)
    `);
  }

  // Create a view for auction statistics
  static async createAuctionStatsView(): Promise<void> {
    await db.execute(sql`
      CREATE OR REPLACE VIEW v_auction_statistics AS
      SELECT 
        a.id as auction_id,
        a.title,
        a.type as auction_type,
        a.starting_price,
        a.reserve_price,
        a.current_price,
        a.start_time,
        a.end_time,
        a.status as auction_status,
        COUNT(b.id) as total_bids,
        COUNT(DISTINCT b.bidder_id) as unique_bidders,
        MAX(b.amount) as highest_bid,
        MIN(b.amount) as lowest_bid,
        AVG(b.amount) as average_bid,
        MAX(b.amount) - MIN(b.amount) as bid_range,
        CASE 
          WHEN COUNT(b.id) > 0 THEN 'active'
          ELSE 'no_bids'
        END as activity_level
      FROM auctions a
      LEFT JOIN bids b ON a.id = b.auction_id AND b.status = 'active'
      GROUP BY a.id, a.title, a.type, a.starting_price, a.reserve_price, 
               a.current_price, a.start_time, a.end_time, a.status
    `);
  }

  // Create all winner views
  static async createAllWinnerViews(): Promise<void> {
    try {
      await WinnerViews.createWinnerDeterminationView();
      await WinnerViews.createAuctionStatsView();
    } catch (error) {
      console.error("Error creating winner views:", error);
      throw error;
    }
  }

  // Get winner for a specific auction (cached if already determined)
  static async getAuctionWinner(auctionId: string): Promise<any> {
    return await db.execute(sql`
      SELECT * FROM v_auction_winners 
      WHERE auction_id = ${auctionId}
      LIMIT 1
    `);
  }

  // Get winners for multiple auctions
  static async getBatchWinners(auctionIds: string[]): Promise<any[]> {
    if (auctionIds.length === 0) return [];
    
    return await db.execute(sql`
      SELECT * FROM v_auction_winners 
      WHERE auction_id = ANY(${auctionIds})
    `);
  }

  // Get auction statistics
  static async getAuctionStats(auctionId: string): Promise<any> {
    return await db.execute(sql`
      SELECT * FROM v_auction_statistics 
      WHERE auction_id = ${auctionId}
      LIMIT 1
    `);
  }

  // Get all completed auctions with winners
  static async getAllCompletedAuctions(): Promise<any[]> {
    return await db.execute(sql`
      SELECT 
        wa.*,
        as_.title,
        as_.auction_type,
        as_.total_bids,
        as_.unique_bidders,
        as_.highest_bid,
        as_.lowest_bid,
        as_.average_bid
      FROM v_auction_winners wa
      INNER JOIN v_auction_statistics as_ ON wa.auction_id = as_.auction_id
      ORDER BY wa.determined_at DESC
    `);
  }
}
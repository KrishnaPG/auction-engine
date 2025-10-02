import { sql } from "drizzle-orm";
import { db } from "./drizzle-adapter";

export enum MaterializedViewName {
  BASE = 'mv_auction_bids_with_metadata',
  ENGLISH = 'mv_english_auction_bids',
  VICKREY = 'mv_vickrey_auction_bids',
  MULTI_UNIT = 'mv_multi_unit_auction_bids'
}

export class MaterializedViews {
	// Base materialized view that consolidates all auction bids with relevant metadata
	static async createBaseMaterializedView(): Promise<void> {
		await db.execute(sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_auction_bids_with_metadata AS
      SELECT 
        b.id as bid_id,
        b.auction_id,
        b.bidder_id,
        b.amount,
        b.quantity,
        b.timestamp,
        b.status as bid_status,
        b.is_winning,
        b.visible,
        b.version as bid_version,
        a.id as auction_id,
        a.title,
        a.type as auction_type,
        a.starting_price,
        a.reserve_price,
        a.min_increment,
        a.current_price,
        a.start_time,
        a.end_time,
        a.status as auction_status,
        a.created_by as auction_creator,
        a.created_at as auction_created_at,
        a.updated_at as auction_updated_at,
        ac.type_specific_params as auction_config,
        ROW_NUMBER() OVER (PARTITION BY b.auction_id ORDER BY b.amount DESC, b.timestamp ASC) as bid_rank_within_auction,
        COUNT(*) OVER (PARTITION BY b.auction_id) as total_bids_in_auction,
        MAX(b.amount) OVER (PARTITION BY b.auction_id) as highest_bid_in_auction,
        MIN(b.amount) OVER (PARTITION BY b.auction_id) as lowest_bid_in_auction,
        AVG(b.amount) OVER (PARTITION BY b.auction_id) as average_bid_in_auction
      FROM 
        bids b
        INNER JOIN auctions a ON b.auction_id = a.id
        LEFT JOIN auction_configurations ac ON a.id = ac.auction_id
      WHERE 
        b.status = 'active'
      WITH DATA;
    `);

		// Create index for the base materialized view
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_auction_id ON mv_auction_bids_with_metadata(auction_id);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_bidder_id ON mv_auction_bids_with_metadata(bidder_id);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_amount ON mv_auction_bids_with_metadata(amount DESC);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_timestamp ON mv_auction_bids_with_metadata(timestamp DESC);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_auction_type ON mv_auction_bids_with_metadata(auction_type);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_status ON mv_auction_bids_with_metadata(auction_status, bid_status);
    `);
	}

	// English auction materialized view
	static async createEnglishAuctionView(): Promise<void> {
		await db.execute(sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_english_auction_bids AS
      SELECT 
        bid_id,
        auction_id,
        bidder_id,
        amount,
        quantity,
        timestamp,
        bid_status,
        is_winning,
        bid_version,
        auction_type,
        starting_price,
        reserve_price,
        min_increment,
        current_price,
        start_time,
        end_time,
        auction_status,
        auction_creator,
        auction_created_at,
        auction_updated_at,
        auction_config,
        bid_rank_within_auction,
        total_bids_in_auction,
        highest_bid_in_auction,
        lowest_bid_in_auction,
        average_bid_in_auction,
        CASE 
          WHEN amount >= reserve_price THEN 'meets_reserve'
          WHEN amount >= starting_price THEN 'above_start'
          ELSE 'below_start'
        END as reserve_status,
        CASE 
          WHEN bid_rank_within_auction = 1 THEN 'leading'
          WHEN bid_rank_within_auction <= 3 THEN 'competitive'
          ELSE 'non_competitive'
        END as competitiveness,
        amount - LAG(amount, 1, starting_price) OVER (ORDER BY amount DESC, timestamp ASC) as bid_increment,
        EXTRACT(EPOCH FROM (timestamp - start_time)) as seconds_since_start
      FROM 
        mv_auction_bids_with_metadata
      WHERE 
        auction_type = 'english'
        AND auction_status IN ('active', 'completed')
        AND bid_status = 'active'
      WITH DATA;
    `);

		// Create indexes for English auction view
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_english_auction_auction_id ON mv_english_auction_bids(auction_id);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_english_auction_bid_rank ON mv_english_auction_bids(auction_id, bid_rank_within_auction);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_english_auction_reserve_status ON mv_english_auction_bids(auction_id, reserve_status);
    `);
	}

	// Vickrey auction materialized view
	static async createVickreyAuctionView(): Promise<void> {
		await db.execute(sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vickrey_auction_bids AS
      WITH ranked_bids AS (
        SELECT 
          bid_id,
          auction_id,
          bidder_id,
          amount,
          quantity,
          timestamp,
          bid_status,
          is_winning,
          bid_version,
          auction_type,
          starting_price,
          reserve_price,
          min_increment,
          current_price,
          start_time,
          end_time,
          auction_status,
          auction_creator,
          auction_created_at,
          auction_updated_at,
          auction_config,
          bid_rank_within_auction,
          total_bids_in_auction,
          highest_bid_in_auction,
          lowest_bid_in_auction,
          average_bid_in_auction,
          ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as vickrey_rank,
          LAG(amount, 1, NULL) OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as second_highest_amount
        FROM 
          mv_auction_bids_with_metadata
        WHERE 
          auction_type = 'vickrey'
          AND auction_status IN ('active', 'completed')
          AND bid_status = 'active'
      )
      SELECT 
        bid_id,
        auction_id,
        bidder_id,
        amount,
        quantity,
        timestamp,
        bid_status,
        is_winning,
        bid_version,
        auction_type,
        starting_price,
        reserve_price,
        min_increment,
        current_price,
        start_time,
        end_time,
        auction_status,
        auction_creator,
        auction_created_at,
        auction_updated_at,
        auction_config,
        bid_rank_within_auction,
        total_bids_in_auction,
        highest_bid_in_auction,
        lowest_bid_in_auction,
        average_bid_in_auction,
        vickrey_rank,
        second_highest_amount,
        CASE 
          WHEN vickrey_rank = 1 THEN 'winner'
          WHEN vickrey_rank = 2 THEN 'runner_up'
          WHEN vickrey_rank <= 5 THEN 'top_contender'
          ELSE 'other'
        END as vickrey_position,
        CASE 
          WHEN second_highest_amount IS NOT NULL THEN amount - second_highest_amount
          ELSE 0
        END as vickrey_premium,
        CASE 
          WHEN vickrey_rank = 1 AND second_highest_amount IS NOT NULL THEN second_highest_amount
          WHEN vickrey_rank = 1 AND second_highest_amount IS NULL THEN starting_price
          ELSE NULL
        END as final_price
      FROM 
        ranked_bids
      WITH DATA;
    `);

		// Create indexes for Vickrey auction view
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_vickrey_auction_auction_id ON mv_vickrey_auction_bids(auction_id);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_vickrey_auction_vickrey_rank ON mv_vickrey_auction_bids(auction_id, vickrey_rank);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_vickrey_auction_position ON mv_vickrey_auction_bids(auction_id, vickrey_position);
    `);
	}

	// Multi-unit auction materialized view
	static async createMultiUnitAuctionView(): Promise<void> {
		await db.execute(sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_multi_unit_auction_bids AS
      WITH quantity_analysis AS (
        SELECT 
          bid_id,
          auction_id,
          bidder_id,
          amount,
          quantity,
          timestamp,
          bid_status,
          is_winning,
          bid_version,
          auction_type,
          starting_price,
          reserve_price,
          min_increment,
          current_price,
          start_time,
          end_time,
          auction_status,
          auction_creator,
          auction_created_at,
          auction_updated_at,
          auction_config,
          bid_rank_within_auction,
          total_bids_in_auction,
          highest_bid_in_auction,
          lowest_bid_in_auction,
          average_bid_in_auction,
          SUM(quantity) OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as cumulative_quantity,
          amount * quantity as total_value,
          ROW_NUMBER() OVER (PARTITION BY bidder_id ORDER BY amount DESC, timestamp ASC) as bidder_bid_rank
        FROM 
          mv_auction_bids_with_metadata
        WHERE 
          auction_type = 'multi_unit'
          AND auction_status IN ('active', 'completed')
          AND bid_status = 'active'
      ),
      market_clearing AS (
        SELECT 
          *,
          LEAD(cumulative_quantity, 1, 0) OVER (ORDER BY amount DESC, timestamp ASC) as next_cumulative_quantity,
          LEAD(amount, 1, NULL) OVER (ORDER BY amount DESC, timestamp ASC) as next_price_level
        FROM 
          quantity_analysis
      )
      SELECT 
        bid_id,
        auction_id,
        bidder_id,
        amount,
        quantity,
        timestamp,
        bid_status,
        is_winning,
        bid_version,
        auction_type,
        starting_price,
        reserve_price,
        min_increment,
        current_price,
        start_time,
        end_time,
        auction_status,
        auction_creator,
        auction_created_at,
        auction_updated_at,
        auction_config,
        bid_rank_within_auction,
        total_bids_in_auction,
        highest_bid_in_auction,
        lowest_bid_in_auction,
        average_bid_in_auction,
        cumulative_quantity,
        total_value,
        bidder_bid_rank,
        CASE 
          WHEN cumulative_quantity <= (SELECT COALESCE(JSONB_EXTRACT_PATH_TEXT(auction_config, 'total_units'), '10')::integer FROM auctions WHERE id = auction_id) THEN 'winning'
          WHEN next_cumulative_quantity <= (SELECT COALESCE(JSONB_EXTRACT_PATH_TEXT(auction_config, 'total_units'), '10')::integer FROM auctions WHERE id = auction_id) THEN 'marginal'
          ELSE 'non_winning'
        END as allocation_status,
        CASE 
          WHEN next_price_level IS NOT NULL THEN next_price_level
          ELSE starting_price
        END as clearing_price,
        CASE 
          WHEN allocation_status = 'winning' THEN amount - clearing_price
          ELSE 0
        END as bid_spread,
        quantity * CASE 
          WHEN allocation_status = 'winning' THEN 1
          ELSE 0
        END as allocated_quantity
      FROM 
        market_clearing
      WITH DATA;
    `);

		// Create indexes for Multi-unit auction view
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_multi_unit_auction_auction_id ON mv_multi_unit_auction_bids(auction_id);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_multi_unit_auction_allocation ON mv_multi_unit_auction_bids(auction_id, allocation_status);
    `);
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_mv_multi_unit_auction_cumulative ON mv_multi_unit_auction_bids(auction_id, cumulative_quantity DESC);
    `);
	}

	// Create all materialized views
	static async createAllMaterializedViews(): Promise<void> {
		try {
			await MaterializedViews.createBaseMaterializedView();
			await MaterializedViews.createEnglishAuctionView();
			await MaterializedViews.createVickreyAuctionView();
			await MaterializedViews.createMultiUnitAuctionView();
		} catch (error) {
			console.error("Error creating materialized views:", error);
			throw error;
		}
	}

	// Refresh materialized views
	static async refreshMaterializedViews(viewName: MaterializedViewName | Array<MaterializedViewName> = []): Promise<void> {
		try {
			const viewNames = Array.isArray(viewName) ? viewName : [viewName];
			const allViews = Object.values(MaterializedViewName);
			
			const viewsToRefresh = viewNames.length > 0 ? viewNames : allViews;
			const refreshPromises = viewsToRefresh.map(view =>
				db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY ${sql.raw(view)}`)
			);
			
			await Promise.all(refreshPromises);
		} catch (error) {
			console.error("Error refreshing materialized views:", error);
			throw error;
		}
	}

}

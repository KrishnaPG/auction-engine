/** biome-ignore-all lint/complexity/noStaticOnlyClass: namespace */
import { sql } from "drizzle-orm";
import { db } from "./drizzle-adapter";

export enum MaterializedViewName {
  BASE = 'mv_auction_bids_with_metadata',
  ENGLISH = 'mv_english_auction_bids',
  VICKREY = 'mv_vickrey_auction_bids',
  MULTI_UNIT = 'mv_multi_unit_auction_bids',
  DUTCH = 'mv_dutch_auction_bids',
  SEALED_BID = 'mv_sealed_bid_auction_bids',
  REVERSE = 'mv_reverse_auction_bids',
  BUY_IT_NOW = 'mv_buy_it_now_auction_bids',
  ALL_PAY = 'mv_all_pay_auction_bids',
  JAPANESE = 'mv_japanese_auction_bids',
  CHINESE = 'mv_chinese_auction_bids',
  PENNY = 'mv_penny_auction_bids',
  COMBINATORIAL = 'mv_combinatorial_auction_bids'
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

      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_bidder_id ON mv_auction_bids_with_metadata(bidder_id);

      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_amount ON mv_auction_bids_with_metadata(amount DESC);

      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_timestamp ON mv_auction_bids_with_metadata(timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_mv_auction_bids_auction_type ON mv_auction_bids_with_metadata(auction_type);

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

      CREATE INDEX IF NOT EXISTS idx_mv_english_auction_bid_rank ON mv_english_auction_bids(auction_id, bid_rank_within_auction);

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

      CREATE INDEX IF NOT EXISTS idx_mv_vickrey_auction_vickrey_rank ON mv_vickrey_auction_bids(auction_id, vickrey_rank);

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

      CREATE INDEX IF NOT EXISTS idx_mv_multi_unit_auction_allocation ON mv_multi_unit_auction_bids(auction_id, allocation_status);

      CREATE INDEX IF NOT EXISTS idx_mv_multi_unit_auction_cumulative ON mv_multi_unit_auction_bids(auction_id, cumulative_quantity DESC);
    `);
	}

	// Dutch auction materialized view
	static async createDutchAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dutch_auction_bids AS
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
	         WHEN bid_status = 'winning' AND amount >= current_price THEN 'qualified'
	         WHEN bid_status = 'winning' AND amount < current_price THEN 'disqualified'
	         ELSE 'pending'
	       END as dutch_status,
	       EXTRACT(EPOCH FROM (end_time - timestamp)) as time_remaining
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'dutch'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status IN ('active', 'winning')
	     WITH DATA;
	   `);

		// Create indexes for Dutch auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_dutch_auction_auction_id ON mv_dutch_auction_bids(auction_id);

	     CREATE INDEX IF NOT EXISTS idx_mv_dutch_auction_dutch_status ON mv_dutch_auction_bids(auction_id, dutch_status);
	   `);
	}

	// Sealed bid auction materialized view
	static async createSealedBidAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sealed_bid_auction_bids AS
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
	       ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as sealed_bid_rank
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'sealed_bid'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status = 'active'
	     WITH DATA;
	   `);

		// Create indexes for Sealed bid auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_sealed_bid_auction_auction_id ON mv_sealed_bid_auction_bids(auction_id);

	     CREATE INDEX IF NOT EXISTS idx_mv_sealed_bid_auction_rank ON mv_sealed_bid_auction_bids(auction_id, sealed_bid_rank);
	   `);
	}

	// Reverse auction materialized view
	static async createReverseAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_reverse_auction_bids AS
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
	       ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY amount ASC, timestamp ASC) as reverse_rank,
	       CASE
	         WHEN amount <= reserve_price THEN 'meets_reserve'
	         WHEN amount <= starting_price THEN 'below_start'
	         ELSE 'above_start'
	       END as price_status
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'reverse'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status = 'active'
	     WITH DATA;
	   `);

		// Create indexes for Reverse auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_reverse_auction_auction_id ON mv_reverse_auction_bids(auction_id);
	
	     CREATE INDEX IF NOT EXISTS idx_mv_reverse_auction_rank ON mv_reverse_auction_bids(auction_id, reverse_rank);
	   `);
	}

	// Buy It Now auction materialized view
	static async createBuyItNowAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_buy_it_now_auction_bids AS
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
	         WHEN bid_status = 'winning' AND amount >= reserve_price THEN 'qualified_winner'
	         WHEN bid_status = 'winning' AND amount < reserve_price THEN 'disqualified_winner'
	         ELSE 'active_bid'
	       END as buy_now_status
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'buy_it_now'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status IN ('active', 'winning')
	     WITH DATA;
	   `);

		// Create indexes for Buy It Now auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_buy_it_now_auction_auction_id ON mv_buy_it_now_auction_bids(auction_id);

	     CREATE INDEX IF NOT EXISTS idx_mv_buy_it_now_auction_status ON mv_buy_it_now_auction_bids(auction_id, buy_now_status);
	   `);
	}

	// All Pay auction materialized view
	static async createAllPayAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_all_pay_auction_bids AS
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
	       ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as all_pay_rank
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'all_pay'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status = 'active'
	     WITH DATA;
	   `);

		// Create indexes for All Pay auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_all_pay_auction_auction_id ON mv_all_pay_auction_bids(auction_id);

	     CREATE INDEX IF NOT EXISTS idx_mv_all_pay_auction_rank ON mv_all_pay_auction_bids(auction_id, all_pay_rank);
	   `);
	}

	// Japanese auction materialized view
	static async createJapaneseAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_japanese_auction_bids AS
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
	       ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY timestamp DESC) as japanese_rank,
	       EXTRACT(EPOCH FROM (end_time - timestamp)) as time_remaining
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'japanese'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status = 'active'
	     WITH DATA;
	   `);

		// Create indexes for Japanese auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_japanese_auction_auction_id ON mv_japanese_auction_bids(auction_id);

	     CREATE INDEX IF NOT EXISTS idx_mv_japanese_auction_rank ON mv_japanese_auction_bids(auction_id, japanese_rank);
	   `);
	}

	// Chinese auction materialized view
	static async createChineseAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_chinese_auction_bids AS
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
	       ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY timestamp) as chinese_rank
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'chinese'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status = 'winning'
	     WITH DATA;
	   `);

		// Create indexes for Chinese auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_chinese_auction_auction_id ON mv_chinese_auction_bids(auction_id);
	   `);
	}

	// Penny auction materialized view
	static async createPennyAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_penny_auction_bids AS
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
	       ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY timestamp DESC) as penny_rank,
	       amount * quantity as total_value
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'penny'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status = 'winning'
	     WITH DATA;
	   `);

		// Create indexes for Penny auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_penny_auction_auction_id ON mv_penny_auction_bids(auction_id);
	   `);
	}

	// Combinatorial auction materialized view
	static async createCombinatorialAuctionView(): Promise<void> {
		await db.execute(sql`
	     CREATE MATERIALIZED VIEW IF NOT EXISTS mv_combinatorial_auction_bids AS
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
	       amount * quantity as total_value,
	       ROW_NUMBER() OVER (PARTITION BY auction_id ORDER BY amount DESC, timestamp ASC) as combinatorial_rank
	     FROM
	       mv_auction_bids_with_metadata
	     WHERE
	       auction_type = 'combinatorial'
	       AND auction_status IN ('active', 'completed')
	       AND bid_status = 'active'
	     WITH DATA;
	   `);

		// Create indexes for Combinatorial auction view
		await db.execute(sql`
	     CREATE INDEX IF NOT EXISTS idx_mv_combinatorial_auction_auction_id ON mv_combinatorial_auction_bids(auction_id);
	   `);
	}

	// Create all materialized views
	static async createAllMaterializedViews(): Promise<void> {
		try {
			await MaterializedViews.createBaseMaterializedView();
			await MaterializedViews.createEnglishAuctionView();
			await MaterializedViews.createVickreyAuctionView();
			await MaterializedViews.createMultiUnitAuctionView();
			await MaterializedViews.createDutchAuctionView();
			await MaterializedViews.createSealedBidAuctionView();
			await MaterializedViews.createReverseAuctionView();
			await MaterializedViews.createBuyItNowAuctionView();
			await MaterializedViews.createAllPayAuctionView();
			await MaterializedViews.createJapaneseAuctionView();
			await MaterializedViews.createChineseAuctionView();
			await MaterializedViews.createPennyAuctionView();
			await MaterializedViews.createCombinatorialAuctionView();
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

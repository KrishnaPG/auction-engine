/** biome-ignore-all lint/complexity/noStaticOnlyClass: namespace */
import { sql } from "drizzle-orm";
import { db } from "./drizzle-adapter";
import type { MaterializedViewName } from "./materialized-views";

export class StoredProcedures {
	// Stored procedure for determining winner using materialized views
	static async createWinnerDeterminationProcedure(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION determine_auction_winner(auction_id_param UUID)
      RETURNS TABLE (
        winner_id UUID,
        winning_bid_id UUID,
        winning_amount DECIMAL(15,2),
        payment_amount DECIMAL(15,2),
        auction_type VARCHAR(50),
        determination_method VARCHAR(50),
        determined_at TIMESTAMP
      ) AS $$
      DECLARE
        auction_type_val VARCHAR(50);
      BEGIN
        -- Get auction type
        SELECT type INTO auction_type_val FROM auctions WHERE id = auction_id_param;
        
        -- Determine winner based on auction type using materialized views
        CASE auction_type_val
          WHEN 'english' THEN
            RETURN QUERY
            SELECT 
              b.bidder_id as winner_id,
              b.bid_id as winning_bid_id,
              b.amount as winning_amount,
              b.amount as payment_amount,
              b.auction_type,
              'highest_bid' as determination_method,
              NOW() as determined_at
            FROM mv_english_auction_bids b
            WHERE b.auction_id = auction_id_param
              AND b.bid_rank_within_auction = 1
              AND b.reserve_status = 'meets_reserve';
            
          WHEN 'vickrey' THEN
            RETURN QUERY
            SELECT 
              b.bidder_id as winner_id,
              b.bid_id as winning_bid_id,
              b.amount as winning_amount,
              COALESCE(b.final_price, b.starting_price) as payment_amount,
              b.auction_type,
              'second_price' as determination_method,
              NOW() as determined_at
            FROM mv_vickrey_auction_bids b
            WHERE b.auction_id = auction_id_param
              AND b.vickrey_rank = 1;
            
          WHEN 'multi_unit' THEN
            RETURN QUERY
            SELECT 
              b.bidder_id as winner_id,
              b.bid_id as winning_bid_id,
              b.amount as winning_amount,
              b.clearing_price as payment_amount,
              b.auction_type,
              'market_clearing' as determination_method,
              NOW() as determined_at
            FROM mv_multi_unit_auction_bids b
            WHERE b.auction_id = auction_id_param
              AND b.allocation_status = 'winning'
            ORDER BY b.cumulative_quantity ASC
            LIMIT 1;
            
          ELSE
            -- Fallback to base materialized view for other types
            RETURN QUERY
            SELECT 
              b.bidder_id as winner_id,
              b.bid_id as winning_bid_id,
              b.amount as winning_amount,
              b.amount as payment_amount,
              b.auction_type,
              'highest_bid_fallback' as determination_method,
              NOW() as determined_at
            FROM mv_auction_bids_with_metadata b
            WHERE b.auction_id = auction_id_param
              AND b.bid_rank_within_auction = 1;
        END CASE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
	}

	// Stored procedure for batch winner determination
	static async createBatchWinnerDeterminationProcedure(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION determine_batch_winners()
      RETURNS TABLE (
        auction_id UUID,
        winner_id UUID,
        winning_bid_id UUID,
        winning_amount DECIMAL(15,2),
        payment_amount DECIMAL(15,2),
        auction_type VARCHAR(50),
        determination_method VARCHAR(50),
        determined_at TIMESTAMP
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          dw.auction_id,
          dw.winner_id,
          dw.winning_bid_id,
          dw.winning_amount,
          dw.payment_amount,
          dw.auction_type,
          dw.determination_method,
          dw.determined_at
        FROM determine_auction_winner(a.id) dw
        JOIN auctions a ON dw.auction_id = a.id
        WHERE a.status = 'completed'
          AND NOT EXISTS (
            SELECT 1 FROM auction_winners aw 
            WHERE aw.auction_id = a.id
          )
        ORDER BY a.end_time ASC;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
	}

	// Stored procedure for caching winner results
	static async createWinnerCacheProcedure(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION cache_auction_winner(auction_id_param UUID)
      RETURNS VOID AS $$
      DECLARE
        winner_record RECORD;
      BEGIN
        -- Get winner determination
        winner_record := (
          SELECT * FROM determine_auction_winner(auction_id_param) LIMIT 1
        );
        
        -- Insert or update winner cache
        INSERT INTO auction_winners (
          auction_id,
          winner_bid_id,
          winner_user_id,
          winning_amount,
          determined_at,
          determination_method
        ) VALUES (
          auction_id_param,
          winner_record.winning_bid_id,
          winner_record.winner_id,
          winner_record.winning_amount,
          winner_record.determined_at,
          winner_record.determination_method
        ) ON CONFLICT (auction_id) DO UPDATE SET
          winner_bid_id = EXCLUDED.winner_bid_id,
          winner_user_id = EXCLUDED.winner_user_id,
          winning_amount = EXCLUDED.winning_amount,
          determined_at = EXCLUDED.determined_at,
          determination_method = EXCLUDED.determination_method;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
	}

	// Stored procedure for refreshing materialized views with error handling
	static async createRefreshMaterializedViewsProcedure(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION refresh_materialized_views_safely(
        view_name_param VARCHAR DEFAULT NULL,
        force_refresh BOOLEAN DEFAULT FALSE
      ) RETURNS TABLE (
        view_name VARCHAR,
        refresh_status VARCHAR,
        error_message TEXT,
        refresh_duration INTERVAL
      ) AS $$
      DECLARE
        start_time TIMESTAMP;
        end_time TIMESTAMP;
        view_name_val VARCHAR;
        all_views TEXT[] := ARRAY['mv_auction_bids_with_metadata', 'mv_english_auction_bids', 'mv_vickrey_auction_bids', 'mv_multi_unit_auction_bids'];
        i INTEGER := 1;
      BEGIN
        start_time := clock_timestamp();
        
        IF view_name_param IS NOT NULL THEN
          -- Refresh specific view
          view_name_val := view_name_param;
          
          BEGIN
            EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name_val);
            RETURN QUERY SELECT 
              view_name_val,
              'success' as refresh_status,
              NULL as error_message,
              clock_timestamp() - start_time as refresh_duration;
          EXCEPTION
            WHEN OTHERS THEN
              RETURN QUERY SELECT 
                view_name_val,
                'failed' as refresh_status,
                SQLERRM as error_message,
                clock_timestamp() - start_time as refresh_duration;
          END;
        ELSE
          -- Refresh all views
          WHILE i <= array_length(all_views, 1) LOOP
            view_name_val := all_views[i];
            
            IF force_refresh OR NOT EXISTS (
              SELECT 1 FROM pg_matviews 
              WHERE matviewname = view_name_val
            ) THEN
              BEGIN
                EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name_val);
                RETURN QUERY SELECT 
                  view_name_val,
                  'success' as refresh_status,
                  NULL as error_message,
                  clock_timestamp() - start_time as refresh_duration;
              EXCEPTION
                WHEN OTHERS THEN
                  RETURN QUERY SELECT 
                    view_name_val,
                    'failed' as refresh_status,
                    SQLERRM as error_message,
                    clock_timestamp() - start_time as refresh_duration;
              END;
            END IF;
            
            i := i + 1;
          END LOOP;
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
	}

	// Stored procedure for getting auction statistics from materialized views
	static async createAuctionStatsProcedure(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_auction_statistics(auction_id_param UUID)
      RETURNS TABLE (
        auction_id UUID,
        auction_type VARCHAR(50),
        total_bids INTEGER,
        unique_bidders INTEGER,
        highest_bid DECIMAL(15,2),
        lowest_bid DECIMAL(15,2),
        average_bid DECIMAL(15,2),
        bid_range DECIMAL(15,2),
        winner_id UUID,
        winning_amount DECIMAL(15,2),
        determination_method VARCHAR(50)
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          b.auction_id,
          b.auction_type,
          b.total_bids_in_auction as total_bids,
          COUNT(DISTINCT b.bidder_id) as unique_bidders,
          MAX(b.amount) as highest_bid,
          MIN(b.amount) as lowest_bid,
          AVG(b.amount) as average_bid,
          MAX(b.amount) - MIN(b.amount) as bid_range,
          w.winner_id,
          w.winning_amount,
          w.determination_method
        FROM mv_auction_bids_with_metadata b
        LEFT JOIN determine_auction_winner(b.auction_id) w ON b.auction_id = w.auction_id
        WHERE b.auction_id = auction_id_param
        GROUP BY b.auction_id, b.auction_type, b.total_bids_in_auction, w.winner_id, w.winning_amount, w.determination_method;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
	}

	// Create all stored procedures
	static async createAllStoredProcedures(): Promise<void> {
		try {
			await StoredProcedures.createWinnerDeterminationProcedure();
			await StoredProcedures.createBatchWinnerDeterminationProcedure();
			await StoredProcedures.createWinnerCacheProcedure();
			await StoredProcedures.createRefreshMaterializedViewsProcedure();
			await StoredProcedures.createAuctionStatsProcedure();
		} catch (error) {
			console.error("Error creating stored procedures:", error);
			throw error;
		}
	}

	// Execute winner determination for a specific auction
	static async determineWinner(auctionId: string): Promise<any> {
		return await db.execute(sql`
      SELECT * FROM determine_auction_winner(${auctionId}::UUID)
    `);
	}

	// Execute batch winner determination
	static async determineBatchWinners(): Promise<any> {
		return await db.execute(sql`
      SELECT * FROM determine_batch_winners()
    `);
	}

	// Cache winner for a specific auction
	static async cacheWinner(auctionId: string): Promise<void> {
		await db.execute(sql`
      SELECT cache_auction_winner(${auctionId}::UUID)
    `);
	}

	// Get auction statistics
	static async getAuctionStats(auctionId: string): Promise<any> {
		return await db.execute(sql`
      SELECT * FROM get_auction_statistics(${auctionId}::UUID)
    `);
	}

	// Refresh materialized views with error handling
	static async refreshViewsSafely(
		viewName?: MaterializedViewName,
		forceRefresh: boolean = false,
	): Promise<any> {
		const viewNameParam = viewName ? viewName.toString() : null;
		return await db.execute(sql`
      SELECT * FROM refresh_materialized_views_safely(${viewNameParam}, ${forceRefresh})
    `);
	}
}

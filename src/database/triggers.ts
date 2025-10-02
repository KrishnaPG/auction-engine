/** biome-ignore-all lint/complexity/noStaticOnlyClass: namespace */
import { sql } from "drizzle-orm";
import { db } from "./drizzle-adapter";

export class Triggers {
	// Create trigger for refreshing materialized views when auctions end
	static async createAuctionEndTrigger(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION refresh_materialized_views_on_auction_end()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Refresh base materialized view
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_auction_bids_with_metadata;
        
        -- Refresh type-specific views based on auction type
        IF NEW.type = 'english' THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY mv_english_auction_bids;
        ELSIF NEW.type = 'vickrey' THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vickrey_auction_bids;
        ELSIF NEW.type = 'multi_unit' THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY mv_multi_unit_auction_bids;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

		await db.execute(sql`
      CREATE TRIGGER trigger_refresh_materialized_views_on_auction_end
      AFTER UPDATE ON auctions
      FOR EACH ROW
      WHEN (OLD.status <> NEW.status AND NEW.status = 'completed')
      EXECUTE FUNCTION refresh_materialized_views_on_auction_end();
    `);
	}

	// Create trigger for refreshing materialized views when new bids are placed
	static async createBidPlacementTrigger(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION refresh_materialized_views_on_bid_placement()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Refresh base materialized view
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_auction_bids_with_metadata;
        
        -- Refresh type-specific views based on auction type
        IF EXISTS (SELECT 1 FROM auctions WHERE id = NEW.auction_id AND type = 'english') THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY mv_english_auction_bids;
        ELSIF EXISTS (SELECT 1 FROM auctions WHERE id = NEW.auction_id AND type = 'vickrey') THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vickrey_auction_bids;
        ELSIF EXISTS (SELECT 1 FROM auctions WHERE id = NEW.auction_id AND type = 'multi_unit') THEN
          REFRESH MATERIALIZED VIEW CONCURRENTLY mv_multi_unit_auction_bids;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

		await db.execute(sql`
      CREATE TRIGGER trigger_refresh_materialized_views_on_bid_placement
      AFTER INSERT OR UPDATE ON bids
      FOR EACH ROW
      WHEN (NEW.status = 'active')
      EXECUTE FUNCTION refresh_materialized_views_on_bid_placement();
    `);
	}

	// Create trigger for refreshing materialized views when bids are updated
	static async createBidUpdateTrigger(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION refresh_materialized_views_on_bid_update()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only refresh if bid status changed to active or amount changed
        IF (OLD.status <> NEW.status AND NEW.status = 'active') OR 
           (OLD.amount <> NEW.amount) OR
           (OLD.quantity <> NEW.quantity) THEN
          
          -- Refresh base materialized view
          REFRESH MATERIALIZED VIEW CONCURRENTLY mv_auction_bids_with_metadata;
          
          -- Refresh type-specific views based on auction type
          IF EXISTS (SELECT 1 FROM auctions WHERE id = NEW.auction_id AND type = 'english') THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_english_auction_bids;
          ELSIF EXISTS (SELECT 1 FROM auctions WHERE id = NEW.auction_id AND type = 'vickrey') THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vickrey_auction_bids;
          ELSIF EXISTS (SELECT 1 FROM auctions WHERE id = NEW.auction_id AND type = 'multi_unit') THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_multi_unit_auction_bids;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

		await db.execute(sql`
      CREATE TRIGGER trigger_refresh_materialized_views_on_bid_update
      AFTER UPDATE ON bids
      FOR EACH ROW
      EXECUTE FUNCTION refresh_materialized_views_on_bid_update();
    `);
	}

	// Create trigger for refreshing materialized views when auction configurations change
	static async createAuctionConfigTrigger(): Promise<void> {
		await db.execute(sql`
      CREATE OR REPLACE FUNCTION refresh_materialized_views_on_config_change()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Refresh base materialized view
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_auction_bids_with_metadata;
        
        -- Refresh all type-specific views as config might affect all types
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_english_auction_bids;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vickrey_auction_bids;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_multi_unit_auction_bids;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

		await db.execute(sql`
      CREATE TRIGGER trigger_refresh_materialized_views_on_config_change
      AFTER UPDATE ON auction_configurations
      FOR EACH ROW
      EXECUTE FUNCTION refresh_materialized_views_on_config_change();
    `);
	}

	// Create all triggers
	static async createAllTriggers(): Promise<void> {
		try {
			await Triggers.createAuctionEndTrigger();
			await Triggers.createBidPlacementTrigger();
			await Triggers.createBidUpdateTrigger();
			await Triggers.createAuctionConfigTrigger();
		} catch (error) {
			console.error("Error creating triggers:", error);
			throw error;
		}
	}

	// Drop all triggers (for cleanup/migrations)
	static async dropAllTriggers(): Promise<void> {
		const triggers = [
			"trigger_refresh_materialized_views_on_auction_end",
			"trigger_refresh_materialized_views_on_bid_placement",
			"trigger_refresh_materialized_views_on_bid_update",
			"trigger_refresh_materialized_views_on_config_change",
		];

		for (const trigger of triggers) {
			try {
				await db.execute(
					sql`DROP TRIGGER IF EXISTS ${sql.raw(trigger)} ON auctions OR bids`,
				);
			} catch (error) {
				console.warn(`Failed to drop trigger ${trigger}:`, error);
			}
		}

		// Drop the functions
		const functions = [
			"refresh_materialized_views_on_auction_end",
			"refresh_materialized_views_on_bid_placement",
			"refresh_materialized_views_on_bid_update",
			"refresh_materialized_views_on_config_change",
		];

		for (const func of functions) {
			try {
				await db.execute(
					sql`DROP FUNCTION IF EXISTS ${sql.raw(func)}() CASCADE`,
				);
			} catch (error) {
				console.warn(`Failed to drop function ${func}:`, error);
			}
		}
	}
}

import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import Fuse from 'fuse.js'; // Fuzzy search library

// Cache to store trade routes and current index
const tradeRoutesCache: {
  routes: any[];
  index: number;
} = {
  routes: [],
  index: 0,
};

// Define the TradeRoute type
export interface TradeRoute {
  commodity_name: string;
  buy_terminal_name: string;
  buy_star_system_name: string;
  buy_price_per_scu: number;
  buy_scu_stocklevel: number;
  total_buy_cost: number;
  sell_terminal_name: string;
  sell_star_system_name: string;
  sell_price_per_scu: number;
  sell_scu_capacity: number;
  total_sell_revenue: number;
  profit: number;
  userProvidedSCU?: number; // Optional: SCU amount provided by the user
  adjustedSCU: number; // Adjusted SCU based on budget and stock/demand
  is_illegal: boolean; // Whether the commodity is illegal
}

// Helper function to format trade route responses
function formatTradeRouteResponse(route: TradeRoute): string {
  return `
📦 Commodity: ${route.commodity_name}
🚀 User Supplied SCU: ${route.userProvidedSCU || 0}
🚀 Adjusted SCU: ${route.adjustedSCU}

🏪 Buy Location:
  • Terminal: ${route.buy_terminal_name} - ${route.buy_star_system_name}
  • Stock Available: ${route.buy_scu_stocklevel} SCU
  • Buy Price per SCU: ${route.buy_price_per_scu} aUEC 
  • Buy Price for ${route.adjustedSCU} SCU: ${route.total_buy_cost} aUEC

📈 Sell Location:
  • Terminal: ${route.sell_terminal_name} - ${route.sell_star_system_name}
  • Demand: ${route.sell_scu_capacity} SCU
  • Sell Price per SCU: ${route.sell_price_per_scu} aUEC 
  • Sell Price for ${route.adjustedSCU} SCU: ${route.total_sell_revenue} aUEC
  
💰 Profitability:
  • Profit per SCU: ${(route.sell_price_per_scu - route.buy_price_per_scu).toFixed(2)} aUEC
  • Total Profit: ${route.profit} aUEC
`;
}

// Function to parse user input for SCU and budget
function parseUserInput(input: string): { scuAmount: number; budget: number } | null {
  // Match SCU and budget values in the input
  const scuMatch = input.match(/(\d+)\s*scu/i);
  const budgetMatch = input.match(/(\d+)\s*(k|auec)?/i);

  if (!scuMatch || !budgetMatch) {
    return null; // Invalid input
  }

  const scuAmount = parseInt(scuMatch[1], 10);
  let budget = parseInt(budgetMatch[1], 10);

  // Convert "k" to thousands (e.g., 500k -> 500000)
  if (budgetMatch[2]?.toLowerCase() === 'k') {
    budget *= 1000;
  }

  return { scuAmount, budget };
}

export const tools = {
  getMostProfitableCommodity: {
    description: "Find the most profitable commodity trade route based on user input.",
    parameters: z.object({
      scuAmount: z.number().min(1).optional().describe("SCU capacity of your ship"), // SCU amount to trade
      budget: z.number().min(0).optional().describe("Budget in aUEC. Use the money amount provided eg, 100k, 100,000 etc.."), // Budget in aUEC
      illegal: z.boolean().optional().describe("Include illegal commodities"), // Include illegal commodities
      starSystem: z.string().optional().describe("Star system (e.g., 'Stanton' or 'Pyro')"), // Star system (e.g., "Stanton" or "Pyro")
      showMore: z.boolean().optional().describe("Whether to show more routes from the cache"), // Whether to show more routes from the cache
      showMoreNumber: z.number().optional().describe("Number of routes to show from the cache"), // Number of routes to show
    }),
    execute: async (args: { input?: string; scuAmount?: number; budget?: number; illegal?: boolean; starSystem?: string; showMore?: boolean; showMoreNumber?: number }) => {
      console.log("Input Parameters:", args); // Log input parameters

      // Parse the user's input if SCU and budget are not provided directly
      if (!args.scuAmount || !args.budget) {
        console.log(`LOG TO CHECK: ${args.scuAmount} and ${args.budget}`);
        return { error: "To calculate the most profitable trade route, please provide the SCU capacity of your ship and your budget in aUEC." };
      }

      // If "Show More" is requested, return the next set of routes from the cache
      if (args.showMore) {
        if (args.showMoreNumber == null) {
          return { error: "Please provide the number of routes to show." };
        }
        if (tradeRoutesCache.routes.length === 0) {
          return { error: "No cached routes found. Please run a new query first." };
        }

        // Show only 1 additional route
        const nextRoute = tradeRoutesCache.routes.slice(tradeRoutesCache.index, tradeRoutesCache.index + args.showMoreNumber);
        tradeRoutesCache.index += 1; // Update the index

        if (nextRoute.length === 0) {
          return { error: "No more routes to show." };
        }

        // Format the next route using the helper function
        const formattedRoute = formatTradeRouteResponse(nextRoute[0]);

        // Calculate the number of remaining routes
        const remainingRoutes = tradeRoutesCache.routes.length - tradeRoutesCache.index;

        return {
          routes: formattedRoute,
          message: `ℹ️ ${remainingRoutes} more routes are available. Type 'Show X more routes' to see additional routes.`,
        };
      }

      // Generate unique file paths using UUID
      const uniqueId = uuidv4();
      const filePath = path.join(process.cwd(), '/APIOutput/merged_commodities_data.json');
      const outputFilePath = path.join(process.cwd(), `/APIOutput/tool_response_${uniqueId}.json`);
      const profitableRoutesFilePath = path.join(process.cwd(), `/APIOutput/profitable_routes_${uniqueId}.json`);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const commodities: CommodityPriceData[] = JSON.parse(data);

        // Filter commodities based on illegal flag and star system
        const filteredCommodities = commodities.filter((commodity: CommodityPriceData) => {
          const isIllegalAllowed = args.illegal ? commodity.is_illegal : true;
          const isInStarSystem = args.starSystem ? commodity.star_system_name === args.starSystem : true;
          return isIllegalAllowed && isInStarSystem;
        });

        // Separate buy and sell locations
        const buyLocations = filteredCommodities.filter((commodity: CommodityPriceData) => {
          return commodity.is_buyable && commodity.price_buy > 0 && commodity.scu_buy > 0;
        });

        const sellLocations = filteredCommodities.filter((commodity: CommodityPriceData) => {
          return commodity.is_sellable && commodity.price_sell > 0 && commodity.scu_sell > 0;
        });

        // Match buy and sell locations by commodity name
        const tradeRoutes: TradeRoute[] = buyLocations.flatMap((buyLocation: CommodityPriceData) => {
          const matchingSellLocations = sellLocations.filter((sellLocation: CommodityPriceData) => {
            return sellLocation.commodity_name === buyLocation.commodity_name;
          });

          return matchingSellLocations.map((sellLocation: CommodityPriceData) => {
            // Calculate the maximum SCU the user can afford based on budget
            const maxAffordableSCU = Math.floor(args.budget! / buyLocation.price_buy);

            // Adjust SCU to fit within the budget, SCU capacity, and available stock/demand
            const adjustedSCU = Math.min(
              args.scuAmount!, // User's SCU capacity
              maxAffordableSCU, // Maximum SCU based on budget
              buyLocation.scu_buy, // Available stock
              sellLocation.scu_sell // Available demand
            );

            // Recalculate costs and profits
            const totalCost = buyLocation.price_buy * adjustedSCU;
            const totalRevenue = sellLocation.price_sell * adjustedSCU;
            const profit = totalRevenue - totalCost;

            return {
              commodity_name: buyLocation.commodity_name,
              buy_terminal_name: buyLocation.terminal_name,
              buy_star_system_name: buyLocation.star_system_name,
              buy_price_per_scu: buyLocation.price_buy,
              buy_scu_stocklevel: buyLocation.scu_buy,
              total_buy_cost: totalCost,
              sell_terminal_name: sellLocation.terminal_name,
              sell_star_system_name: sellLocation.star_system_name,
              sell_price_per_scu: sellLocation.price_sell,
              sell_scu_capacity: sellLocation.scu_sell,
              total_sell_revenue: totalRevenue,
              profit,
              userProvidedSCU: args.scuAmount,
              adjustedSCU: adjustedSCU,
              is_illegal: buyLocation.is_illegal || sellLocation.is_illegal, // Include illegal flag
            };
          });
        });

        // Filter out routes with no affordable SCU
        const profitableRoutes = tradeRoutes.filter((route) => route.adjustedSCU > 0 && route.profit > 0);

        // Sort by profit descending
        const sortedRoutes = profitableRoutes.sort((a, b) => b.profit - a.profit);

        // Cache the sorted routes and reset the index
        tradeRoutesCache.routes = sortedRoutes;
        tradeRoutesCache.index = 0;

        // Output the tool response to a file
        await fs.writeFile(outputFilePath, JSON.stringify(tradeRoutes, null, 2));
        console.log(`Tool response saved to: ${outputFilePath}`);

        // Output the most profitable routes to a separate file
        await fs.writeFile(profitableRoutesFilePath, JSON.stringify(sortedRoutes, null, 2));
        console.log(`Profitable routes saved to: ${profitableRoutesFilePath}`);

        // Return the first route
        const initialRoute = sortedRoutes[0];
        tradeRoutesCache.index = 1; // Update the index

        // Format the initial route using the helper function
        const formattedRoute = formatTradeRouteResponse(initialRoute);

        // Calculate the number of remaining routes
        const remainingRoutes = sortedRoutes.length - 1;

        // Add a disclaimer for illegal commodities
        const disclaimer = initialRoute.is_illegal
          ? "⚠️ **WARNING:** Trading illegal commodities in Star Citizen carries significant risks. You may face fines, ship impoundment, or even criminal charges. Proceed with caution!"
          : null;

        // Delete the temporary files after processing
        await fs.unlink(outputFilePath);
        await fs.unlink(profitableRoutesFilePath);
        console.log(`Temporary files deleted: ${outputFilePath}, ${profitableRoutesFilePath}`);

        if (initialRoute) {
          return {
            routes: formattedRoute,
            message: `ℹ️ ${remainingRoutes} more routes are available. Type 'Show x (eg 2) more routes' to see additional routes.`,
            disclaimer,
          };
        } else {
          return { error: "No profitable routes found based on the provided criteria." };
        }
      } catch (error) {
        console.error("Error fetching merged commodities data:", error);
        return { error: "An unexpected error occurred while fetching the data." };
      }
    },
  },

  getCommodityLocations: {
    description: "Find the most profitable locations to buy or sell a specific commodity.",
    parameters: z.object({
      commodityName: z.string().describe("Name of the commodity"), // Name of the commodity
      action: z.enum(["buy", "sell"]).describe("Whether the user wants to buy or sell"), // Whether the user wants to buy or sell
      scuAmount: z.number().min(1).optional().describe("Optional SCU amount the user wants to buy or sell"), // Optional: SCU amount to trade
    }),
    execute: async (args: { commodityName: string; action: "buy" | "sell"; scuAmount?: number }) => {
      const filePath = path.join(process.cwd(), '/APIOutput/merged_commodities_data.json');
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const commodities: CommodityPriceData[] = JSON.parse(data);
  
        // Filter commodities by name, action (buy/sell), and demand/stock
        const filteredCommodities = commodities.filter((commodity: CommodityPriceData) => {
          const isMatchingCommodity = commodity.commodity_name.toLowerCase() === args.commodityName.toLowerCase();
          const isActionValid = args.action === "buy" ? commodity.is_buyable : commodity.is_sellable;
  
          // Additional filter for selling: exclude locations with 0 demand
          if (args.action === "sell" && commodity.scu_sell === 0) {
            return false;
          }
  
          // Additional filter for buying: exclude locations with 0 stock
          if (args.action === "buy" && commodity.scu_buy === 0) {
            return false;
          }
  
          return isMatchingCommodity && isActionValid;
        });
  
        if (filteredCommodities.length === 0) {
          return { error: `No ${args.action} locations found for ${args.commodityName}.` };
        }
  
        // Check if the chosen commodity is illegal
        const isCommodityIllegal = filteredCommodities.some((commodity) => commodity.is_illegal);
  
        // Sort by price (lowest for buy, highest for sell)
        const sortedCommodities = filteredCommodities.sort((a, b) => {
          return args.action === "buy" ? a.price_buy - b.price_buy : b.price_sell - a.price_sell;
        });
  
        // Format the response
        const formattedLocations = sortedCommodities.slice(0, 3).map((commodity) => {
          return `
  📦 Commodity: ${commodity.commodity_name}
  📍 Location: ${commodity.terminal_name} - ${commodity.star_system_name}
  💰 ${args.action === "buy" ? "Buy Price per SCU" : "Sell Price per SCU"}: ${args.action === "buy" ? commodity.price_buy : commodity.price_sell} aUEC
  📊 ${args.action === "buy" ? "Stock Available" : "Demand"}: ${args.action === "buy" ? commodity.scu_buy : commodity.scu_sell} SCU
  `;
        }).join('\n');
  
        // Add a disclaimer for illegal commodities (always shown if the commodity is illegal)
        const disclaimer = isCommodityIllegal
          ? `
  ⚠️ **WARNING:** ${args.commodityName} is considered an illegal commodity in Star Citizen.
  
  • Trading illegal commodities carries significant risks.
    • You may face fines, ship impoundment, or even criminal charges.
    • Proceed with caution!`
          : null;
  
        return {
          locations: formattedLocations + (disclaimer || ""),
          message: `Here are the most profitable locations to ${args.action} ${args.commodityName}:`,
        };
      } catch (error) {
        console.error("Error fetching merged commodities data:", error);
        return { error: "An unexpected error occurred while fetching the data." };
      }
    },
  },


  getTerminalInfo: {
    description: "Retrieve information about terminals based on search criteria.",
    parameters: z.object({
      terminalName: z.string().optional().describe("Partial or full name of the terminal (e.g., 'Admin - ARC-L1', 'Admin - ARC-L2', 'Admin - ARC-L3', 'Admin - ARC-L4', 'Admin - ARC-L5', 'ArcCorp Mining Area 045', 'ArcCorp Mining Area 048', 'ArcCorp Mining Area 056', 'ArcCorp Mining Area 061', 'ArcCorp Mining Area 141', 'ArcCorp Mining Area 157', 'TDD - Trade and Development Division - Area 18', 'Admin - Baijini Point', 'Benson Mining Outpost', 'Bountiful Harvest Hydroponics', 'Brio's Breaker Yard', 'Bud's Growery', 'CBD - Central Business District - Lorville', 'Admin - CRU-L1', 'Admin - CRU-L4', 'Locker Room - CRU-L4', 'Admin - CRU-L5', 'Deakins Research', 'Devlin Scrap and Salvage', 'Admin - Everus Harbor', 'Gallete Family Farms', 'Admin - GrimHEX', 'HDMS-Anderson', 'HDMS-Bezdek', 'HDMS-Edmond', 'HDMS-Hadley', 'HDMS-Hahn', 'HDMS-Lathan', 'HDMS-Norgaard', 'HDMS-Oparei', 'HDMS-Perlman', 'HDMS-Pinewood', 'HDMS-Ryder', 'HDMS-Stanhope', 'HDMS-Thedus', 'HDMS-Woodruff', 'Hickes Research Outpost', 'Humboldt Mines', 'Admin - HUR-L1', 'Admin - HUR-L2', 'Admin - HUR-L3', 'Admin - HUR-L4', 'Admin - HUR-L5', 'Admin - IO North Tower - Area 18', 'Kudre Ore', 'Admin - L19 Residences - Metro Center - Lorville', 'Levski', 'Loveridge Mineral Reserve', 'Admin - MIC-L1', 'Admin - MIC-L2', 'Admin - MIC-L3', 'Admin - MIC-L4', 'Admin - MIC-L5', 'MicroTech Planetary Services - Commons - New Babbage', 'NT-999-XX', 'Nuen Waste Management', 'Orison Municipal Services - Providence Platform - Orison', 'Outpost 54', 'Paradise Cove', 'Admin - Port Olisar', 'Admin - Port Tressler', 'Private Property', 'Raven's Roost', 'Rayari Anvik Research Outpost', 'Rayari Cantwell Research Outpost', 'Rayari Deltana Research Outpost', 'Rayari Kaltag Research Outpost', 'Rayari McGrath Research Outpost', 'Reclamation Disposal Orinth', 'Samson Son's Salvage Center', 'Shady Glen', 'Shubin Mining Facility SAL-2', 'Shubin Mining Facility SAL-5', 'Shubin Mining Facility SCD-1', 'Shubin Mining Facility SM0-10', 'Shubin Mining Facility SM0-13', 'Shubin Mining Facility SM0-18', 'Shubin Mining Facility SM0-22', 'Shubin Mining Facility SMCa-6', 'Shubin Mining Facility SMCa-8', 'Terra Mills Hydrofarm', 'The Necropolis', 'The Orphanage', 'TDD - Trade and Development Division - Commons - New Babbage', 'TDD - Trade and Development Division - Cloudview Center - Orison', 'Tram & Myers Mining', 'Admin - Terra Gateway', 'Admin - Pyro Gateway', 'Admin - Magnus Gateway', 'Platinum Bay - Magnus Gateway', 'Platinum Bay - Terra Gateway', 'Admin - Seraphim Station', 'Platinum Bay - Port Tressler', 'Platinum Bay - ARC-L1', 'Maker's Point', 'Scrap - Rappel', 'Rust - Pickers Field', 'NT-999-XXII', 'Platinum Bay - CRU-L5', 'Platinum Bay - CRU-L4', 'Platinum Bay - Baijini Point', 'Platinum Bay - CRU-L1', 'Platinum Bay - Everus Harbor', 'Platinum Bay - HUR-L2', 'Platinum Bay - HUR-L3', 'Platinum Bay - HUR-L5', 'Platinum Bay - Pyro Gateway', 'INS Jericho - Pyro Gateway', 'Dumper's Depot - Area 18', 'Jumptown', 'Rust - Dunboro', 'Dumper's Depot - Commodities - GrimHEX', 'Maintenance Room - CRU-L5', 'Admin - UEX Station', 'Admin - Checkmate', 'Admin - Orbituary', 'Admin - Starlight Service Station', 'Admin - Patch City', 'Admin - Ruin Station', 'Admin - Megumi Refueling', 'Admin - Endgame', 'Admin - Rod's Fuel 'N Supplies', 'Jackson's Swap', 'Ashland', 'Chawla's Beach', 'Admin - Gaslight', 'Seer's Canyon', 'Commodities - Bueno Ravine', 'Commodity Shop - Shepherd's Rest', 'Commodity Shop - Last Landings', 'Commodities - Rustville', 'Commodities - Canard View', 'Commodity Terminal - Sunset Mesa', 'Fallow Field', 'Refinery Ore Sales - ARC-L1', 'Refinery Ore Sales - ARC-L2', 'Refinery Ore Sales - CRU-L1', 'Refinery Ore Sales - HUR-L1', 'Refinery Ore Sales - HUR-L2', 'Refinery Ore Sales - MIC-L1', 'Refinery Ore Sales - MIC-L2', 'Refinery Ore Sales - MIC-L5', 'Refinery Ore Sales - Terra Gateway', 'Refinery Ore Sales - Magnus Gateway', 'Refinery Ore Sales - Pyro Gateway', 'Refinery Ore Sales - Checkmate', 'Refinery Ore Sales - Ruin Station')"),
      starSystem: z.string().optional().describe("Star system name (e.g., 'Stanton', 'Pyro')"),
      planetName: z.string().optional().describe("Partial or full name of the planet (e.g., 'ArcCorp', 'Crusader', 'Hurston', 'MicroTech', 'Bloom', 'Terminus', 'Pyro IV', 'Pyro V', 'Monox', 'Pyro I')"),
      orbitName: z.string().optional().describe("Partial or full name of the orbit (e.g., 'ArcCorp Lagrange Point 1', 'ArcCorp Lagrange Point 2', 'ArcCorp Lagrange Point 3', 'ArcCorp Lagrange Point 4', 'ArcCorp Lagrange Point 5', 'ArcCorp', 'Crusader', 'Crusader Lagrange Point 1', 'Crusader Lagrange Point 4', 'Crusader Lagrange Point 5', 'Hurston', 'Hurston Lagrange Point 1', 'Hurston Lagrange Point 2', 'Hurston Lagrange Point 3', 'Hurston Lagrange Point 4', 'Hurston Lagrange Point 5', 'microTech Lagrange Point 1', 'microTech Lagrange Point 2', 'microTech Lagrange Point 3', 'microTech Lagrange Point 4', 'microTech Lagrange Point 5', 'Terra Jump Point', 'Magnus Jump Point', 'Pyro Jump Point', 'Checkmate', 'Bloom', 'Starlight Service Station', 'Patch City', 'Terminus', 'Rod's Fuel & Supplies', 'Gaslight', 'Pyro V', 'Monox', 'Pyro I', 'Dudley & Daughters', 'Rat's Nest')"),
      isAutoLoad: z.boolean().optional().describe("Filter by auto-load status (true/false)"),
    }),
    execute: async (args: {
      terminalName?: string;
      starSystem?: string;
      planetName?: string;
      orbitName?: string;
      isAutoLoad?: boolean;
    }) => {
      const filePath = path.join(process.cwd(), '/APIOutput/terminals.json');

      try {
        // Read the terminals.json file
        const data = await fs.readFile(filePath, 'utf-8');
        const terminals: Terminal[] = JSON.parse(data);

        // Filter terminals based on the provided criteria
        const filteredTerminals = terminals.filter((terminal) => {
          const matchesTerminalName = args.terminalName
            ? terminal.terminal_name.toLowerCase().includes(args.terminalName.toLowerCase())
            : true;

          const matchesStarSystem = args.starSystem
            ? terminal.star_system_name.toLowerCase() === args.starSystem.toLowerCase()
            : true;

          const matchesPlanetName = args.planetName
            ? terminal.planet_name && terminal.planet_name.toLowerCase().includes(args.planetName.toLowerCase())
            : true;

          const matchesOrbitName = args.orbitName
            ? terminal.orbit_name && terminal.orbit_name.toLowerCase().includes(args.orbitName.toLowerCase())
            : true;

          const matchesAutoLoad = args.isAutoLoad !== undefined
            ? terminal.is_auto_load === args.isAutoLoad
            : true;

          return (
            matchesTerminalName &&
            matchesStarSystem &&
            matchesPlanetName &&
            matchesOrbitName &&
            matchesAutoLoad
          );
        });

        if (filteredTerminals.length === 0) {
          return { error: "No terminals found matching the provided criteria." };
        }

        // Return the raw results
        return {
          terminals: filteredTerminals,
          message: `Found ${filteredTerminals.length} terminals matching your criteria.`,
        };
      } catch (error) {
        console.error("Error fetching terminals data:", error);
        return { error: "An unexpected error occurred while fetching the data." };
      }
    },
  },



  getCommoditiesByTerminal: {
    description: "Retrieve a list of commodities available at a specific terminal, including whether they are buyable, sellable, and their wiki links.",
    parameters: z.object({
      terminalName: z.string().describe("Name of the terminal (e.g., 'Starlight Service Station')"),
    }),
    execute: async (args: { terminalName: string }) => {
      const filePath = path.join(process.cwd(), '/APIOutput/merged_commodities_data.json');
  
      try {
        // Read the merged_commodities_data.json file
        const data = await fs.readFile(filePath, 'utf-8');
        const commodities: CommodityPriceData[] = JSON.parse(data);
  
        // Extract unique terminal names for fuzzy matching
        const terminalNames = [...new Set(commodities.map((commodity) => commodity.terminal_name))];
  
        // Configure Fuse.js for fuzzy matching
        const fuse = new Fuse(terminalNames, {
          includeScore: true,
          threshold: 0.4, // Adjust threshold for sensitivity (lower = stricter)
        });
  
        // Perform fuzzy search to find the closest matching terminal name
        const searchResults = fuse.search(args.terminalName);
  
        if (searchResults.length === 0) {
          return { error: `No matching terminal found for: ${args.terminalName}` };
        }
  
        // Get the closest match
        const closestMatch = searchResults[0].item;
  
        // Filter commodities for the closest matching terminal
        const filteredCommodities = commodities.filter(
          (commodity) => commodity.terminal_name.toLowerCase() === closestMatch.toLowerCase()
        );
  
        if (filteredCommodities.length === 0) {
          return { error: `No commodities found for terminal: ${closestMatch}` };
        }
  
        // Format the response and exclude non-buyable/non-sellable commodities
        const formattedCommodities = filteredCommodities
          .map((commodity) => {
            const isBuyable = commodity.scu_buy > 0 && commodity.price_buy > 0; // Buyable if scu_buy > 0 and price_buy > 0
            const isSellable = commodity.scu_sell > 0 && commodity.price_sell > 0; // Sellable if scu_sell > 0 and price_sell > 0
  
            return {
              commodity_name: commodity.commodity_name,
              is_buyable: isBuyable,
              is_sellable: isSellable,
              wiki: commodity.wiki,
            };
          })
          .filter((commodity) => commodity.is_buyable || commodity.is_sellable); // Exclude if neither buyable nor sellable
  
        if (formattedCommodities.length === 0) {
          return { error: `No buyable or sellable commodities found for terminal: ${closestMatch}` };
        }
  
        return {
          commodities: formattedCommodities,
          message: `Found ${formattedCommodities.length} commodities for terminal: ${closestMatch}`,
        };
      } catch (error) {
        console.error("Error fetching commodities data:", error);
        return { error: "An unexpected error occurred while fetching the data." };
      }
    },
  },



  getBestTradeRouteForCommodity: {
    description: "Find the best trade route for a specific commodity, including the most profitable buy and sell locations. Optionally, specify a terminal for the buy or sell location and a star system to filter results.",
    parameters: z.object({
      commodityName: z.string().describe("Name of the commodity (e.g., 'WiDoW')"),
      scuAmount: z.number().min(1).optional().describe("Optional SCU amount to trade (default: 1)"),
      includeIllegal: z.boolean().optional().default(true).describe("Include illegal commodities (default: true)"),
      terminalName: z.string().optional().describe("Name of the terminal where the trade route starts or ends (e.g., 'Rat's Nest')"),
      starSystem: z.string().optional().describe("Name of the star system to filter results (e.g., 'Pyro')"),
      action: z.enum(['buy', 'sell', 'both']).optional().describe("Specify whether to find buy locations, sell locations, or both (default: 'both')"),
    }),
    execute: async (args: {
      commodityName: string;
      scuAmount?: number;
      includeIllegal?: boolean;
      terminalName?: string;
      starSystem?: string;
      action?: 'buy' | 'sell' | 'both';
    }) => {
      const filePath = path.join(process.cwd(), '/APIOutput/merged_commodities_data.json');
  
      try {
        // Read the merged_commodities_data.json file
        console.log("Running getBestTradeRouteForCommodity");
        const data = await fs.readFile(filePath, 'utf-8');
        const commodities: CommodityPriceData[] = JSON.parse(data);
  
        // Extract unique commodity names for fuzzy matching
        const commodityNames = [...new Set(commodities.map((commodity) => commodity.commodity_name))];
  
        // Configure Fuse.js for fuzzy matching on commodity names
        const commodityFuse = new Fuse(commodityNames, {
          includeScore: true,
          threshold: 0.4, // Adjust threshold for sensitivity (lower = stricter)
        });
  
        // Perform fuzzy search to find the closest matching commodity name
        const commoditySearchResults = commodityFuse.search(args.commodityName);
  
        if (commoditySearchResults.length === 0) {
          return { error: `No matching commodities found for: ${args.commodityName}` };
        }
  
        // Get the closest match for the commodity name
        const closestCommodityMatch = commoditySearchResults[0].item;
  
        // Filter commodities by the closest matching name, legality, and star system
        const filteredCommodities = commodities.filter((commodity) => {
          const isMatchingCommodity = commodity.commodity_name.toLowerCase() === closestCommodityMatch.toLowerCase();
          const isLegal = args.includeIllegal !== false ? true : !commodity.is_illegal; // Include illegal commodities by default
          const isInStarSystem = args.starSystem ? commodity.star_system_name.toLowerCase() === args.starSystem.toLowerCase() : true;
          return isMatchingCommodity && isLegal && isInStarSystem;
        });
  
        if (filteredCommodities.length === 0) {
          return { error: `No valid commodities found for: ${closestCommodityMatch}` };
        }
  
        // Check if the chosen commodity is illegal
        const isCommodityIllegal = filteredCommodities.some((commodity) => commodity.is_illegal);
  
        // Extract unique terminal names for fuzzy matching (if terminalName is provided)
        let closestTerminalMatch: string | null = null;
        if (args.terminalName) {
          const terminalNames = [...new Set(commodities.map((commodity) => commodity.terminal_name))];
  
          // Configure Fuse.js for fuzzy matching on terminal names
          const terminalFuse = new Fuse(terminalNames, {
            includeScore: true,
            threshold: 0.4, // Adjust threshold for sensitivity (lower = stricter)
          });
  
          // Perform fuzzy search to find the closest matching terminal name
          const terminalSearchResults = terminalFuse.search(args.terminalName);
  
          if (terminalSearchResults.length === 0) {
            return { error: `No matching terminals found for: ${args.terminalName}` };
          }
  
          // Get the closest match for the terminal name
          closestTerminalMatch = terminalSearchResults[0].item;
        }
  
        // Determine whether to filter for buy, sell, or both
        const action = args.action || 'both'; // Default to 'both' if no action is specified
  
        // Filter buy locations (if action includes 'buy')
        const buyLocations = action === 'buy' || action === 'both'
          ? filteredCommodities.filter((commodity) => {
              const isBuyable = commodity.scu_buy > 0 && commodity.price_buy > 0; // Buyable if scu_buy > 0 and price_buy > 0
              const matchesTerminal = closestTerminalMatch ? commodity.terminal_name.toLowerCase() === closestTerminalMatch.toLowerCase() : true; // Ensure buy location matches the starting terminal
              return isBuyable && matchesTerminal;
            })
          : [];
  
        // Filter sell locations (if action includes 'sell')
        const sellLocations = action === 'sell' || action === 'both'
          ? filteredCommodities.filter((commodity) => {
              const isSellable = commodity.scu_sell > 0 && commodity.price_sell > 0; // Sellable if scu_sell > 0 and price_sell > 0
              const matchesTerminal = closestTerminalMatch ? commodity.terminal_name.toLowerCase() !== closestTerminalMatch.toLowerCase() : true; // Ensure sell location is not the same as the buy location
              return isSellable && matchesTerminal;
            })
          : [];
  
        // Calculate the best trade route
        const tradeRoutes = buyLocations.flatMap((buyLocation) => {
          return sellLocations
            .filter((sellLocation) => sellLocation.commodity_name === buyLocation.commodity_name)
            .map((sellLocation) => {
              // Calculate the maximum SCU based on available stock and demand
              const maxSCU = Math.min(
                buyLocation.scu_buy,
                sellLocation.scu_sell,
                args.scuAmount || 1 // Default to 1 SCU if not provided
              );
  
              // Calculate total cost, revenue, and profit
              const totalCost = buyLocation.price_buy * maxSCU;
              const totalRevenue = sellLocation.price_sell * maxSCU;
              const profit = totalRevenue - totalCost;
  
              return {
                commodity_name: buyLocation.commodity_name,
                buy_terminal_name: buyLocation.terminal_name,
                buy_star_system_name: buyLocation.star_system_name,
                buy_price_per_scu: buyLocation.price_buy,
                buy_scu_stocklevel: buyLocation.scu_buy,
                total_buy_cost: totalCost,
                sell_terminal_name: sellLocation.terminal_name,
                sell_star_system_name: sellLocation.star_system_name,
                sell_price_per_scu: sellLocation.price_sell,
                sell_scu_capacity: sellLocation.scu_sell,
                total_sell_revenue: totalRevenue,
                profit,
                userProvidedSCU: args.scuAmount,
                adjustedSCU: maxSCU,
                is_illegal: buyLocation.is_illegal || sellLocation.is_illegal,
              };
            });
        });
  
        // Sort trade routes by profit (descending)
        const sortedTradeRoutes = tradeRoutes.sort((a, b) => b.profit - a.profit);
  
        if (sortedTradeRoutes.length === 0) {
          return { error: `No profitable trade routes found for: ${closestCommodityMatch}` };
        }
  
        // Get the best trade route
        const bestTradeRoute = sortedTradeRoutes[0];
  
        // Format the response
        const formattedResponse = `
  📦 Commodity: ${bestTradeRoute.commodity_name}
  🚀 User Supplied SCU: ${bestTradeRoute.userProvidedSCU || 0}
  🚀 Adjusted SCU: ${bestTradeRoute.adjustedSCU}
  
  🏪 Buy Location:
    • Terminal: ${bestTradeRoute.buy_terminal_name} - ${bestTradeRoute.buy_star_system_name}
    • Stock Available: ${bestTradeRoute.buy_scu_stocklevel} SCU
    • Buy Price per SCU: ${bestTradeRoute.buy_price_per_scu} aUEC 
    • Buy Price for ${bestTradeRoute.adjustedSCU} SCU: ${bestTradeRoute.total_buy_cost} aUEC
  
  📈 Sell Location:
    • Terminal: ${bestTradeRoute.sell_terminal_name} - ${bestTradeRoute.sell_star_system_name}
    • Demand: ${bestTradeRoute.sell_scu_capacity} SCU
    • Sell Price per SCU: ${bestTradeRoute.sell_price_per_scu} aUEC 
    • Sell Price for ${bestTradeRoute.adjustedSCU} SCU: ${bestTradeRoute.total_sell_revenue} aUEC
    
  💰 Profitability:
    • Profit per SCU: ${(bestTradeRoute.sell_price_per_scu - bestTradeRoute.buy_price_per_scu).toFixed(2)} aUEC
    • Total Profit: ${bestTradeRoute.profit} aUEC
  `;
  
        // Add a disclaimer for illegal commodities (always shown if the commodity is illegal)
        const disclaimer = bestTradeRoute.is_illegal
          ? "\n⚠️ **WARNING:** Trading illegal commodities in Star Citizen carries significant risks. You may face fines, ship impoundment, or even criminal charges. Proceed with caution!"
          : null;
  
        return {
          response: formattedResponse + (disclaimer || ""),
        };
      } catch (error) {
        console.error("Error fetching commodities data:", error);
        return { error: "An unexpected error occurred while fetching the data." };
      }
    },
  },












};

// Define the CommodityPriceData interface
export interface CommodityPriceData {
  id_commodity: number;
  price_buy: number;
  scu_buy: number;
  price_sell: number;
  scu_sell: number;
  commodity_name: string;
  terminal_name: string;
  terminal_id: number;
  commodity_code: string;
  is_buyable: boolean;
  is_sellable: boolean;
  is_illegal: boolean;
  wiki: string;
  moon_name: string | null;
  star_system_name: string;
  planet_name: string;
  orbit_name: string;
  is_auto_load: boolean;
  habitation_services: boolean;
  has_refinery: boolean;
  has_cargo_center: boolean;
  has_loading_dock: boolean;
  has_docking_port: boolean;
}

export interface Terminal {
  terminal_id: number;
  terminal_name: string;
  star_system_name: string;
  planet_name: string | null; // Allow null values
  orbit_name: string | null; // Allow null values
  is_auto_load: boolean;
}

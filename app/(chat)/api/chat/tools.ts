import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

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
      commodityName: z.string().describe("Name of the commodity") , // Name of the commodity
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

        return {
          locations: formattedLocations,
          message: `Here are the most profitable locations to ${args.action} ${args.commodityName}:`,
        };
      } catch (error) {
        console.error("Error fetching merged commodities data:", error);
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
  is_illegal: boolean;
  star_system_name: string;
  is_buyable: boolean;
  is_sellable: boolean;
}
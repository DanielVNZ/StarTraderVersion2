import { z } from "zod";
import Fuse from "fuse.js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

interface Commodity {
    id_commodity: number;
    price_buy: number;
    scu_buy: number;
    price_sell: number;
    scu_sell: number;
    commodity_name: string;
    terminal_name: string;
    star_system_name: string;
    is_illegal: boolean;
}

interface TradeRoute {
    commodity_name: string;
    buy_terminal_name: string;
    sell_terminal_name: string;
    profit: number;
    adjustedSCU: number;
    totalCost: number;
    totalRevenue: number;
    is_illegal: boolean;
    buy_star_system_name: string;
    sell_star_system_name: string;
    buy_scu_available: number;
    sell_scu_demand: number;
}


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









const tradeRoutesCache = {
    routes: [] as TradeRoute[],
    index: 0,
};

function formatTradeRouteResponse(route: TradeRoute, args: { budget?: number; scuAmount?: number }, remainingRoutes: number) {
    const illegalWarning = route.is_illegal
        ? "\n⚠️ **WARNING: This is an illegal commodity!** Trading illegal commodities carries significant risks including:\n- Heavy fines\n- Ship impoundment\n- Criminal charges\n\nProceed with extreme caution!"
        : "";

    const scuAdjustedWarning = args.scuAmount && route.adjustedSCU !== args.scuAmount
        ? `\n🔔 **Your SCU value has been adjusted from ${args.scuAmount} to ${route.adjustedSCU} as this is more profitable or the SCU amount requested is not available.**`
        : "";

    const sellDemandWarning = route.adjustedSCU >= (route.sell_scu_demand - 50) && route.adjustedSCU <= route.sell_scu_demand
        ? `\n⚠️⏳ **WARNING:** You are selling ${route.adjustedSCU} SCU of ${route.commodity_name}, which is close to the current demand of ${route.sell_scu_demand} SCU. You may experience a wait time to sell your ${route.commodity_name}.`
        : "";

    return `
🚀 **Best Trade Route to ${route.sell_terminal_name}**

📦 **Commodity:** ${route.commodity_name} ${route.is_illegal ? "🚫⚠️ (ILLEGAL)" : ""}

📏 **SCU:** ${route.adjustedSCU}${scuAdjustedWarning}${sellDemandWarning}

---
📍**Buy Location:**  
- **Terminal:** ${route.buy_terminal_name} - ${route.buy_star_system_name}
- **Stock Available:** ${route.buy_scu_available} SCU
- **1 SCU Cost:** ${Math.round(route.totalCost / route.adjustedSCU)} aUEC  
- **Total SCU Cost:** ${Math.round(route.totalCost)} aUEC for ${route.adjustedSCU} SCU

---
📍**Sell Location:**  
- **Terminal:** ${route.sell_terminal_name} - ${route.sell_star_system_name}
- **Current Demand:** ${route.sell_scu_demand} SCU
- **1 SCU Sell Cost:** ${Math.round(route.totalRevenue / route.adjustedSCU)} aUEC  
- **Total SCU Sell Revenue:** ${Math.round(route.totalRevenue)} aUEC for ${route.adjustedSCU} SCU

---
💰 **Profit:**  ${Math.round(route.profit)} aUEC  
${illegalWarning}

${remainingRoutes > 0 ? `📋 **There are ${remainingRoutes} more profitable routes available.**  
Type "See More" to view the next best route.` : ''}
`.trim();
}

export const tools = {
    calculateBestTradeRoute: {
        description:
            "Calculate the best trade route based on user-defined parameters such as starting terminal, destination terminal, commodity, SCU amount, budget, and star system.",
        parameters: z.object({
            scuAmount: z.number().min(1).optional().describe("SCU capacity of your ship (default: 10)"),
            budget: z.number().min(0).optional().describe("Budget in aUEC (Optional) Recommend user to provide if you feel its nessessory"),
            commodity: z.string().optional().describe("Specific commodity to trade (Optional, if not provided locate the best commodity)"),
            fromTerminal: z.string().optional().describe("Starting terminal for the trade route (Optional, if not provided locate the best starting terminal)"),
            toTerminal: z.string().optional().describe("Destination terminal for the trade route (Optional, if not provided locate the best destination terminal)"),
            starSystem: z.string().optional().describe("Star system for both buy and sell terminals (e.g., 'Stanton', 'Pyro')"),
            showMore: z.boolean().optional().describe("Whether to show more routes from the cache"),
            showMoreNumber: z.number().optional().describe("Number of routes to show from the cache"),
        }),
        execute: async (args: {
            scuAmount?: number;
            budget?: number;
            commodity?: string;
            fromTerminal?: string;
            toTerminal?: string;
            starSystem?: string;
            showMore?: boolean;
            showMoreNumber?: number;
        }) => {
            if (args.showMore) {
                if (tradeRoutesCache.routes.length === 0) {
                    return { error: "No cached routes found. Please run a new query first." };
                }

                if (tradeRoutesCache.index >= tradeRoutesCache.routes.length) {
                    return { error: "No more trade routes available. Please perform a new search." };
                }

                const numberOfRoutes = args.showMoreNumber || 1;
                const nextRoutes = tradeRoutesCache.routes.slice(
                    tradeRoutesCache.index,
                    tradeRoutesCache.index + numberOfRoutes
                );

                if (nextRoutes.length === 0) {
                    return { error: "No more routes to show." };
                }

                const remainingRoutes = tradeRoutesCache.routes.length - (tradeRoutesCache.index + numberOfRoutes);
                tradeRoutesCache.index += numberOfRoutes;

                const response = formatTradeRouteResponse(nextRoutes[0], args, remainingRoutes);
                return response;
            }

            if (args.fromTerminal || args.toTerminal || args.commodity || args.starSystem) {
                tradeRoutesCache.routes = [];
                tradeRoutesCache.index = 0;
            }

            const filePath = path.join(process.cwd(), "/APIOutput/merged_commodities_data.json");

            try {
                const data = await fs.promises.readFile(filePath, "utf-8");
                const commodities = JSON.parse(data) as Commodity[];

                const fuseOptions = {
                    keys: ["terminal_name"],
                    threshold: 0.4,
                    ignoreLocation: true,
                    findAllMatches: true
                };
                const fuse = new Fuse(commodities, fuseOptions);

                const resolveTerminals = (terminalName?: string) => {
                    if (!terminalName) return [];
                    
                    const exactMatches = commodities
                        .filter(item => item.terminal_name.toLowerCase().includes(terminalName.toLowerCase()))
                        .map(item => item.terminal_name);
                    
                    if (exactMatches.length > 0) {
                        return [...new Set(exactMatches)];
                    }
                
                    const results = fuse.search(terminalName);
                    const fuzzyMatches = results.map(r => r.item.terminal_name);
                    return [...new Set(fuzzyMatches)];
                };

                const resolvedFromTerminals = resolveTerminals(args.fromTerminal);
                const resolvedToTerminals = resolveTerminals(args.toTerminal);

                const filteredCommodities = commodities.filter((item) => {
                    const isBuyable = item.price_buy > 0 && item.scu_buy > 0;
                    const isSellable = item.price_sell > 0 && item.scu_sell > 0;

                    const matchesFromTerminal = resolvedFromTerminals.length > 0
                        ? resolvedFromTerminals.includes(item.terminal_name)
                        : true;

                    const matchesToTerminal = resolvedToTerminals.length > 0
                        ? resolvedToTerminals.includes(item.terminal_name)
                        : true;

                    const matchesCommodity = args.commodity
                        ? item.commodity_name.toLowerCase() === args.commodity.toLowerCase()
                        : true;

                    const matchesStarSystem = args.starSystem
                        ? item.star_system_name.toLowerCase() === args.starSystem.toLowerCase()
                        : true;

                    return (
                        matchesCommodity &&
                        (matchesFromTerminal || matchesToTerminal) &&
                        (isBuyable || isSellable) &&
                        matchesStarSystem
                    );
                });

                const buyLocations = filteredCommodities.filter((item) => {
                    const isRequestedTerminal = args.fromTerminal 
                        ? item.terminal_name.toLowerCase().includes(args.fromTerminal.toLowerCase())
                        : true;
                    
                    const isValidBuyLocation = isRequestedTerminal && item.price_buy > 0 && item.scu_buy > 0;
                    return isValidBuyLocation;
                });

                const sellLocations = filteredCommodities.filter((item) => {
                    const matchesToTerminal = resolvedToTerminals.length > 0
                        ? resolvedToTerminals.includes(item.terminal_name)
                        : item.price_sell > 0 && item.scu_sell > 0;

                    return matchesToTerminal && item.price_sell > 0 && item.scu_sell > 0;
                });

                const tradeRoutes = buyLocations.flatMap((buyItem) => {
                    return sellLocations
                        .filter((sellItem) => {
                            return sellItem.commodity_name === buyItem.commodity_name;
                        })
                        .map((sellItem) => {
                            const maxAffordableSCU = args.budget
                                ? Math.floor(args.budget / buyItem.price_buy)
                                : Infinity;

                            const maxAvailableSCU = Math.min(
                                buyItem.scu_buy,
                                sellItem.scu_sell
                            );

                            const adjustedSCU = Math.min(
                                args.scuAmount || Infinity,
                                maxAffordableSCU,
                                maxAvailableSCU
                            );

                            const totalCost = buyItem.price_buy * adjustedSCU;
                            const totalRevenue = sellItem.price_sell * adjustedSCU;
                            const profit = totalRevenue - totalCost;

                            return {
                                commodity_name: buyItem.commodity_name,
                                buy_terminal_name: buyItem.terminal_name,
                                sell_terminal_name: sellItem.terminal_name,
                                profit,
                                adjustedSCU,
                                totalCost,
                                totalRevenue,
                                is_illegal: buyItem.is_illegal || sellItem.is_illegal,
                                buy_star_system_name: buyItem.star_system_name,
                                sell_star_system_name: sellItem.star_system_name,
                                buy_scu_available: buyItem.scu_buy,
                                sell_scu_demand: sellItem.scu_sell
                            };
                        })
                        .filter((route): route is NonNullable<typeof route> => route !== null);
                });

                tradeRoutes.sort((a, b) => b.profit - a.profit);

                if (tradeRoutes.length === 0) {
                    return { error: "No profitable trade routes found with the given parameters." };
                }

                tradeRoutesCache.routes = tradeRoutes;
                tradeRoutesCache.index = 1;

                const remainingRoutes = tradeRoutes.length - 1;
                return formatTradeRouteResponse(tradeRoutes[0], args, remainingRoutes);
                
            } catch (error) {
                return { error };
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
            const data = await fs.promises.readFile(filePath, "utf-8");
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
            const data = await fs.promises.readFile(filePath, "utf-8");
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















};
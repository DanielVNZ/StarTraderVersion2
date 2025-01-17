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
};
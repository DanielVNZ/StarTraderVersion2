import fs from 'fs/promises';
import path from 'path';

interface CommodityData {
    id_commodity: number;
    name: string;
    code: string;
    is_buyable: boolean;
    is_sellable: boolean;
    is_illegal: boolean;
    wiki: string;
}

interface CommodityPriceData {
    id_commodity: number;
    price_buy: number;
    scu_buy: number;
    price_sell: number;
    scu_sell: number;
    commodity_name: string;
    terminal_name: string;
    terminal_id: number;
}

interface TerminalData {
    terminal_id: number;
    terminal_name: string;
    star_system_name: string;
    planet_name: string;
    orbit_name: string;
    is_auto_load: boolean; // convert to boolean
    habitation_services: boolean;
    has_refinery: boolean;
    has_cargo_center: boolean;
    has_loading_dock: boolean;
    has_docking_port: boolean;
    moon_name: string;
}

async function readJSONFile(filePath: string): Promise<any> {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

async function mergeCommodityData(): Promise<any> {
    const commoditiesPath = path.join(process.cwd(), '/APIOutput/commodities.json');
    const pricesPath = path.join(process.cwd(), '/APIOutput/commodities_prices_all.json');
    const terminalsPath = path.join(process.cwd(), '/APIOutput/terminals.json');
    const outputPath = path.join(process.cwd(), '/APIOutput/merged_commodities_data.json');

    try {
        const commodities: CommodityData[] = await readJSONFile(commoditiesPath);
        const prices: CommodityPriceData[] = await readJSONFile(pricesPath);
        const terminals: TerminalData[] = await readJSONFile(terminalsPath);

        // Filter terminals to include only those in Stanton or Pyro star systems
        const filteredTerminals = terminals.filter((terminal) => {
            return (
                terminal.star_system_name === 'Stanton' ||
                terminal.star_system_name === 'Pyro'
            );
        });

        // Create a map for commodities based on id_commodity
        const commodityMap = new Map<number, CommodityData>();
        commodities.forEach(commodity => {
            commodityMap.set(commodity.id_commodity, commodity);
        });

        // Create a map for filtered terminals based on terminal_id
        const terminalMap = new Map<number, TerminalData>();
        filteredTerminals.forEach(terminal => {
            terminalMap.set(terminal.terminal_id, terminal);
        });

        // Merge data using terminal_id
        const mergedData = prices
            .filter((price) => terminalMap.has(price.terminal_id)) // Only include prices for filtered terminals
            .map((price) => {
                const commodity = commodityMap.get(price.id_commodity);
                const terminal = terminalMap.get(price.terminal_id);

                return {
                    ...price,
                    commodity_name: commodity ? commodity.name : price.commodity_name,
                    commodity_code: commodity ? commodity.code : undefined,
                    is_buyable: commodity ? commodity.is_buyable : undefined,
                    is_sellable: commodity ? commodity.is_sellable : undefined,
                    is_illegal: commodity ? commodity.is_illegal : undefined,
                    wiki: commodity ? commodity.wiki : undefined,
                    moon_name: terminal ? terminal.moon_name : undefined,
                    star_system_name: terminal ? terminal.star_system_name : undefined,
                    planet_name: terminal ? terminal.planet_name : undefined,
                    orbit_name: terminal ? terminal.orbit_name : undefined,
                    is_auto_load: terminal ? terminal.is_auto_load : undefined,
                    habitation_services: terminal ? terminal.habitation_services : undefined,
                    has_refinery: terminal ? terminal.has_refinery : undefined,
                    has_cargo_center: terminal ? terminal.has_cargo_center : undefined,
                    has_loading_dock: terminal ? terminal.has_loading_dock : undefined,
                    has_docking_port: terminal ? terminal.has_docking_port : undefined,
                };
            });

        // Write merged data to a new JSON file
        await fs.writeFile(outputPath, JSON.stringify(mergedData, null, 2));
        return { message: 'OK' }; // Return OK response
    } catch (error) {
        console.error('Error merging commodity data:', error);
        throw new Error('Internal Server Error');
    }
}

// Named export for GET method
export async function GET() {
    try {
        const response = await mergeCommodityData();
        return new Response(JSON.stringify(response), { status: 200 }); // Return OK response
    } catch (error) {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
} 
import fs from 'fs/promises';
import axios from 'axios';
import NodeCache from 'node-cache';
import path from 'path';

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

const cache = new NodeCache({ stdTTL: 1800 }); // 30 minutes TTL

async function fetchCommodityPrices(): Promise<CommodityPriceData[] | null> {
    const cacheKey = 'commodities_prices_all';
    const cachedData = cache.get<CommodityPriceData[]>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    try {
        const response = await axios.get('https://api.uexcorp.space/2.0/commodities_prices_all');
        console.log('Response for commodities prices:', response.data);

        const dataArray: any[] = response.data.data;

        if (!dataArray || dataArray.length === 0) {
            console.error('No data found for commodities prices');
            return null;
        }

        // Map the data to match the CommodityPriceData interface
        const filteredData: CommodityPriceData[] = dataArray.map(data => ({
            id_commodity: data.id_commodity,
            price_buy: data.price_buy,
            scu_buy: data.scu_buy,
            price_sell: data.price_sell,
            scu_sell: data.scu_sell_stock,
            commodity_name: data.commodity_name,
            terminal_name: data.terminal_name,
            terminal_id: data.id_terminal,
        }));

        cache.set(cacheKey, filteredData);
        return filteredData;
    } catch (error) {
        console.error('Error fetching commodity prices data:', error);
        return null;
    }
}

// Named export for GET method
export async function GET() {
    const commodityPrices = await fetchCommodityPrices();

    if (commodityPrices) {
        const filePath = path.join(process.cwd(), '/APIOutput/commodities_prices_all.json'); // Path to the output file
        try {
            await fs.writeFile(filePath, JSON.stringify(commodityPrices, null, 2)); // Write to commodities_prices_all.json
            return new Response(JSON.stringify({ message: 'OK' }), { status: 200 }); // Return OK response
        } catch (err) {
            console.error('Error writing commodities prices JSON file:', err);
            return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
        }
    } else {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
}

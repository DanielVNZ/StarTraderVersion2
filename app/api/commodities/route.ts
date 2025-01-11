import fs from 'fs/promises';
import axios from 'axios';
import NodeCache from 'node-cache';
import path from 'path';

interface CommodityData {
    id_commodity: number; // Renamed from id to commodity_id
    name: string;
    code: string;
    is_buyable: boolean; // Changed to boolean
    is_sellable: boolean; // Changed to boolean
    is_illegal: boolean; // Changed to boolean
    wiki: string;
}

const cache = new NodeCache({ stdTTL: 1800 }); // 30 minutes TTL

async function fetchCommodityData(): Promise<CommodityData[] | null> {
    const cacheKey = 'commodities_data';
    const cachedData = cache.get<CommodityData[]>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    try {
        const response = await axios.get('https://api.uexcorp.space/2.0/commodities');
        console.log('Response for commodities:', response.data);

        const dataArray: any[] = response.data.data;

        if (!dataArray || dataArray.length === 0) {
            console.error('No data found for commodities');
            return null;
        }

        // Map the data to match the CommodityData interface
        const filteredData: CommodityData[] = dataArray.map(data => ({
            id_commodity: data.id,
            name: data.name,
            code: data.code,
            is_buyable: data.is_buyable === 1, // Convert to boolean
            is_sellable: data.is_sellable === 1, // Convert to boolean
            is_illegal: data.is_illegal === 1, // Convert to boolean
            wiki: data.wiki,
        }));

        cache.set(cacheKey, filteredData);
        return filteredData;
    } catch (error) {
        console.error('Error fetching commodity data:', error);
        return null;
    }
}

// Named export for GET method
export async function GET() {
    const commodities = await fetchCommodityData();

    if (commodities) {
        const filePath = path.join(process.cwd(), '/APIOutput/commodities.json'); // Path to the output file
        try {
            await fs.writeFile(filePath, JSON.stringify(commodities, null, 2)); // Write to commodities.json
            return new Response(JSON.stringify({ message: 'OK' }), { status: 200 }); // Return OK response
        } catch (err) {
            console.error('Error writing commodities JSON file:', err);
            return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
        }
    } else {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
}

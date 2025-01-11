import fs from 'fs/promises';
import axios from 'axios';
import NodeCache from 'node-cache';
import path from 'path';

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
}

const cache = new NodeCache({ stdTTL: 1800 });

async function fetchTerminalData(): Promise<TerminalData[] | null> {
    const cacheKey = 'terminals_commodity';
    const cachedData = cache.get<TerminalData[]>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    try {
        // Fetch data from both endpoints
        const [responseCommodity, responseCommodityRaw] = await Promise.all([
            axios.get('https://api.uexcorp.space/2.0/terminals?type=commodity'),
            axios.get('https://api.uexcorp.space/2.0/terminals?type=commodity_raw'),
        ]);

        console.log('Response for terminals (commodity):', responseCommodity.data);
        console.log('Response for terminals (commodity_raw):', responseCommodityRaw.data);

        const dataArray: any[] = [
            ...responseCommodity.data.data,
            ...responseCommodityRaw.data.data,
        ];

        if (!dataArray || dataArray.length === 0) {
            console.error('No data found for terminals');
            return null;
        }

        // Map the data to match the TerminalData interface
        const filteredData: TerminalData[] = dataArray.map(data => ({
            terminal_id: data.id,
            terminal_name: data.name,
            star_system_name: data.star_system_name,
            planet_name: data.planet_name,
            orbit_name: data.orbit_name,
            moon_name: data.moon_name,
            is_auto_load: data.is_auto_load === 1, // convert to boolean: 1 is true, 0 is false
            habitation_services: data.is_habitation === 1,
            has_refinery: data.is_refinery === 1,
            has_cargo_center: data.is_cargo_center === 1,
            has_loading_dock: data.is_loading_dock === 1,
            has_docking_port: data.is_docking_port === 1,


        }));

        cache.set(cacheKey, filteredData);
        return filteredData;
    } catch (error) {
        console.error('Error fetching terminal data:', error);
        return null;
    }
}

// Named export for GET method
export async function GET() {
    const terminals = await fetchTerminalData();

    if (terminals) {
        const filePath = path.join(process.cwd(), '/APIOutput/terminals.json'); // Path to the output file
        try {
            await fs.writeFile(filePath, JSON.stringify(terminals, null, 2)); // Write to terminals.json
            return new Response(JSON.stringify({ message: 'OK' }), { status: 200 }); // Return OK response
        } catch (err) {
            console.error('Error writing terminals JSON file:', err);
            return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
        }
    } else {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
    }
}

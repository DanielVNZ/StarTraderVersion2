import { z } from "zod";


export const tools = {

  getCommodities: {
    description: "Retrieve a list of all commodities.",
    parameters: z.object({}),
    execute: async (_args: {}) => {
      // console.log("Fetching commodities...");
  
      const apiUrl = "https://api.uexcorp.space/2.0/commodities";
  
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error("Failed to fetch commodities:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        // Define Zod schema for validation
        const schema = z.object({
          status: z.literal("ok"),
          data: z.array(
            z.object({
              id: z.number().nullable(),
              id_parent: z.number().nullable(),
              name: z.string().nullable(),
              code: z.string().nullable(),
              kind: z.string().nullable(),
              weight_scu: z.number().nullable(),
              price_buy: z.number().nullable(),
              price_sell: z.number().nullable(),
              is_available: z.number().nullable(),
              is_available_live: z.number().nullable(),
              is_visible: z.number().nullable(),
              is_mineral: z.number().nullable(),
              is_raw: z.number().nullable(),
              is_refined: z.number().nullable(),
              is_harvestable: z.number().nullable(),
              is_buyable: z.number().nullable(),
              is_sellable: z.number().nullable(),
              is_temporary: z.number().nullable(),
              is_illegal: z.number().nullable(),
              is_fuel: z.number().nullable(),
              wiki: z.string().nullable(),
              date_added: z.number().nullable(),
              date_modified: z.number().nullable(),
            })
          ),
        });
  
        // Validate the response data against the schema
        const parsedData = schema.safeParse(responseData);
        if (!parsedData.success) {
          console.warn("Invalid data format:", parsedData.error.errors);
          return { error: "Invalid data format received from the API." };
        }
  
        const data = parsedData.data.data; // Extract validated data
        //console.log(`Fetched ${data.length} commodities.`);
  
        // Chunk the data into smaller parts if necessary
        const chunkSize = 150;
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        //console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks };
      } catch (error) {
        console.error("Error fetching commodities:", error);
        return { error: "An unexpected error occurred while fetching commodities." };
      }
    },
  },  

  getStarSystems: {
    description: "Retrieve a list of star systems.",
    parameters: z.object({}),
    execute: async () => {
      console.log("Fetching star systems...");
  
      try {
        const response = await fetch(`https://api.uexcorp.space/2.0/star_systems`);
        if (!response.ok) {
          console.error("Failed to fetch star systems:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        if (responseData.status !== "ok" || !Array.isArray(responseData.data)) {
          console.warn("Star systems API returned empty or invalid data:", responseData);
          return { error: "No valid data available in response." };
        }
  
        const data = responseData.data; // Extract the actual array
        //console.log(`Fetched ${data.length} entries from star systems API`);
  
        const chunkSize = 200; // Define the size of each chunk
        const chunks = [];
  
        // Create chunks from the data
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks }; // Return the data in chunks
      } catch (error) {
        console.error("Error fetching star systems:", error);
        return { error: "An unexpected error occurred" };
      }
    },
  },  

  getSpaceStations: {
    description: "Retrieve a list of space stations.",
    parameters: z.object({}),
    execute: async () => {
      console.log("Fetching space stations...");
  
      try {
        const response = await fetch(`https://api.uexcorp.space/2.0/space_stations`);
        if (!response.ok) {
          console.error("Failed to fetch space stations:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        if (responseData.status !== "ok" || !Array.isArray(responseData.data)) {
          console.warn("Space stations API returned empty or invalid data:", responseData);
          return { error: "No valid data available in response." };
        }
  
        const data = responseData.data; // Extract the actual array
        // // console.log(`Fetched ${data.length} entries from space stations API`);
  
        const chunkSize = 200; // Define the size of each chunk
        const chunks = [];
  
        // Create chunks from the data
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        // console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks }; // Return the data in chunks
      } catch (error) {
        console.error("Error fetching space stations:", error);
        return { error: "An unexpected error occurred" };
      }
    },
  },
  

  getBuyCommodityPrices: {
    description: "Retrieve commodity buy prices and available stock for a specific commodity or location. Use this tool to help the user find the best buy location for a specific commodity.",
    parameters: z.object({
        id_commodity: z.number().optional(),
    }),
    execute: async (args: { id_commodity?: number }) => {
        // console.log("Fetching buy commodity prices with arguments:", args);

        // Construct query parameters dynamically
        const queryParams = new URLSearchParams();
        Object.entries(args).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });

        const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?${queryParams.toString()}`;
        // console.log("API URL:", apiUrl);

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error("Failed to fetch commodity buy prices:", response.statusText);
                return { error: `Failed to fetch data: ${response.statusText}` };
            }

            const responseData = await response.json();

            // Updated Zod schema with required fields for buy data
            const schema = z.object({
                status: z.literal("ok"),
                data: z.array(
                    z.object({
                        terminal_name: z.string().nullable(),
                        terminal_code: z.string().nullable(),
                        price_buy: z.number().nullable(),
                        scu_buy: z.number().nullable(),
                        star_system_name: z.string().nullable(),
                    })
                ),
            });

            const parsedData = schema.safeParse(responseData);
            if (!parsedData.success) {
                console.warn("Invalid buy data format:", parsedData.error.errors);
                return { error: "Invalid buy data format received from the API." };
            }

            // Extract and return the filtered buy data
            const data = parsedData.data.data.map(item => ({
                terminal_name: item.terminal_name,
                terminal_code: item.terminal_code,
                price_buy: `${item.price_buy}aUEC`,
                scu_buy: `${item.scu_buy} SCU`,
                star_system_name: item.star_system_name,
            }));

            // console.log("Filtered Buy JSON Output:", JSON.stringify(data, null, 2));
            // console.log(`Filtered ${data.length} commodity buy price records.`);
            return { result: data };
        } catch (error) {
            console.error("Error fetching commodity buy prices:", error);
            return { error: "An unexpected error occurred while fetching commodity buy prices." };
        }
    },
},

getSellCommodityPrices: {
    description: "Retrieve commodity sell prices and demand for a specific commodity or location. Use this tool to help the user find the best sell location for a specific commodity.",
    parameters: z.object({
        id_commodity: z.number().optional(),
    }),
    execute: async (args: { id_commodity?: number }) => {
        // console.log("Fetching sell commodity prices with arguments:", args);

        // Construct query parameters dynamically
        const queryParams = new URLSearchParams();
        Object.entries(args).forEach(([key, value]) => {
            if (value !== undefined) {
                queryParams.append(key, value.toString());
            }
        });

        const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?${queryParams.toString()}`;
        // console.log("API URL:", apiUrl);

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error("Failed to fetch commodity sell prices:", response.statusText);
                return { error: `Failed to fetch data: ${response.statusText}` };
            }

            const responseData = await response.json();

            // Updated Zod schema with required fields for sell data
            const schema = z.object({
                status: z.literal("ok"),
                data: z.array(
                    z.object({
                        terminal_name: z.string().nullable(),
                        terminal_code: z.string().nullable(),
                        price_sell: z.number().nullable(),
                        scu_sell: z.number().nullable(),
                        star_system_name: z.string().nullable(),
                    })
                ),
            });

            const parsedData = schema.safeParse(responseData);
            if (!parsedData.success) {
                console.warn("Invalid sell data format:", parsedData.error.errors);
                return { error: "Invalid sell data format received from the API." };
            }

            // Extract and return the filtered sell data
            const data = parsedData.data.data.map(item => ({
                terminal_name: item.terminal_name,
                terminal_code: item.terminal_code,
                price_sell: `${item.price_sell} aUEC`,
                scu_sell: `${item.scu_sell} SCU`,
                star_system_name: item.star_system_name,
            }));

            // console.log("Filtered Sell JSON Output:", JSON.stringify(data, null, 2));
            // console.log(`Filtered ${data.length} commodity sell price records.`);
            return { result: data };
        } catch (error) {
            console.error("Error fetching commodity sell prices:", error);
            return { error: "An unexpected error occurred while fetching commodity sell prices." };
        }
    },
},

  

  getCities: {
    description: "Retrieve a list of cities. Stanton star system ID is 68. Pyro star system ID is 64",
    parameters: z.object({
      id_star_system: z.number().optional(),
    }),
    additionalProperties: false,
    execute: async (args: { id_star_system?: number }) => {
      // console.log("Fetching cities with arguments:", args);
  
      const queryParams = new URLSearchParams();
      if (args.id_star_system !== undefined) {
        queryParams.append("id_star_system", args.id_star_system.toString());
      }
         
  
      // console.log("Query parameters for cities API:", queryParams.toString());
  
      try {
        const response = await fetch(`https://api.uexcorp.space/2.0/cities?${queryParams.toString()}`);
        if (!response.ok) {
          console.error("Failed to fetch cities:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        if (responseData.status !== 'ok' || !Array.isArray(responseData.data)) {
          console.warn("Cities API returned empty or invalid data:", responseData);
          return { error: "No valid data available in response." };
        }
  
        const data = responseData.data; // Extract the actual array
        // console.log(`Fetched ${data.length} entries from cities API`);
  
        const chunkSize = 200; // Define the size of each chunk
        const chunks = [];
  
        // Create chunks from the data
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        // console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks }; // Return the data in chunks
      } catch (error) {
        console.error("Error fetching cities:", error);
        return { error: "An unexpected error occurred" };
      }
    },
  },  

  getMoons: {
    description: "Retrieve a list of moons.",
    parameters: z.object({
      id_star_system: z.number().optional(),
      id_planet: z.number().optional(),
    }),
    execute: async (args: { id_star_system?: number; id_planet?: number }) => {
      // console.log("Fetching moons with arguments:", args);
  
      const queryParams = new URLSearchParams();
      if (args.id_star_system !== undefined) queryParams.append("id_star_system", args.id_star_system.toString());
      if (args.id_planet !== undefined) queryParams.append("id_planet", args.id_planet.toString());
  
      // console.log("Query parameters for moons API:", queryParams.toString());
  
      try {
        const response = await fetch(`https://api.uexcorp.space/2.0/moons?${queryParams.toString()}`);
        if (!response.ok) {
          console.error("Failed to fetch moons:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        if (responseData.status !== 'ok' || !Array.isArray(responseData.data)) {
          console.warn("Moons API returned empty or invalid data:", responseData);
          return { error: "No valid data available in response." };
        }
  
        const data = responseData.data; // Extract the actual array
        // console.log(`Fetched ${data.length} entries from moons API`);
  
        const chunkSize = 200; // Define the size of each chunk
        const chunks = [];
  
        // Create chunks from the data
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        // console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks }; // Return the data in chunks
      } catch (error) {
        console.error("Error fetching moons:", error);
        return { error: "An unexpected error occurred" };
      }
    },
  },  

  getOrbits: {
    description: "Retrieve a list of orbits.",
    parameters: z.object({
      id_star_system: z.number().optional(),
    }),
    execute: async (args: {
      id_star_system?: number;
    }) => {
      // console.log("Fetching orbits with arguments:", args);
  
      // Construct query parameters dynamically
      const queryParams = new URLSearchParams();
      Object.entries(args).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
  
      const queryString = queryParams.toString();
      const apiUrl = `https://api.uexcorp.space/2.0/orbits${queryString ? `?${queryString}` : ''}`;
      // console.log("API URL:", apiUrl);
  
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error("Failed to fetch orbits:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        // Define Zod schema for validation
        const schema = z.object({
          status: z.literal("ok"),
          data: z.array(
            z.object({
              id: z.number(),
              id_star_system: z.number().nullable(),
              id_faction: z.number().nullable(),
              id_jurisdiction: z.number().nullable(),
              name: z.string(),
              name_origin: z.string().nullable(),
              code: z.string().nullable(),
              is_available: z.number().nullable(),
              is_available_live: z.number().nullable(),
              is_visible: z.number().nullable(),
              is_default: z.number().nullable(),
              is_lagrange: z.number().nullable(),
              is_man_made: z.number().nullable(),
              is_asteroid: z.number().nullable(),
              is_planet: z.number().nullable(),
              is_star: z.number().nullable(),
              date_added: z.number().nullable(),
              date_modified: z.number().nullable(),
              star_system_name: z.string().nullable(),
              faction_name: z.string().nullable(),
              jurisdiction_name: z.string().nullable(),
            })
          ),
        });
  
        // Validate the response data against the schema
        const parsedData = schema.safeParse(responseData);
        if (!parsedData.success) {
          console.warn("Invalid data format:", parsedData.error.errors);
          return { error: "Invalid data format received from the API." };
        }
  
        const data = parsedData.data.data; // Extract validated data
        // console.log(`Fetched ${data.length} entries from orbits API.`);
  
        // Chunk the data into smaller parts if necessary
        const chunkSize = 200;
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        // console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks };
      } catch (error) {
        console.error("Error fetching orbits:", error);
        return { error: "An unexpected error occurred while fetching orbits." };
      }
    },
  },    

  getOutposts: {
    description: "Retrieve a list of outposts.",
    parameters: z.object({
      id_star_system: z.number().optional(),
      id_faction: z.number().optional(),
      id_jurisdiction: z.number().optional(),
      id_planet: z.number().optional(),
      id_orbit: z.number().optional(),
      id_moon: z.number().optional(),
    }),
    execute: async (args: {
      id_star_system?: number;
      id_faction?: number;
      id_jurisdiction?: number;
      id_planet?: number;
      id_orbit?: number;
      id_moon?: number;
    }) => {
      // console.log("Fetching outposts with arguments:", args);
  
      // Construct query parameters dynamically
      const queryParams = new URLSearchParams();
      Object.entries(args).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
  
      const queryString = queryParams.toString();
      const apiUrl = `https://api.uexcorp.space/2.0/outposts${queryString ? `?${queryString}` : ''}`;
      // console.log("API URL:", apiUrl);
  
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error("Failed to fetch outposts:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        // Define Zod schema for validation
        const schema = z.object({
          status: z.literal("ok"),
          data: z.array(
            z.object({
              id: z.number(),
              id_star_system: z.number().nullable(),
              id_planet: z.number().nullable(),
              id_orbit: z.number().nullable(),
              id_moon: z.number().nullable(),
              id_faction: z.number().nullable(),
              id_jurisdiction: z.number().nullable(),
              name: z.string(),
              nickname: z.string().nullable(),
              is_available: z.number().nullable(),
              is_available_live: z.number().nullable(),
              is_visible: z.number().nullable(),
              is_default: z.number().nullable(),
              is_monitored: z.number().nullable(),
              is_armistice: z.number().nullable(),
              is_landable: z.number().nullable(),
              is_decommissioned: z.number().nullable(),
              has_quantum_marker: z.number().nullable(),
              has_trade_terminal: z.number().nullable(),
              has_habitation: z.number().nullable(),
              has_refinery: z.number().nullable(),
              has_cargo_center: z.number().nullable(),
              has_clinic: z.number().nullable(),
              has_food: z.number().nullable(),
              has_shops: z.number().nullable(),
              has_refuel: z.number().nullable(),
              has_repair: z.number().nullable(),
              has_gravity: z.number().nullable(),
              has_loading_dock: z.number().nullable(),
              has_docking_port: z.number().nullable(),
              has_freight_elevator: z.number().nullable(),
              pad_types: z.string().nullable(),
              date_added: z.number().nullable(),
              date_modified: z.number().nullable(),
              star_system_name: z.string().nullable(),
              planet_name: z.string().nullable(),
              orbit_name: z.string().nullable(),
              moon_name: z.string().nullable(),
              faction_name: z.string().nullable(),
              jurisdiction_name: z.string().nullable(),
            })
          ),
        });
  
        // Validate the response data against the schema
        const parsedData = schema.safeParse(responseData);
        if (!parsedData.success) {
          console.warn("Invalid data format:", parsedData.error.errors);
          return { error: "Invalid data format received from the API." };
        }
  
        const data = parsedData.data.data; // Extract validated data
        // console.log(`Fetched ${data.length} entries from outposts API.`);
  
        // Chunk the data into smaller parts if necessary
        const chunkSize = 1000;
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        // console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks };
      } catch (error) {
        console.error("Error fetching outposts:", error);
        return { error: "An unexpected error occurred while fetching outposts." };
      }
    },
  },
  

  getPlanets: {
    description: "Retrieve a list of planets.",
    parameters: z.object({
      id_star_system: z.number().optional(),
    }),
    execute: async (args: { id_star_system?: number }) => {
      // console.log("Fetching planets with arguments:", args);
  
      const queryParams = new URLSearchParams();
      if (args.id_star_system !== undefined) {
        queryParams.append("id_star_system", args.id_star_system.toString());
      }
  
      const queryString = queryParams.toString();
      const apiUrl = `https://api.uexcorp.space/2.0/planets${queryString ? `?${queryString}` : ''}`;
  
      // console.log("Query parameters for planets API:", queryString);
      // console.log("API URL:", apiUrl);
  
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error("Failed to fetch planets:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
        
  
        if (responseData.status !== 'ok' || !Array.isArray(responseData.data)) {
          console.warn("Planets API returned empty or invalid data:", responseData);
          return { error: "No valid data available in response." };
        }
  
        const data = responseData.data;
        // console.log(`Fetched ${data.length} entries from planets API`);
  
        const chunkSize = 200;
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
  
        // console.log(`Chunked data into ${chunks.length} chunks of size ${chunkSize}`);
        return { result: chunks };
      } catch (error) {
        console.error("Error fetching planets:", error);
        return { error: "An unexpected error occurred" };
      }
    },
  },
  

};

export type Instruction = string;

export type Commodity = {
  id: string;
  name: string;
  code: string;
};

export type Location = {
  id: string;
  starSystem_id: string;
  planet_id: string;
  moon_id: string;
  spaceStation_id: string;
  outpost_id: string;
  city_id: string;
  name: string;
  starSystem_name: string;
  planet_name: string;
  moon_name: string;
  spaceStation_name: string;
  city_name: string;
};

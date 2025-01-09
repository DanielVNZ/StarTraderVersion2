import { z } from "zod";
import fs from 'fs';

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
    description:
      "Retrieve commodity buy prices and available stock for a specific commodity or location. Use this tool to help the user find the best buy location for a specific commodity.",
    parameters: z.object({
      id_commodity: z.number().optional().describe("ID of the commodity to buy"),
      userSCU: z.number().min(1).describe("SCU capacity of the user's cargo"),
    }),
    execute: async (args: { id_commodity?: number; userSCU: number }) => {
      console.log("Fetching buy commodity prices with arguments:", args);
  
      // Construct query parameters dynamically
      const queryParams = new URLSearchParams();
      Object.entries(args).forEach(([key, value]) => {
        if (value !== undefined && key !== "userSCU") {
          queryParams.append(key, value.toString());
        }
      });
  
      const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?${queryParams.toString()}`;
      console.log("API URL:", apiUrl);
  
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
  
        // Filter and prioritize buy locations
        const userSCU = args.userSCU; // SCU capacity provided by the user
        const filteredData = parsedData.data.data
          .filter(
            (item) =>
              item.price_buy !== null &&
              item.scu_buy !== null &&
              item.scu_buy >= userSCU // Strict check for sufficient stock
          )
          .map((item) => {
            const totalCost = item.price_buy! * userSCU; // Total cost for the specified SCU
  
            return {
              terminal_name: item.terminal_name,
              terminal_code: item.terminal_code,
              price_buy: item.price_buy,
              star_system_name: item.star_system_name,
              scu_buy: item.scu_buy,
              user_scu: userSCU, // Include the user's SCU in the output
              total_cost: totalCost,
            };
          });
  
        // Sort by total cost (or price_buy as a secondary sort)
        const sortedData = filteredData.sort((a, b) => {
          if (a.total_cost !== b.total_cost) {
            return a.total_cost - b.total_cost; // Prioritize lower total cost
          }
          return a.price_buy! - b.price_buy!; // Tie-break by lower price
        });
  
        // Return the best buy location
        const bestBuyLocation = sortedData.length > 0 ? sortedData[0] : null;
  
        if (!bestBuyLocation) {
          return { error: "No buy locations found with sufficient stock for the commodity." };
        }
  
        console.log("Best buy location calculated:", bestBuyLocation);
  
        // Log the result to a JSON file
        const logFilePath = "./getBuyCommodityPrices_output.json";
        fs.writeFileSync(
          logFilePath,
          JSON.stringify({ best_buy_location: bestBuyLocation }, null, 2),
          "utf-8"
        );
        console.log(`Output logged to ${logFilePath}`);
  
        return { best_buy_location: bestBuyLocation };
      } catch (error) {
        console.error("Error fetching commodity buy prices:", error);
  
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
  
        const errorLogFilePath = "./getBuyCommodityPrices_error.json";
        fs.writeFileSync(
          errorLogFilePath,
          JSON.stringify({ error: errorMessage }, null, 2),
          "utf-8"
        );
        console.log(`Error logged to ${errorLogFilePath}`);
  
        return { error: "An unexpected error occurred while fetching commodity buy prices." };
      }
    },
  },


getSellCommodityPrices: {
  description:
    "Retrieve commodity sell prices and demand for a specific commodity or location. Use this tool to help the user find the best sell location for a specific commodity.",
  parameters: z.object({
    id_commodity: z.number().optional().describe("ID of the commodity to sell"),
    userSCU: z.number().min(1).describe("SCU capacity of the user's cargo"),
  }),
  execute: async (args: { id_commodity?: number; userSCU: number }) => {
    console.log("Fetching sell commodity prices with arguments:", args);

    // Construct query parameters dynamically
    const queryParams = new URLSearchParams();
    Object.entries(args).forEach(([key, value]) => {
      if (value !== undefined && key !== "userSCU") {
        queryParams.append(key, value.toString());
      }
    });

    const apiUrl = `https://api.uexcorp.space/2.0/commodities_prices?${queryParams.toString()}`;
    console.log("API URL:", apiUrl);

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

      // Filter and prioritize sell locations
      const userSCU = args.userSCU; // SCU capacity provided by the user
      const filteredData = parsedData.data.data
        .filter(
          (item) =>
            item.price_sell !== null &&
            item.scu_sell !== null &&
            item.scu_sell > 0 // Ensure there is sell demand
        )
        .map((item) => {
          const maxSCU = Math.min(item.scu_sell!, userSCU); // Consider partial sales
          const totalIncome = item.price_sell! * maxSCU;

          return {
            terminal_name: item.terminal_name,
            terminal_code: item.terminal_code,
            price_sell: item.price_sell,
            star_system_name: item.star_system_name,
            scu_sell: item.scu_sell,
            max_scu_sellable: maxSCU,
            total_income: totalIncome,
          };
        });

      // Sort by total income (or price_sell as a secondary sort)
      const sortedData = filteredData.sort((a, b) => {
        if (b.total_income !== a.total_income) {
          return b.total_income - a.total_income; // Prioritize higher income
        }
        return b.price_sell! - a.price_sell!; // Tie-break by higher price
      });

      // Return the best sell location
      const bestSellLocation = sortedData.length > 0 ? sortedData[0] : null;

      if (!bestSellLocation) {
        return { error: "No sell locations found with sufficient demand for the commodity." };
      }

      console.log("Best sell location calculated:", bestSellLocation);

      // Log the result to a JSON file
      const logFilePath = "./getSellCommodityPrices_output.json";
      fs.writeFileSync(
        logFilePath,
        JSON.stringify({ best_sell_location: bestSellLocation }, null, 2),
        "utf-8"
      );
      console.log(`Output logged to ${logFilePath}`);

      return { best_sell_location: bestSellLocation };
    } catch (error) {
      console.error("Error fetching commodity sell prices:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const errorLogFilePath = "./getSellCommodityPrices_error.json";
      fs.writeFileSync(
        errorLogFilePath,
        JSON.stringify({ error: errorMessage }, null, 2),
        "utf-8"
      );
      console.log(`Error logged to ${errorLogFilePath}`);

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

  getTerminals: {
    description: "Retrieve a list of terminals with their names and associated star systems. Use this tool to provide terminal information for commodity trading.",
    parameters: z.object({}),
    execute: async () => {
        // API URL
        const apiUrl = "https://api.uexcorp.space/2.0/terminals?type=commodity";

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.error("Failed to fetch terminals:", response.statusText);
                return { error: `Failed to fetch data: ${response.statusText}` };
            }

            const responseData = await response.json();

            // Zod schema to validate response
            const schema = z.object({
                status: z.literal("ok"),
                data: z.array(
                    z.object({
                        name: z.string().nullable(),
                        star_system_name: z.string().nullable(),
                    })
                ),
            });

            const parsedData = schema.safeParse(responseData);
            if (!parsedData.success) {
                console.warn("Invalid terminal data format:", parsedData.error.errors);
                return { error: "Invalid terminal data format received from the API." };
            }

            // Extract and return the terminal data
            const data = parsedData.data.data.map(item => ({
                name: item.name,
                star_system_name: item.star_system_name,
            }));

            return { result: data };
        } catch (error) {
            console.error("Error fetching terminals:", error);
            return { error: "An unexpected error occurred while fetching terminal data." };
        }
    },
  },

  getCommoditiesPricesAll: {
    description: "Retrieve a list of all commodity prices and calculate the most profitable trade route.",
    parameters: z.object({
      userSCU: z.number().min(1).describe("Ship SCU capacity"),
      userFunds: z.number().min(1).describe("User's available funds in aUEC"),
    }),
    execute: async ({ userSCU, userFunds }: { userSCU: number; userFunds: number }) => {
      console.log("Fetching getCommoditiesPricesAll...");
  
      const apiUrl = "https://api.uexcorp.space/2.0/commodities_prices_all";
      console.log("API URL for getCommoditiesPricesAll:", apiUrl);
  
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error("Failed to fetch all commodity prices:", response.statusText);
          return { error: `Failed to fetch data: ${response.statusText}` };
        }
  
        const responseData = await response.json();
  
        // Define Zod schema for validation
        const schema = z.object({
          status: z.literal("ok"),
          data: z.array(
            z.object({
              price_buy: z.number().nullable(),
              price_sell: z.number().nullable(),
              scu_buy: z.number().nullable(),
              scu_sell: z.number().nullable(),
              commodity_name: z.string().nullable(),
              terminal_name: z.string().nullable(),
            })
          ),
        });
  
        // Validate the response data against the schema
        const parsedData = schema.safeParse(responseData);
        if (!parsedData.success) {
          console.warn("Invalid data format:", parsedData.error.errors);
          return { error: "Invalid data format received from the API." };
        }
  
        const filteredData = parsedData.data.data.filter(
          (item) => !(item.price_buy === 0 && item.price_sell === 0) // Exclude items where both prices are 0
        );
  
        interface Route {
          commodity_name: string;
          buy_location: string;
          sell_location: string;
          buy_price_per_scu: number;
          sell_price_per_scu: number;
          scu_traded: number;
          total_investment: number;
          expected_profit: number;
          profit_per_scu: number;
          buy_stock_available: number;
          sell_stock_available: number;
        }
  
        const calculateMostProfitableRoute = (
          data: any[],
          userSCU: number,
          userFunds: number
        ): Route | null => {
          const routes: Route[] = [];
  
          data.forEach((buy) => {
            if (!buy.price_buy || !buy.scu_buy) return;
  
            data.forEach((sell) => {
              if (
                buy.commodity_name === sell.commodity_name &&
                sell.price_sell &&
                sell.scu_sell &&
                buy.terminal_name !== sell.terminal_name
              ) {
                // Iterate over all possible SCU values up to the user's SCU limit
                for (let tradedSCU = 1; tradedSCU <= Math.min(buy.scu_buy, sell.scu_sell, userSCU); tradedSCU++) {
                  const totalCost = buy.price_buy * tradedSCU;
  
                  if (totalCost > userFunds) continue;
  
                  const totalIncome = sell.price_sell * tradedSCU;
                  const totalProfit = totalIncome - totalCost;
                  const profitPerSCU = sell.price_sell - buy.price_buy;
  
                  routes.push({
                    commodity_name: buy.commodity_name,
                    buy_location: buy.terminal_name,
                    sell_location: sell.terminal_name,
                    buy_price_per_scu: buy.price_buy,
                    sell_price_per_scu: sell.price_sell,
                    scu_traded: tradedSCU,
                    total_investment: totalCost,
                    expected_profit: totalProfit,
                    profit_per_scu: profitPerSCU,
                    buy_stock_available: buy.scu_buy, // Include stock available at buy location
                    sell_stock_available: sell.scu_sell, // Include stock available at sell location
                  });
                }
              }
            });
          });
  
          // Sort by total profit, prioritize higher profits regardless of SCU used
          routes.sort((a, b) => b.expected_profit - a.expected_profit);
  
          return routes.length > 0 ? routes[0] : null;
        };
  
        const bestRoute = calculateMostProfitableRoute(filteredData, userSCU, userFunds);
  
        // Log the output to a JSON file
        const logFilePath = "./getCommoditiesPricesAll_output.json";
        const outputData = bestRoute
          ? { best_route: bestRoute }
          : { error: "No profitable routes found with the current constraints." };
  
        fs.writeFileSync(logFilePath, JSON.stringify(outputData, null, 2), "utf-8");
        console.log(`Output logged to ${logFilePath}`);
  
        if (!bestRoute) {
          return { error: "No profitable routes found with the current constraints." };
        }
  
        console.log("Most profitable route calculated:", bestRoute);
  
        return { best_route: bestRoute };
      } catch (error) {
        console.error("Error fetching or processing data:", error);
  
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
  
        const errorLogFilePath = "./getCommoditiesPricesAll_error.json";
        fs.writeFileSync(
          errorLogFilePath,
          JSON.stringify({ error: errorMessage }, null, 2),
          "utf-8"
        );
        console.log(`Error logged to ${errorLogFilePath}`);
  
        return { error: "An error occurred while processing the request." };
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
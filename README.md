# MCBE Realm API 

This project is an Express server that interacts with the Minecraft Realms API. It allows you to retrieve information about Minecraft Realms using a realm code.

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/lunary-net/mcbe-realm-api.git
    cd realms-api-server
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Create a `settings.json` file in the root of the project with the following structure:

    ```json
    {
      "port": 3000
    }
    ```

4. Ensure you have the required `data/client/database.json` file for storing realm information.

## Usage

1. Start the server:

    ```sh
    npm start
    ```

2. The server will run on `http://localhost:3000`.

3. Use the following endpoint to get information about a realm using a realm code:

    ```http
    GET /api/realms/:realmCode
    ```

## Endpoints

### GET /api/realms/:realmCode

Retrieves information about a specific realm using the provided realm code.

- **Path Parameters:**
  - `realmCode` (string): The code of the realm you want to retrieve information about.

- **Response:**
  - `200 OK`: Returns realm information in JSON format.
  - `404 Not Found`: If the realm code is not found.
  - `500 Internal Server Error`: If an error occurs while retrieving realm information.

## Error Handling

The server includes custom error handling middleware:

- **500 Internal Server Error:** If an error occurs during request processing.
- **404 Not Found:** For invalid routes.

## Dependencies

- express
- prismarine-auth
- prismarine-realms
- app-xbox-live
- bedrock-protocol
- fs

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


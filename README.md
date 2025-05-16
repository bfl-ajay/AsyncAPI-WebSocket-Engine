# AsyncAPI WebSocket Engine

## Description

A Node.js engine that auto-generates WebSocket API handlers and SQL integration from an [AsyncAPI](https://www.asyncapi.com/) YAML spec. Supports MySQL, stored procedures, and JSON schema validation.

## Features

- AsyncAPI-driven handler and schema generation
- MySQL integration with connection pooling
- JSON schema validation using Ajv
- Dynamic WebSocket message routing
- Easy extensibility via AsyncAPI spec

## Project Structure

```
.
├── asyncapi.yaml           # AsyncAPI specification
├── generator.js            # Code generator script
├── server.js               # WebSocket server entrypoint
├── utils/
│   ├── db.js               # MySQL connection pool
│   └── validate.js         # JSON schema validation
├── generated/
│   ├── handlers/           # Auto-generated handler files
│   ├── index.js            # Dynamic message router
│   └── schemaMap.json      # Channel-to-schema map
├── .env                    # Environment variables (not committed)
├── .env.example            # Example environment variables
├── package.json
└── schema.sql              # Example MySQL schema & procedures
```

## Getting Started

Follow these steps to set up and run the project.

### Installation

Install dependencies:

```sh
npm install
```

### Configuration

Copy `.env.example` to `.env` and edit as needed:

```sh
cp .env.example .env
```

Update the values in `.env` to match your environment:

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=yourpassword
DB_NAME=userdb
```

### Database Setup

Run the SQL in `schema.sql` on your MySQL server:

```sh
mysql -u root -p < schema.sql
```

### Handler Generation

Generate handlers from your AsyncAPI spec:

```sh
npm run generate
```

### Running the Server

Start the WebSocket server:

```sh
npm start
```

## Usage

Connect to the WebSocket server at `ws://localhost:3000` and send messages like:

```json
{
  "channel": "user/create",
  "payload": {
    "name": "Alice",
    "email": "alice@example.com",
    "password": "secret"
  }
}
```

The server validates the payload and executes the corresponding SQL or stored procedure.

## Extending / Customization

- Edit `asyncapi.yaml` to add or modify channels, SQL queries, or procedures.
- Run `npm run generate` to update handlers and schemas.

## Dependencies

- [@asyncapi/parser](https://www.npmjs.com/package/@asyncapi/parser)
- [ajv](https://www.npmjs.com/package/ajv)
- [mysql2](https://www.npmjs.com/package/mysql2)
- [ws](https://www.npmjs.com/package/ws)
- [dotenv](https://www.npmjs.com/package/dotenv)

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements or bug fixes.

## License

MIT

## Contact / Support

For questions or support, please open an issue in this repository.

---

**Note:**  
- The `.env` file is excluded from version control as specified in `.gitignore`.  
- Use `.env.example` as a template for your environment variables.

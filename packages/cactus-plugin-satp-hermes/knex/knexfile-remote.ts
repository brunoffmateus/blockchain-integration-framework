import path from "path";
import { v4 as uuidv4 } from "uuid";

// default configuration for knex
module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, ".dev-remote.sqlite3"),
    },
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
    },
    useNullAsDefault: true,
  },
};
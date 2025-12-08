// Load environment variables FIRST before any imports
import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import app from "./src/App";
import connectDB from "@database/connection";
import socketService from "@services/socket/socket.service";
import logger from "@utils/logger";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
socketService.initialize(httpServer);

// Connect to database and start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
      );
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Set server timeout to 10 minutes for video uploads
    httpServer.timeout = 600000; // 10 minutes
    httpServer.keepAliveTimeout = 610000; // Slightly higher than timeout
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

// Start the server
startServer();

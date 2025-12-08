import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { errorHandler, notFound } from "@middleware/error-handler.middleware";
import { apiLimiter } from "@middleware/rate-limiter";
import authRoutes from "@routes/auth.routes";
import userRoutes from "@routes/user.routes";
import notificationRoutes from "@routes/notification.routes";
import postRoutes from "@routes/post.routes";
import commentRoutes from "@routes/comment.routes";
import savedRoutes from "@routes/saved.routes";
import messageRoutes from "@routes/message.routes";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware - increased limits for video uploads
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Rate limiting
app.use("/api/", apiLimiter);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/messages", messageRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;

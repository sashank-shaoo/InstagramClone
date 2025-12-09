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
const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((o) =>
  o.trim()
) || ["http://localhost:3000"];
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
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

"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Upload, X, MapPin, Film, ImageIcon, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { postApi, getErrorMessage } from "@/lib/api";

type MediaType = "image" | "video" | null;

// Compress image using canvas
async function compressImage(
  file: File,
  maxWidth: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Return original if compression fails
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function CreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [compressionStats, setCompressionStats] = useState<{
    original: number;
    compressed: number;
    saved: number;
  } | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setError("Please select an image or video file");
        return;
      }

      // Max size: 50MB for images, 100MB for videos
      const maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File must be less than ${isVideo ? "100MB" : "50MB"}`);
        return;
      }

      setError("");
      setOriginalFile(file);
      setMediaType(isVideo ? "video" : "image");
      setPreview(URL.createObjectURL(file));

      // For videos, just use the original file but show size info
      if (isVideo) {
        setSelectedFile(file);
        setCompressionStats(null);
        // Show warning for large videos
        if (file.size > 30 * 1024 * 1024) {
          setError(
            `Large video (${formatFileSize(
              file.size
            )}). Upload may take a few minutes. For faster uploads, try recording at 720p or shorter clips.`
          );
        }
        return;
      }

      // Compress images automatically
      if (isImage && file.size > 500 * 1024) {
        // Only compress if > 500KB
        setIsCompressing(true);
        try {
          const compressedFile = await compressImage(file);
          const savedBytes = file.size - compressedFile.size;

          if (savedBytes > 0) {
            setCompressionStats({
              original: file.size,
              compressed: compressedFile.size,
              saved: savedBytes,
            });
            setSelectedFile(compressedFile);
          } else {
            setSelectedFile(file);
            setCompressionStats(null);
          }
        } catch {
          setSelectedFile(file);
          setCompressionStats(null);
        } finally {
          setIsCompressing(false);
        }
      } else {
        setSelectedFile(file);
        setCompressionStats(null);
      }
    },
    []
  );

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setOriginalFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    setMediaType(null);
    setCompressionStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleFileSelect({
          target: input,
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError("");
    setUploadProgress(0);

    try {
      // Stage indicators
      setUploadStage("Preparing...");
      setUploadProgress(10);

      const postData = {
        media: selectedFile,
        caption: caption,
        location: location || undefined,
      };

      setUploadStage("Uploading...");
      setUploadProgress(30);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // Use appropriate API based on media type
      if (mediaType === "video") {
        setUploadStage("Processing video...");
        await postApi.createVideoPost(postData);
      } else {
        await postApi.createImagePost(postData);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStage("Complete!");

      // Small delay before redirect - go back to previous page
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (err) {
      setError(getErrorMessage(err));
      setUploadProgress(0);
      setUploadStage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        padding: "0 var(--space-4)",
      }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--space-4) 0",
          borderBottom: "1px solid var(--border-light)",
          marginBottom: "var(--space-6)",
        }}>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "600" }}>
          {mediaType === "video" ? "Create Reel" : "Create Post"}
        </h1>
        {selectedFile && !isCompressing && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!selectedFile || isCompressing}>
            {mediaType === "video" ? "Share Reel" : "Share"}
          </Button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
            background: "rgba(237, 73, 86, 0.1)",
            border: "1px solid var(--accent-red)",
            borderRadius: "var(--radius-md)",
            color: "var(--accent-red)",
            fontSize: "var(--text-sm)",
          }}>
          {error}
        </div>
      )}

      {!selectedFile ? (
        /* Upload Area */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-16)",
            border: "2px dashed var(--border-color)",
            borderRadius: "var(--radius-xl)",
            cursor: "pointer",
            textAlign: "center",
            transition: "all var(--transition-fast)",
            background: "var(--bg-secondary)",
            minHeight: "400px",
          }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "var(--radius-full)",
              background:
                "linear-gradient(135deg, var(--accent-blue) 0%, #833AB4 50%, var(--accent-red) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "var(--space-6)",
            }}>
            <Upload size={36} style={{ color: "white" }} />
          </div>
          <p
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "500",
              marginBottom: "var(--space-2)",
            }}>
            Drag photos and videos here
          </p>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              marginBottom: "var(--space-4)",
            }}>
            Videos will be published as Reels
          </p>
          <Button variant="primary" type="button">
            Select from device
          </Button>
        </div>
      ) : (
        /* Preview & Caption */
        <div>
          {/* Compressing indicator */}
          {isCompressing && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-3)",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-4)",
              }}>
              <Zap
                size={16}
                style={{
                  color: "var(--accent-blue)",
                  animation: "pulse 1s infinite",
                }}
              />
              <span style={{ fontSize: "var(--text-sm)" }}>
                Optimizing image...
              </span>
            </div>
          )}

          {/* Compression stats */}
          {compressionStats && !isCompressing && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-3)",
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-4)",
              }}>
              <Check size={16} style={{ color: "#22c55e" }} />
              <span style={{ fontSize: "var(--text-sm)", color: "#22c55e" }}>
                Optimized: {formatFileSize(compressionStats.original)} →{" "}
                {formatFileSize(compressionStats.compressed)}
                (saved{" "}
                {Math.round(
                  (compressionStats.saved / compressionStats.original) * 100
                )}
                %)
              </span>
            </div>
          )}

          {/* Upload progress */}
          {isLoading && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-2)",
                }}>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                  }}>
                  {uploadStage}
                </span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "600" }}>
                  {uploadProgress}%
                </span>
              </div>
              <div
                style={{
                  height: "4px",
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                }}>
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    background:
                      "linear-gradient(90deg, var(--accent-blue) 0%, #833AB4 100%)",
                    borderRadius: "var(--radius-full)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Media Type Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              marginBottom: "var(--space-4)",
              padding: "var(--space-2) var(--space-3)",
              background:
                mediaType === "video"
                  ? "linear-gradient(135deg, #833AB4 0%, var(--accent-red) 100%)"
                  : "var(--bg-tertiary)",
              borderRadius: "var(--radius-full)",
              width: "fit-content",
            }}>
            {mediaType === "video" ? (
              <>
                <Film size={16} style={{ color: "white" }} />
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "600",
                    color: "white",
                  }}>
                  Reel
                </span>
              </>
            ) : (
              <>
                <ImageIcon size={16} style={{ color: "var(--text-primary)" }} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "600" }}>
                  Photo{" "}
                  {selectedFile && `(${formatFileSize(selectedFile.size)})`}
                </span>
              </>
            )}
          </div>

          {/* Media Preview */}
          <div
            style={{
              position: "relative",
              marginBottom: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              background: "var(--bg-tertiary)",
            }}>
            {mediaType === "video" ? (
              <video
                src={preview!}
                controls
                style={{
                  width: "100%",
                  maxHeight: "500px",
                  objectFit: "contain",
                }}
              />
            ) : (
              <Image
                src={preview!}
                alt="Preview"
                width={500}
                height={500}
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "cover",
                }}
                unoptimized
              />
            )}
            <button
              onClick={handleRemoveFile}
              disabled={isLoading}
              style={{
                position: "absolute",
                top: "var(--space-3)",
                right: "var(--space-3)",
                width: "36px",
                height: "36px",
                background: "rgba(0, 0, 0, 0.7)",
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.5 : 1,
                transition: "background var(--transition-fast)",
              }}>
              <X size={20} />
            </button>
          </div>

          {/* Caption */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              maxLength={2200}
              rows={4}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "var(--space-4)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-lg)",
                fontSize: "var(--text-base)",
                resize: "none",
                outline: "none",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                lineHeight: "1.5",
                opacity: isLoading ? 0.7 : 1,
              }}
            />
            <p
              style={{
                textAlign: "right",
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                marginTop: "var(--space-2)",
              }}>
              {caption.length}/2,200
            </p>
          </div>

          {/* Location */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "var(--space-6)",
              opacity: isLoading ? 0.7 : 1,
            }}>
            <MapPin
              size={20}
              style={{ color: "var(--text-secondary)", flexShrink: 0 }}
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              disabled={isLoading}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "var(--text-base)",
                background: "transparent",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Info for Videos */}
          {mediaType === "video" && selectedFile && (
            <div
              style={{
                padding: "var(--space-4)",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-lg)",
                marginBottom: "var(--space-6)",
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-2)",
                }}>
                <Film size={16} style={{ color: "var(--accent-blue)" }} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "600" }}>
                  Reel • {formatFileSize(selectedFile.size)}
                </span>
              </div>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-secondary)",
                  lineHeight: "1.5",
                }}>
                This video will appear in the Reels section.
                {selectedFile.size > 20 * 1024 * 1024 && (
                  <span
                    style={{ display: "block", marginTop: "var(--space-1)" }}>
                    💡 Tip: For faster uploads, use 720p quality or trim your
                    video.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            fullWidth
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!selectedFile || isCompressing}
            style={{
              padding: "var(--space-4)",
              fontSize: "var(--text-base)",
              fontWeight: "600",
            }}>
            {isLoading
              ? uploadStage
              : mediaType === "video"
              ? "Share Reel"
              : "Share Post"}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

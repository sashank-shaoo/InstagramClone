"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store/auth-store";
import { userApi, getErrorMessage } from "@/lib/api";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    bio: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        username: user.username || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    setIsUploadingPhoto(true);
    setError("");

    try {
      const response = await userApi.uploadProfilePhoto(file);
      if (response.data?.profilePhoto) {
        updateUser({ profilePhoto: response.data.profilePhoto });
        setSuccess("Profile photo updated!");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.profilePhoto) return;

    setIsUploadingPhoto(true);
    setError("");

    try {
      await userApi.deleteProfilePhoto();
      updateUser({ profilePhoto: "" });
      setSuccess("Profile photo removed!");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await userApi.updateProfile({
        fullName: formData.fullName,
        username: formData.username,
        bio: formData.bio,
      });

      if (response.data?.user) {
        updateUser(response.data.user);
        setSuccess("Profile updated successfully!");

        const newUsername = response.data.user.username;
        if (newUsername !== user?.username) {
          setTimeout(() => {
            router.push(`/profile/${newUsername}`);
          }, 1000);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4) 0",
          borderBottom: "1px solid var(--border-light)",
          marginBottom: "var(--space-6)",
        }}>
        <button
          onClick={() => router.back()}
          style={{ color: "var(--text-primary)" }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: "var(--text-lg)", fontWeight: "600" }}>
          Edit profile
        </h1>
      </div>

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
            background: "rgba(237, 73, 86, 0.1)",
            border: "1px solid var(--accent-red)",
            borderRadius: "var(--radius-sm)",
            color: "var(--accent-red)",
            fontSize: "var(--text-sm)",
          }}>
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "var(--space-3)",
            marginBottom: "var(--space-4)",
            background: "rgba(88, 195, 34, 0.1)",
            border: "1px solid var(--accent-green)",
            borderRadius: "var(--radius-sm)",
            color: "var(--accent-green)",
            fontSize: "var(--text-sm)",
          }}>
          {success}
        </div>
      )}

      {/* Profile Photo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}>
        <div style={{ position: "relative" }}>
          <Avatar src={user?.profilePhoto} name={user?.fullName} size="xl" />
          {isUploadingPhoto && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0, 0, 0, 0.5)",
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <Loader2
                size={24}
                style={{ color: "white", animation: "spin 1s linear infinite" }}
              />
            </div>
          )}
        </div>

        <div>
          <p style={{ fontWeight: "600", marginBottom: "var(--space-1)" }}>
            {user?.username}
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "600",
                color: "var(--accent-blue)",
              }}>
              Change photo
            </button>
            {user?.profilePhoto && (
              <>
                <span style={{ color: "var(--text-secondary)" }}>•</span>
                <button
                  onClick={handleDeletePhoto}
                  disabled={isUploadingPhoto}
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "600",
                    color: "var(--accent-red)",
                  }}>
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        style={{ display: "none" }}
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Input
            label="Name"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Name"
          />
        </div>

        <div style={{ marginBottom: "var(--space-4)" }}>
          <Input
            label="Username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            hint="You can change your username once every 14 days"
          />
        </div>

        <div style={{ marginBottom: "var(--space-6)" }}>
          <label
            style={{
              display: "block",
              fontSize: "var(--text-sm)",
              fontWeight: "500",
              color: "var(--text-primary)",
              marginBottom: "var(--space-2)",
            }}>
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Bio"
            maxLength={150}
            rows={3}
            style={{
              width: "100%",
              padding: "var(--space-3)",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-sm)",
              resize: "none",
              outline: "none",
              color: "var(--text-primary)",
            }}
          />
          <p
            style={{
              textAlign: "right",
              fontSize: "var(--text-xs)",
              color: "var(--text-secondary)",
              marginTop: "var(--space-1)",
            }}>
            {formData.bio.length}/150
          </p>
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          Submit
        </Button>
      </form>
    </div>
  );
}

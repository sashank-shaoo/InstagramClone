"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { messageApi, userApi, getErrorMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import { socketClient } from "@/lib/socket";
import { Loader2, ArrowLeft, Send, Plus, X, Search } from "lucide-react";
import type { Conversation, Message } from "@/lib/api/messages";

interface FollowingUser {
  id: string;
  username: string;
  fullName: string;
  profilePhoto?: string;
  isOnline?: boolean;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const response = await messageApi.getConversations(1, 50);
        if (response.data?.conversations) {
          setConversations(response.data.conversations);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoadingConversations(false);
      }
    };
    fetchConversations();
  }, []);

  // Fetch followed users for new chat
  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const response = await userApi.getFollowingWithStatus();
        if (response.data?.users) {
          setFollowingUsers(response.data.users);
        }
      } catch (err) {
        console.error("Failed to fetch following users:", err);
      }
    };
    fetchFollowing();
  }, []);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await messageApi.getMessages(
          selectedConversation.id,
          1,
          100
        );
        if (response.data?.messages) {
          setMessages(response.data.messages);
        }
        await messageApi.markAsRead(selectedConversation.id);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket.io listener for real-time messages
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleNewMessage = (data: {
      conversationId: string;
      message: Message;
    }) => {
      // If we're in this conversation, add the message
      if (selectedConversation?.id === data.conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }

      // Update conversation list
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              lastMessage: {
                text: data.message.text,
                sender:
                  data.message.sender.id || (data.message.sender as any)._id,
                createdAt: data.message.createdAt,
              },
              lastMessageAt: data.message.createdAt,
              unreadCount:
                selectedConversation?.id === data.conversationId
                  ? conv.unreadCount
                  : conv.unreadCount + 1,
            };
          }
          return conv;
        });
        // Sort by lastMessageAt
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
        );
      });
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || isSending) return;
    setIsSending(true);
    try {
      const response = await messageApi.sendMessage(selectedConversation.id, {
        text: messageText.trim(),
      });
      if (response.data?.message) {
        setMessages((prev) => [...prev, response.data!.message]);
        setMessageText("");

        // Update conversation list
        setConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv.id === selectedConversation.id) {
              return {
                ...conv,
                lastMessage: {
                  text: messageText.trim(),
                  sender: user?.id || "",
                  createdAt: new Date().toISOString(),
                },
                lastMessageAt: new Date().toISOString(),
              };
            }
            return conv;
          });
          return updated.sort(
            (a, b) =>
              new Date(b.lastMessageAt).getTime() -
              new Date(a.lastMessageAt).getTime()
          );
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    try {
      const response = await messageApi.getOrCreateConversation(userId);
      if (response.data?.conversation) {
        const newConv = response.data.conversation;

        // Check if conversation already exists
        const existingIdx = conversations.findIndex((c) => c.id === newConv.id);
        if (existingIdx === -1) {
          setConversations((prev) => [newConv, ...prev]);
        }

        setSelectedConversation(newConv);
        setShowNewChat(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter following users by search query
  const filteredFollowing = followingUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - var(--nav-height-mobile) - var(--space-8))",
        margin: "calc(-1 * var(--space-4))",
      }}>
      {/* Conversation List */}
      <div
        className="conversation-list"
        style={{
          width: "100%",
          borderRight: "1px solid var(--border-light)",
          display: selectedConversation ? "none" : "flex",
          flexDirection: "column",
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--border-light)",
          }}>
          <span style={{ fontWeight: "600" }}>Messages</span>
          <button
            onClick={() => setShowNewChat(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}>
            <Plus size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {isLoadingConversations ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "var(--space-8)",
              }}>
              <Loader2
                size={24}
                style={{
                  animation: "spin 1s linear infinite",
                  color: "var(--text-secondary)",
                }}
              />
            </div>
          ) : conversations.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-8)",
                color: "var(--text-secondary)",
              }}>
              <p>No messages yet</p>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  marginTop: "var(--space-2)",
                }}>
                Click + to start a conversation
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}>
                <Avatar
                  src={conv.user?.profilePhoto}
                  name={conv.user?.fullName || "User"}
                  size="lg"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: "600", fontSize: "var(--text-sm)" }}>
                    {conv.user?.username}
                  </p>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                    {conv.lastMessage?.text || "No messages"}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-secondary)",
                    }}>
                    {conv.lastMessageAt &&
                      formatRelativeTime(conv.lastMessageAt)}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div
                      style={{
                        background: "var(--accent-blue)",
                        color: "white",
                        fontSize: "var(--text-xs)",
                        padding: "2px 6px",
                        borderRadius: "var(--radius-full)",
                        marginTop: "var(--space-1)",
                      }}>
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="chat-area"
        style={{
          flex: 1,
          display: selectedConversation ? "flex" : "none",
          flexDirection: "column",
        }}>
        {selectedConversation && (
          <>
            {/* Chat Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-4)",
                borderBottom: "1px solid var(--border-light)",
              }}>
              <button
                onClick={() => setSelectedConversation(null)}
                className="back-button"
                style={{
                  color: "var(--text-primary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}>
                <ArrowLeft size={24} />
              </button>
              <Avatar
                src={selectedConversation.user?.profilePhoto}
                name={selectedConversation.user?.fullName}
                size="sm"
              />
              <div>
                <p style={{ fontWeight: "600", fontSize: "var(--text-sm)" }}>
                  {selectedConversation.user?.username}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)" }}>
              {isLoadingMessages ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "var(--space-8)",
                  }}>
                  <Loader2
                    size={24}
                    style={{
                      animation: "spin 1s linear infinite",
                      color: "var(--text-secondary)",
                    }}
                  />
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-8)",
                    color: "var(--text-secondary)",
                  }}>
                  <p>No messages yet</p>
                  <p style={{ fontSize: "var(--text-sm)" }}>
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: msg.isMine ? "flex-end" : "flex-start",
                      marginBottom: "var(--space-2)",
                    }}>
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-xl)",
                        background: msg.isMine
                          ? "var(--accent-blue)"
                          : "var(--bg-tertiary)",
                        color: msg.isMine ? "white" : "var(--text-primary)",
                      }}>
                      <p style={{ fontSize: "var(--text-sm)" }}>{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-3) var(--space-4)",
                borderTop: "1px solid var(--border-light)",
              }}>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message..."
                style={{
                  flex: 1,
                  padding: "var(--space-3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isSending}
                style={{
                  padding: "var(--space-2)",
                  color: messageText.trim()
                    ? "var(--accent-blue)"
                    : "var(--text-secondary)",
                  opacity: isSending ? 0.5 : 1,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}>
                <Send size={24} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)",
          }}
          onClick={() => setShowNewChat(false)}>
          <div
            style={{
              background: "var(--bg-primary)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: "400px",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-4)",
                borderBottom: "1px solid var(--border-light)",
              }}>
              <h2 style={{ fontWeight: "600" }}>New Message</h2>
              <button
                onClick={() => setShowNewChat(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}>
                <X size={24} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "var(--space-3) var(--space-4)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                }}>
                <Search size={18} style={{ color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            {/* Following Users List */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredFollowing.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-6)",
                    color: "var(--text-secondary)",
                  }}>
                  <p>No users found</p>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      marginTop: "var(--space-2)",
                    }}>
                    Follow users to message them
                  </p>
                </div>
              ) : (
                filteredFollowing.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartConversation(u.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) var(--space-4)",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}>
                    <div style={{ position: "relative" }}>
                      <Avatar
                        src={u.profilePhoto}
                        name={u.fullName}
                        size="md"
                      />
                      {u.isOnline && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            width: "12px",
                            height: "12px",
                            background: "#22c55e",
                            borderRadius: "50%",
                            border: "2px solid var(--bg-primary)",
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <p
                        style={{
                          fontWeight: "600",
                          fontSize: "var(--text-sm)",
                        }}>
                        {u.username}
                      </p>
                      <p
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-secondary)",
                        }}>
                        {u.fullName}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive */}
      <style jsx>{`
        @media (min-width: 768px) {
          .conversation-list {
            width: 350px !important;
            display: flex !important;
          }
          .chat-area {
            display: flex !important;
          }
          .back-button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * app.js — Scaler Persona Chatbot Application Logic
 * Uses Groq API with Llama 3.3 70B model (groq.com — free tier available)
 * API key stored in localStorage only — never hardcoded
 */

"use strict";

/* =============================================
   STATE
   ============================================= */
let currentPersona = "anshuman";
let conversationHistory = []; // [ { role: "user"|"assistant", content: "..." } ]  — OpenAI/Groq format
let isLoading = false;

/* =============================================
   DOM REFS
   ============================================= */
const $ = (id) => document.getElementById(id);
const messagesContainer = $("messages-container");
const welcomeScreen = $("welcome-screen");
const messageInput = $("message-input");
const sendBtn = $("send-btn");
const typingIndicator = $("typing-indicator");
const typingAvatar = $("typing-avatar");
const typingText = $("typing-text");
const errorBanner = $("error-banner");
const errorMessage = $("error-message");
const errorClose = $("error-close");
const apiKeyInput = $("api-key-input");
const saveKeyBtn = $("save-key-btn");
const headerAvatar = $("header-avatar");
const headerName = $("header-name");
const headerRole = $("header-role");
const welcomeAvatar = $("welcome-avatar");
const welcomeName = $("welcome-name");
const welcomeSubtitle = $("welcome-subtitle");
const chipsGrid = $("chips-grid");
const clearBtn = $("clear-btn");
const sidebarToggle = $("sidebar-toggle");
const sidebar = $("sidebar");
const appWrapper = document.querySelector(".app-wrapper");

/* =============================================
   INITIALISATION
   ============================================= */
function init() {
  // Load saved API key
  const savedKey = localStorage.getItem("groq_api_key");
  if (savedKey) {
    apiKeyInput.value = savedKey;
    apiKeyInput.setAttribute("placeholder", "API key saved ✓");
  }

  // Set initial persona
  applyPersona("anshuman");

  // Wire event listeners
  sendBtn.addEventListener("click", handleSend);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  messageInput.addEventListener("input", handleInputResize);
  errorClose.addEventListener("click", hideError);
  clearBtn.addEventListener("click", clearConversation);
  saveKeyBtn.addEventListener("click", saveApiKey);

  // Persona button listeners
  document.querySelectorAll(".persona-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const personaId = btn.dataset.persona;
      if (personaId !== currentPersona) {
        switchPersona(personaId);
      }
    });
  });

  // Mobile sidebar
  sidebarToggle.addEventListener("click", toggleSidebar);
  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      e.target !== sidebarToggle
    ) {
      closeSidebar();
    }
  });

  // Input enable/disable
  messageInput.addEventListener("input", updateSendBtn);
}

/* =============================================
   PERSONA MANAGEMENT
   ============================================= */
function applyPersona(personaId) {
  const persona = PERSONAS[personaId];
  if (!persona) return;
  currentPersona = personaId;

  // Update document theme class
  document.body.className = persona.themeClass;

  // Update header
  headerAvatar.textContent = persona.avatar;
  headerAvatar.className = `header-avatar ${persona.avatarClass}`;
  headerName.textContent = persona.name;
  headerRole.textContent = persona.role;

  // Update welcome screen
  welcomeAvatar.textContent = persona.avatar;
  welcomeAvatar.className = `welcome-avatar ${persona.avatarClass}`;
  welcomeName.textContent = persona.name;
  welcomeSubtitle.textContent = persona.welcomeSubtitle;

  // Update typing indicator
  typingAvatar.textContent = persona.avatar;
  typingAvatar.className = `typing-avatar ${persona.avatarClass}`;
  typingText.textContent = `${persona.name.split(" ")[0]} is thinking...`;

  // Update input placeholder
  messageInput.setAttribute("placeholder", persona.inputPlaceholder);

  // Update sidebar buttons
  document.querySelectorAll(".persona-btn").forEach((btn) => {
    const isActive = btn.dataset.persona === personaId;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive.toString());
  });

  // Render chips
  renderChips(persona.chips);
}

function switchPersona(personaId) {
  // Reset conversation
  conversationHistory = [];
  // Clear messages and show welcome
  clearMessagesUI();
  applyPersona(personaId);

  // Close mobile sidebar
  if (window.innerWidth <= 768) closeSidebar();
}

function clearConversation() {
  conversationHistory = [];
  clearMessagesUI();
}

function clearMessagesUI() {
  // Remove all message nodes but keep welcome screen
  const messages = messagesContainer.querySelectorAll(".message");
  messages.forEach((m) => m.remove());
  welcomeScreen.style.display = "flex";
  hideError();
}

/* =============================================
   CHIPS
   ============================================= */
function renderChips(chips) {
  chipsGrid.innerHTML = "";
  chips.forEach((text) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = text;
    btn.addEventListener("click", () => {
      messageInput.value = text;
      updateSendBtn();
      handleSend();
    });
    chipsGrid.appendChild(btn);
  });
}

/* =============================================
   SIDEBAR (MOBILE)
   ============================================= */
function toggleSidebar() {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function openSidebar() {
  sidebar.classList.add("open");
  // Add overlay
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", closeSidebar);
  }
  overlay.classList.add("visible");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  const overlay = document.querySelector(".sidebar-overlay");
  if (overlay) overlay.classList.remove("visible");
}

/* =============================================
   API KEY MANAGEMENT
   ============================================= */
function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showError("Please enter a valid Groq API key.");
    return;
  }
  localStorage.setItem("groq_api_key", key);
  saveKeyBtn.textContent = "Saved ✓";
  saveKeyBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
  setTimeout(() => {
    saveKeyBtn.textContent = "Save";
    saveKeyBtn.style.background = "";
  }, 2000);
}

function getApiKey() {
  return localStorage.getItem("groq_api_key") || apiKeyInput.value.trim() || (typeof GROQ_API_KEY !== "undefined" ? GROQ_API_KEY : "");
}

/* =============================================
   MESSAGE HANDLING
   ============================================= */
async function handleSend() {
  const text = messageInput.value.trim();
  if (!text || isLoading) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    showError(
      "No API key found. Please enter your Groq API key in the sidebar and click Save. Get a free key at groq.com"
    );
    return;
  }

  // Hide welcome screen on first message
  welcomeScreen.style.display = "none";

  // Add user message to UI
  appendMessage("user", text);

  // Add to history (Groq/OpenAI format)
  conversationHistory.push({ role: "user", content: text });

  // Clear input
  messageInput.value = "";
  handleInputResize();
  updateSendBtn();

  // Show typing
  showTyping();
  isLoading = true;
  hideError();

  try {
    const reply = await callGroqAPI(apiKey);
    conversationHistory.push({ role: "assistant", content: reply });
    appendMessage("ai", reply);
  } catch (err) {
    showError(formatApiError(err));
    // Remove the last user message from history so they can retry
    conversationHistory.pop();
  } finally {
    hideTyping();
    isLoading = false;
    updateSendBtn();
    scrollToBottom();
  }
}

/* =============================================
   GROQ API CALL (Llama 3.3 70B)
   ============================================= */
async function callGroqAPI(apiKey) {
  const persona = PERSONAS[currentPersona];
  const MODEL = "llama-3.3-70b-versatile";
  const API_URL = "https://api.groq.com/openai/v1/chat/completions";

  // Build messages array — Groq uses OpenAI-compatible format
  // System message first, then the conversation history
  const messages = [
    { role: "system", content: persona.systemPrompt },
    ...conversationHistory,
  ];

  const requestBody = {
    model: MODEL,
    messages,
    temperature: 0.85,
    max_tokens: 1024,
    top_p: 0.95,
    stream: false,
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg =
      errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errMsg);
  }

  const data = await response.json();

  // Extract text from OpenAI-compatible response
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq API.");

  return text;
}

function formatApiError(err) {
  const msg = err.message || "Unknown error";
  if (msg.includes("invalid_api_key") || msg.includes("Invalid API Key") || msg.includes("401")) {
    return "Invalid Groq API key. Please check your key in the sidebar. Get a free key at groq.com";
  }
  if (msg.includes("rate_limit") || msg.includes("quota") || msg.includes("429")) {
    return "Groq rate limit reached. Please wait a moment and try again — Groq free tier resets quickly!";
  }
  if (msg.includes("404") || msg.includes("model")) {
    return "Model not found. Please check your Groq API key has access to Llama 3.3 70B.";
  }
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }
  return `Error: ${msg}`;
}

/* =============================================
   UI HELPERS
   ============================================= */
function appendMessage(role, text) {
  const persona = PERSONAS[currentPersona];
  const isUser = role === "user";

  const msgEl = document.createElement("div");
  msgEl.className = `message ${isUser ? "user-message" : "ai-message"}`;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isUser) {
    msgEl.innerHTML = `
      <div class="user-avatar-bubble">🧑</div>
      <div class="msg-content">
        <span class="msg-sender">You</span>
        <div class="msg-bubble">${escapeHTML(text)}</div>
        <span class="msg-time">${timeStr}</span>
      </div>
    `;
  } else {
    msgEl.innerHTML = `
      <div class="msg-avatar ${persona.avatarClass}">${persona.avatar}</div>
      <div class="msg-content">
        <span class="msg-sender">${persona.name.split(" ")[0]}</span>
        <div class="msg-bubble">${formatMarkdown(text)}</div>
        <span class="msg-time">${timeStr}</span>
      </div>
    `;
  }

  messagesContainer.appendChild(msgEl);
  scrollToBottom();
}

function formatMarkdown(text) {
  // Simple markdown-like formatting
  let html = escapeHTML(text);
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Code inline: `text`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Newlines to <br> and paragraphs
  html = html
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return html;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function showTyping() {
  typingIndicator.classList.add("visible");
  typingIndicator.setAttribute("aria-hidden", "false");
  scrollToBottom();
}

function hideTyping() {
  typingIndicator.classList.remove("visible");
  typingIndicator.setAttribute("aria-hidden", "true");
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.add("visible");
  errorBanner.setAttribute("aria-hidden", "false");
}

function hideError() {
  errorBanner.classList.remove("visible");
  errorBanner.setAttribute("aria-hidden", "true");
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

function handleInputResize() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
}

function updateSendBtn() {
  const hasText = messageInput.value.trim().length > 0;
  sendBtn.disabled = !hasText || isLoading;
}

/* =============================================
   BOOT
   ============================================= */
document.addEventListener("DOMContentLoaded", init);

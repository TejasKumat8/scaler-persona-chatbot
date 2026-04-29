/**
 * app.js — Scaler Persona Chatbot Application Logic
 * Uses Google Gemini API (gemini-1.5-flash or gemini-2.0-flash-exp)
 * API key stored in localStorage only — never hardcoded
 */

"use strict";

/* =============================================
   STATE
   ============================================= */
let currentPersona = "anshuman";
let conversationHistory = []; // [ { role: "user"|"model", parts: [{text}] } ]
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
  const savedKey = localStorage.getItem("gemini_api_key");
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
    showError("Please enter a valid API key.");
    return;
  }
  localStorage.setItem("gemini_api_key", key);
  saveKeyBtn.textContent = "Saved ✓";
  saveKeyBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
  setTimeout(() => {
    saveKeyBtn.textContent = "Save";
    saveKeyBtn.style.background = "";
  }, 2000);
}

function getApiKey() {
  return localStorage.getItem("gemini_api_key") || apiKeyInput.value.trim();
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
      "No API key found. Please enter your Gemini API key in the sidebar and click Save."
    );
    return;
  }

  // Hide welcome screen on first message
  welcomeScreen.style.display = "none";

  // Add user message to UI
  appendMessage("user", text);

  // Add to history
  conversationHistory.push({ role: "user", parts: [{ text }] });

  // Clear input
  messageInput.value = "";
  handleInputResize();
  updateSendBtn();

  // Show typing
  showTyping();
  isLoading = true;
  hideError();

  try {
    const reply = await callGeminiAPI(apiKey, text);
    conversationHistory.push({ role: "model", parts: [{ text: reply }] });
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
   GEMINI API CALL
   ============================================= */
async function callGeminiAPI(apiKey, userText) {
  const persona = PERSONAS[currentPersona];
  const MODEL = "gemini-2.0-flash";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  // Build request body — Gemini uses system_instruction + multi-turn contents
  const requestBody = {
    system_instruction: {
      parts: [{ text: persona.systemPrompt }],
    },
    contents: conversationHistory,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
      candidateCount: 1,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg =
      errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errMsg);
  }

  const data = await response.json();

  // Extract text from response
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new Error("No response generated.");
  if (candidate.finishReason === "SAFETY") {
    throw new Error("Response blocked by safety filters. Try rephrasing your question.");
  }

  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from API.");

  return text;
}

function formatApiError(err) {
  const msg = err.message || "Unknown error";
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key")) {
    return "Invalid API key. Please check your Gemini API key in the sidebar.";
  }
  if (msg.includes("QUOTA_EXCEEDED") || msg.includes("quota")) {
    return "API quota exceeded. Please check your Gemini API usage limits.";
  }
  if (msg.includes("404")) {
    return "Model not found. Please check your API key has access to Gemini 2.0 Flash.";
  }
  if (msg.includes("fetch") || msg.includes("network")) {
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

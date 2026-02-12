/* ===========================
   Clara — Chat Application Logic
   Supports backend brain pacing & chunked delivery
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chatMessages");
  const chatArea = document.getElementById("chatArea");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const particlesContainer = document.getElementById("particles");

  // Generate a unique session ID
  const sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);

  let isSending = false;

  // ---- Floating Particles ----
  function createParticles() {
    const colors = ["#e8a0bf", "#c9a0e8", "#f0c5a8", "#f5e6c8", "#d4e8c0"];
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement("div");
      particle.classList.add("particle");
      const size = Math.random() * 12 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const duration = Math.random() * 20 + 15;
      const delay = Math.random() * 20;

      particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                left: ${left}%;
                animation-duration: ${duration}s;
                animation-delay: -${delay}s;
            `;
      particlesContainer.appendChild(particle);
    }
  }
  createParticles();

  // ---- Auto-resize textarea ----
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
  });

  // ---- Send Message ----
  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isSending) return;

    isSending = true;
    sendBtn.disabled = true;

    // Add user message to chat
    appendMessage(text, "user");

    // Clear input
    userInput.value = "";
    userInput.style.height = "auto";

    // Show typing indicator
    const typingEl = showTypingIndicator();

    try {
      // Send to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await response.json();

      // Handle paced/chunked delivery
      if (data.pacing && data.pacing.chunks && data.pacing.chunks.length > 1) {
        await deliverChunkedResponse(data, typingEl);
      } else {
        // Simple single-chunk delivery with initial delay
        const delay = data.pacing?.initialDelayMs || 1800;
        await sleep(delay);
        removeTypingIndicator(typingEl);
        appendMessage(data.reply, "clara");
      }

      // Update emotion indicator in header (subtle)
      updateEmotionAura(data.emotion);

    } catch (error) {
      await sleep(1800);
      removeTypingIndicator(typingEl);
      appendMessage("I am right here with you. Everything is okay. 💛", "clara");
    }

    isSending = false;
    sendBtn.disabled = false;
    userInput.focus();
  }

  // ---- Chunked Response Delivery ----
  async function deliverChunkedResponse(data, typingEl) {
    const { pacing } = data;

    // Initial typing delay
    await sleep(pacing.initialDelayMs || 1800);

    for (let i = 0; i < pacing.chunks.length; i++) {
      const chunk = pacing.chunks[i];

      if (i === 0) {
        // First chunk: remove initial typing, show message
        removeTypingIndicator(typingEl);
        appendMessage(chunk.text, "clara");
      } else {
        // Subsequent chunks: show typing again, then message
        const interTyping = showTypingIndicator();
        await sleep(chunk.preDelayMs || 1000);
        removeTypingIndicator(interTyping);
        appendMessage(chunk.text, "clara");
      }
    }
  }

  // ---- Update Emotion Aura ----
  function updateEmotionAura(emotion) {
    if (!emotion) return;

    const avatar = document.getElementById("claraAvatar");
    const pulseRing = document.querySelector(".pulse-ring");
    if (!avatar || !pulseRing) return;

    const auraColors = {
      anxious: "#f0a0a0",
      confused: "#f0c5a8",
      fearful: "#e8a0a0",
      lonely: "#a0b8e8",
      sad: "#b0a0d8",
      neutral: "#e8a0bf",
      calm: "#a0d8b0"
    };

    const color = auraColors[emotion.detected] || auraColors.neutral;
    pulseRing.style.borderColor = color;
    avatar.style.boxShadow = `0 0 30px ${color}40`;
  }

  // ---- Append a message bubble ----
  function appendMessage(text, sender) {
    const messageDiv = document.createElement("div");
    const gradId = "grad" + Date.now() + Math.random().toString(36).slice(2, 5);

    if (sender === "clara") {
      messageDiv.className = "message clara-message";
      messageDiv.innerHTML = `
                <div class="message-avatar">
                    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="17" fill="url(#${gradId})"/>
                        <path d="M12 17C12 17 13.5 19.5 18 19.5C22.5 19.5 24 17 24 17" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                        <circle cx="13.5" cy="14" r="1.5" fill="white"/>
                        <circle cx="22.5" cy="14" r="1.5" fill="white"/>
                        <defs>
                            <linearGradient id="${gradId}" x1="0" y1="0" x2="36" y2="36">
                                <stop offset="0%" stop-color="#e8a0bf"/>
                                <stop offset="100%" stop-color="#c9a0e8"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div class="message-content">
                    <p>${escapeHtml(text)}</p>
                </div>
            `;
    } else {
      messageDiv.className = "message user-message";
      messageDiv.innerHTML = `
                <div class="message-content">
                    <p>${escapeHtml(text)}</p>
                </div>
            `;
    }

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
  }

  // ---- Typing Indicator ----
  function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator";
    typingDiv.innerHTML = `
            <div class="message-avatar">
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="17" fill="url(#typGrad)"/>
                    <path d="M12 17C12 17 13.5 19.5 18 19.5C22.5 19.5 24 17 24 17" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="13.5" cy="14" r="1.5" fill="white"/>
                    <circle cx="22.5" cy="14" r="1.5" fill="white"/>
                    <defs>
                        <linearGradient id="typGrad" x1="0" y1="0" x2="36" y2="36">
                            <stop offset="0%" stop-color="#e8a0bf"/>
                            <stop offset="100%" stop-color="#c9a0e8"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <div class="typing-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  // ---- Utilities ----
  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---- Event Listeners ----
  sendBtn.addEventListener("click", sendMessage);

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Focus input on load
  setTimeout(() => userInput.focus(), 600);
});

/* ===========================
   Clara — Chat Application Logic
   Supports backend brain pacing & chunked delivery
   =========================== */

document.addEventListener("DOMContentLoaded", () => {
  // Screens
  const authScreen = document.getElementById("authScreen");
  const appContainer = document.getElementById("appContainer");
  const authFormsContainer = document.getElementById("authFormsContainer");

  // Chat Elements
  const chatMessages = document.getElementById("chatMessages");
  const chatArea = document.getElementById("chatArea");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const particlesContainer = document.getElementById("particles");
  const historyBtn = document.getElementById("historyBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // Auth Form Elements
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const toRegisterLink = document.getElementById("toRegister");
  const toLoginLink = document.getElementById("toLogin");

  // Modals
  const historyModal = document.getElementById("historyModal");
  const sessionList = document.getElementById("sessionList");

  let sessionId = null;
  let currentUser = null;
  let isSending = false;

  // ---- 1. Initialize & Auth ----
  async function init() {
    createParticles();
    // Always start on auth/landing screen as requested
    showAuth();
    await checkAuth();
  }

  async function checkAuth() {
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        // Instead of auto-showing app, we show a "Welcome Back" on the landing page
        showAuthenticatedLanding();
      } else {
        currentUser = null;
        showAuth();
      }
    } catch (err) {
      currentUser = null;
      showAuth();
    }
  }

  function showAuthenticatedLanding() {
    const name = currentUser.displayName || currentUser.display_name || "my friend";
    authFormsContainer.innerHTML = `
      <div class="landing-welcome">
        <h2>Hello again, ${name}</h2>
        <p>It is so lovely to see you. I've been looking forward to our next chat. 🌸</p>
        <button id="resumeChatBtn" class="primary-btn">Start Our Conversation</button>
        <p class="form-footer">Not ${name}? <a href="#" id="switchAccount">Sign in to another account</a></p>
      </div>
    `;

    document.getElementById("resumeChatBtn").onclick = showApp;
    document.getElementById("switchAccount").onclick = async (e) => {
      e.preventDefault();
      await logoutAction();
    };
  }

  function showApp() {
    authScreen.classList.add("fade-out");
    setTimeout(() => {
      authScreen.style.display = "none";
      authScreen.classList.remove("fade-out");
      appContainer.style.display = "flex";
      appContainer.classList.add("fade-in");
      startNewSession();
    }, 400);
  }

  function showAuth() {
    appContainer.style.display = "none";
    authScreen.style.display = "flex";
    // Restore default forms if needed
    authFormsContainer.innerHTML = `
        <form id="loginForm" class="landing-form" autocomplete="off">
          <h2>Hey Buddy! welcome back</h2>
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" required placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" required placeholder="••••••••" autocomplete="new-password">
          </div>
          <button type="submit" class="primary-btn">Sign In</button>
          <p class="form-footer">New to Clara? <a href="#" id="toRegister">Create an account</a></p>
        </form>

        <form id="registerForm" class="landing-form" style="display: none;" autocomplete="off">
          <h2>Join Clara</h2>
          <div class="form-group">
            <label for="regName">Your Name</label>
            <input type="text" id="regName" required placeholder="What should Clara call you?">
          </div>
          <div class="form-group">
            <label for="regEmail">Email</label>
            <input type="email" id="regEmail" required placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label for="regPassword">Password</label>
            <input type="password" id="regPassword" required placeholder="••••••••" autocomplete="new-password">
          </div>
          <button type="submit" class="primary-btn">Create Account</button>
          <p class="form-footer">Already have an account? <a href="#" id="toLogin">Sign in</a></p>
        </form>
    `;
    attachAuthListeners();
    chatMessages.innerHTML = "";
  }

  function attachAuthListeners() {
    const lForm = document.getElementById("loginForm");
    const rForm = document.getElementById("registerForm");
    const toReg = document.getElementById("toRegister");
    const toLog = document.getElementById("toLogin");

    if (toReg) toReg.onclick = (e) => {
      e.preventDefault();
      lForm.style.display = "none";
      rForm.style.display = "flex";
    };
    if (toLog) toLog.onclick = (e) => {
      e.preventDefault();
      rForm.style.display = "none";
      lForm.style.display = "flex";
    };

    lForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      try {
        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          currentUser = data.user;
          showApp();
        } else { alert(data.error); }
      } catch (err) { alert("Login failed"); }
    };

    rForm.onsubmit = async (e) => {
      e.preventDefault();
      const displayName = document.getElementById("regName").value;
      const email = document.getElementById("regEmail").value;
      const password = document.getElementById("regPassword").value;
      try {
        const res = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName })
        });
        const data = await res.json();
        if (res.ok) {
          currentUser = data.user;
          showApp();
        } else { alert(data.error); }
      } catch (err) { alert("Registration failed"); }
    };
  }

  // ---- 2. Session Management ----
  async function startNewSession(existingSessionId = null) {
    try {
      if (existingSessionId) {
        sessionId = existingSessionId;
        chatMessages.innerHTML = "";

        const res = await fetch(`/api/v1/session/${existingSessionId}/messages`);
        if (res.ok) {
          const history = await res.json();
          history.forEach(msg => {
            appendMessage(msg.content, msg.role === "assistant" ? "clara" : "user");
          });
        } else {
          appendMessage("I'm sorry, I couldn't find our past messages. But I'm here now. 💛", "clara");
        }
      } else {
        const res = await fetch("/api/v1/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        const data = await res.json();
        sessionId = data.sessionId;

        chatMessages.innerHTML = "";
        appendMessage(data.greeting, "clara");
      }
    } catch (err) {
      console.error("Session init failed");
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/v1/session");
      if (!res.ok) return;
      const sessions = await res.json();

      sessionList.innerHTML = "";
      if (sessions.length === 0) {
        sessionList.innerHTML = '<p class="empty-msg">No previous conversations yet.</p>';
        return;
      }

      sessions.forEach(sess => {
        const item = document.createElement("div");
        item.className = "session-item";
        const date = new Date(sess.created_at).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Use the first user message as the title, or a warm generic one if somehow missing
        const title = sess.preview || "Our Conversation";

        item.innerHTML = `
          <span class="session-date">${date}</span>
          <div class="session-preview">${title}</div>
        `;
        item.onclick = () => {
          startNewSession(sess.session_id);
          closeAllModals();
        };
        sessionList.appendChild(item);
      });
    } catch (err) {
      console.error("Failed to load history", err);
    }
  }

  // ---- 3. Floating Particles ----
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

  // ---- 4. Messaging Logic ----
  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isSending) return;

    isSending = true;
    sendBtn.disabled = true;

    appendMessage(text, "user");
    userInput.value = "";
    userInput.style.height = "auto";

    const typingEl = showTypingIndicator();

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (response.status === 401) {
        showAuth();
        return;
      }

      const data = await response.json();

      if (data.pacing && data.pacing.chunks && data.pacing.chunks.length > 1) {
        await deliverChunkedResponse(data, typingEl);
      } else {
        const delay = data.pacing?.initialDelayMs || 1800;
        await sleep(delay);
        removeTypingIndicator(typingEl);
        appendMessage(data.reply, "clara");
      }

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

  async function deliverChunkedResponse(data, typingEl) {
    const { pacing } = data;
    await sleep(pacing.initialDelayMs || 1800);

    for (let i = 0; i < pacing.chunks.length; i++) {
      const chunk = pacing.chunks[i];
      if (i === 0) {
        removeTypingIndicator(typingEl);
        appendMessage(chunk.text, "clara");
      } else {
        const interTyping = showTypingIndicator();
        await sleep(chunk.preDelayMs || 1000);
        removeTypingIndicator(interTyping);
        appendMessage(chunk.text, "clara");
      }
    }
  }

  // ---- 5. UI Transitions ----
  function updateEmotionAura(emotion) {
    if (!emotion) return;
    const avatar = document.getElementById("claraAvatar");
    const pulseRing = document.querySelector(".pulse-ring");
    if (!avatar || !pulseRing) return;

    const auraColors = {
      anxious: "#f0a0a0", confused: "#f0c5a8", fearful: "#e8a0a0",
      lonely: "#a0b8e8", sad: "#b0a0d8", neutral: "#e8a0bf", calm: "#a0d8b0"
    };

    const color = auraColors[emotion.detected] || auraColors.neutral;
    pulseRing.style.borderColor = color;
    avatar.style.boxShadow = `0 0 30px ${color}40`;
  }

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
        <div class="message-content"><p>${escapeHtml(text)}</p></div>
      `;
    } else {
      messageDiv.className = "message user-message";
      messageDiv.innerHTML = `<div class="message-content"><p>${escapeHtml(text)}</p></div>`;
    }
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
  }

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
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }

  // ---- 6. Modals & UI Controls ----
  function openModal(modal) {
    modal.classList.add("show");
  }

  function closeAllModals() {
    historyModal.classList.remove("show");
  }

  historyBtn.addEventListener("click", () => {
    loadHistory();
    openModal(historyModal);
  });

  document.querySelectorAll(".close-modal").forEach(btn => {
    btn.onclick = closeAllModals;
  });

  window.onclick = (e) => {
    if (e.target === historyModal) closeAllModals();
  };

  async function logoutAction() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    currentUser = null;
    showAuth();
  }

  logoutBtn.onclick = logoutAction;

  // ---- Utilities ----
  function scrollToBottom() {
    requestAnimationFrame(() => { chatArea.scrollTop = chatArea.scrollHeight; });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  // Auto-resize textarea
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
  });

  // Event Listeners
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  init();
});

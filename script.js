// Persona 5 Navigation & Interaction System

// ── App Initialization ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  // ── Detect Brave Browser to override prefers-reduced-motion spoofing ──
  detectBraveAndEnableAnimations();

  // ── Setup Starfield ──
  createStars();
  
  // ── Setup Parallax ──
  setupParallax();

  // ── Setup Clock ──
  updateClock();
  setInterval(updateClock, 1000);

  // ── Sound Engine Bindings ──
  setupAudioToggle();
  bindHoverSounds();

  // ── Key Nav Setup ──
  setupKeyboardNav();

  // ── Chat Form Submit ──
  const chatForm = document.getElementById('phone-chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit();
    });
  }
}

function detectBraveAndEnableAnimations() {
  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    navigator.brave.isBrave().then(isBrave => {
      if (isBrave) {
        document.body.classList.add('allow-animations');
      }
    });
  }
}

// ── State Variables ──
let currentView = 'home';
let isTransitioning = false;
let focusedIndex = 0; // for keyboard nav

// ── Clock Display ──
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  
  document.querySelectorAll('.clock-display').forEach(el => {
    el.textContent = `${h}:${m}:${s}`;
  });
}

// ── Floating Stars Generator ──
function createStars() {
  const starfield = document.getElementById('starfield');
  if (!starfield) return;

  const starCount = 25;
  // Star path SVG
  const starSVGPath = 'M 12 0 L 15.6 7.8 L 24 8.7 L 17.7 14.3 L 19.5 22.5 L 12 18.3 L 4.5 22.5 L 6.3 14.3 L 0 8.7 L 8.4 7.8 Z';

  for (let i = 0; i < starCount; i++) {
    const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    star.setAttribute('viewBox', '0 0 24 24');
    star.classList.add('star');
    if (Math.random() > 0.6) {
      star.classList.add('red-star');
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', starSVGPath);
    star.appendChild(path);

    // Distribute randomly across horizontal screen
    star.style.left = `${Math.random() * 100}%`;
    // Lock to bottom border of view area; negative delay puts animation at randomized offset height immediately
    star.style.top = '100%';
    star.style.animationDuration = `${8 + Math.random() * 15}s`;
    star.style.animationDelay = `${-Math.random() * 15}s`;
    const size = 8 + Math.random() * 20;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;

    starfield.appendChild(star);
  }
}

// ── Parallax Silhouette & Shards Tracking ──
function setupParallax() {
  const homeCharacter = document.getElementById('home-character');
  const homeShards = document.getElementById('home-shards');
  if (!homeCharacter && !homeShards) return;

  window.addEventListener('mousemove', (e) => {
    // Only track during Home View to minimize CPU cycles
    if (currentView !== 'home') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width <= 0 || height <= 0) return; // Prevent division-by-zero causing NaN transforms

    const mouseX = e.clientX - width / 2;
    const mouseY = e.clientY - height / 2;

    // Normalize coordinates (-0.5 to 0.5)
    const normX = mouseX / width;
    const normY = mouseY / height;

    // Character and shards move opposite for depth illusion
    const charX = normX * -25;
    const charY = normY * -15;
    const shardX = normX * 35;
    const shardY = normY * 20;

    if (homeCharacter) {
      homeCharacter.style.transform = `translate3d(${charX}px, ${charY}px, 0)`;
    }
    if (homeShards) {
      homeShards.style.transform = `translate3d(${shardX}px, ${shardY}px, 0)`;
    }
  });
}

// ── Audio Toggle and State ──
function setupAudioToggle() {
  const btn = document.getElementById('audio-toggle-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (window.p5Sounds) {
      const isMuted = window.p5Sounds.toggleMute();
      updateAudioButtonUI(btn, isMuted);
      
      // Play a diagnostic click if unmuted
      if (!isMuted) {
        window.p5Sounds.playTick();
      }
    }
  });
}

function updateAudioButtonUI(btn, isMuted) {
  const labelText = btn.querySelector('.audio-label');
  const iconOn = btn.querySelector('.sound-on-icon');
  const iconOff = btn.querySelector('.sound-off-icon');

  if (isMuted) {
    labelText.textContent = 'SOUND OFF';
    iconOn.style.display = 'none';
    iconOff.style.display = 'block';
  } else {
    labelText.textContent = 'SOUND ON';
    iconOn.style.display = 'block';
    iconOff.style.display = 'none';
  }
}

// ── Sound Effects Trigger Handlers ──
function playTick() {
  if (window.p5Sounds) window.p5Sounds.playTick();
}

function playSelect() {
  if (window.p5Sounds) window.p5Sounds.playSelect();
}

// Bind cursor sound triggers for all clickable elements
function bindHoverSounds() {
  const clickableSelector = '.p5-menu-btn, .p5-action-btn, .p5-back-btn, .compendium-entry, .bubble, .p5-sound-toggle-btn';
  
  document.addEventListener('mouseenter', (e) => {
    if (e.target.matches && e.target.matches(clickableSelector)) {
      playTick();
    }
  }, true);
}

// ── Shutter Transition ──
function transitionToView(viewId, callback) {
  if (isTransitioning) return;
  isTransitioning = true;

  const shutter = document.getElementById('shutter');
  if (shutter) {
    shutter.classList.add('active');
  }

  // Swap view at the peak of the shutter animation (400ms)
  setTimeout(() => {
    if (callback) {
      try {
        callback();
      } catch (err) {
        console.error("Navigation callback error:", err);
      }
    }
    
    // De-activate shutter (always execute)
    setTimeout(() => {
      if (shutter) {
        shutter.classList.remove('active');
      }
      isTransitioning = false;
    }, 180);

  }, 400);
}

// ── Page View Navigation ──
function goTo(viewId) {
  if (currentView === viewId) return;

  // Sound transition
  if (viewId === 'home') {
    if (window.p5Sounds) window.p5Sounds.playCancel();
  } else {
    if (window.p5Sounds) window.p5Sounds.playSelect();
  }

  // Clear typing animations when navigating away from message log
  if (currentView === 'message' && typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  transitionToView(viewId, () => {
    // Hide active views, reveal target
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
    });

    const targetView = document.getElementById('view-' + viewId);
    if (targetView) {
      targetView.classList.add('active');
    }

    currentView = viewId;

    // View specific hooks
    if (viewId === 'message') {
      initPhoneChat();
    } else if (viewId === 'home') {
      // Re-focus keyboard navigation
      updateKeyboardFocus();
    }
  });
}

// Helper from previews
function enterSection(viewId) {
  goTo(viewId);
}

function goHome() {
  goTo('home');
}

// ── Hover Preview Handler ──
function showPreview(sec) {
  if (currentView !== 'home') return;

  document.querySelectorAll('.preview-card').forEach(p => p.classList.remove('active'));
  const card = document.getElementById('preview-' + sec);
  if (card) {
    card.classList.add('active');
  }

  // Update active states on items
  document.querySelectorAll('.p5-menu-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sec);
  });

  // Sync background counter index
  const pageNums = { stats: '01', velvet: '02', mementos: '03', message: '04' };
  const bgNum = document.getElementById('home-bg-num');
  if (bgNum) {
    bgNum.textContent = pageNums[sec] || '01';
  }
}

// ── Selection Click Handler ──
function handleMenuClick(btnEl) {
  const section = btnEl.dataset.section;

  // If the button is already active, enter/navigate to that view
  if (btnEl.classList.contains('active')) {
    goTo(section);
  } else {
    // Select the button first and reveal details
    showPreview(section);

    // Sync focusedIndex so keyboard navigation starts from this button
    const menuButtons = Array.from(document.querySelectorAll('.p5-menu-btn'));
    focusedIndex = menuButtons.indexOf(btnEl);
    updateKeyboardFocus();
    playTick();
  }
}

// ── Sub-Page: Velvet Room Projects Toggle ──
function toggleProjectDetails(entryEl) {
  const isCurrentlyActive = entryEl.classList.contains('active-details');
  playTick();

  // Close all other entries
  document.querySelectorAll('.compendium-entry').forEach(el => {
    el.classList.remove('active-details');
    const details = el.querySelector('.compendium-details');
    if (details) details.style.maxHeight = null;
  });

  if (!isCurrentlyActive) {
    entryEl.classList.add('active-details');
    const details = entryEl.querySelector('.compendium-details');
    if (details) {
      // Set height dynamically for transition
      details.style.maxHeight = details.scrollHeight + 40 + 'px';
    }
  }
}

// ── Sub-Page: Mementos Logs Toggle ──
function toggleLogDetails(cardEl) {
  const isCurrentlyActive = cardEl.classList.contains('active-details');
  playTick();

  // Close all other target cards
  document.querySelectorAll('.target-card').forEach(el => {
    el.classList.remove('active-details');
    const details = el.querySelector('.target-details');
    if (details) details.style.maxHeight = null;
  });

  if (!isCurrentlyActive) {
    cardEl.classList.add('active-details');
    const details = cardEl.querySelector('.target-details');
    if (details) {
      // Set height dynamically for transition
      details.style.maxHeight = details.scrollHeight + 40 + 'px';
    }
  }
}

// ── Sub-Page: Message Log (SMS Chat Sequence) ──
const chatData = [
  { sender: 'EMAIL', value: 'girisambhav321@gmail.com', actionText: 'SEND EMAIL ▶', href: 'mailto:girisambhav321@gmail.com', dir: 'incoming' },
  { sender: 'PHONE', value: '+977 9762648646', actionText: 'CALL DIRECT ▶', href: 'tel:+9779762648646', dir: 'outgoing' },
  { sender: 'GITHUB', value: 'github.com/sambhav777q', actionText: 'OPEN GITHUB ▶', href: 'https://github.com/sambhav777q', dir: 'incoming' }
];

let typingTimeout = null;
let chatFormState = 0; // 0: loading intro, 1: name, 2: email, 3: phone, 4: message
let senderName = '';
let senderEmail = '';
let senderPhone = '';

function initPhoneChat() {
  const body = document.getElementById('phone-screen-body');
  const input = document.getElementById('phone-chat-input');
  const submit = document.getElementById('phone-chat-submit');
  if (!body) return;

  // Reset dialogue state
  chatFormState = 0;
  senderName = '';
  senderEmail = '';
  senderPhone = '';

  // Reset and disable input area during transmission loading
  if (input && submit) {
    input.disabled = true;
    submit.disabled = true;
    input.value = '';
    input.placeholder = 'Receiving transmissions...';
  }

  // Clear any existing typingTimeout BEFORE clearing or spawning bubbles
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  // Clear previous message elements
  body.innerHTML = '';

  // Spawns bubble sequence with typing delays
  let idx = 0;
  
  function nextBubble() {
    if (idx >= chatData.length) {
      // Spawns custom instructions once intro completes
      const systemBubble = document.createElement('div');
      systemBubble.className = 'p5-bubble incoming';
      systemBubble.innerHTML = `
        <div class="bubble-tag">SYSTEM</div>
        <div class="bubble-value">Direct channel access requested. Please authenticate your identity.</div>
      `;
      body.appendChild(systemBubble);
      body.scrollTop = body.scrollHeight;
      playTick();

      // Spawn Name prompt after a tiny delay
      typingTimeout = setTimeout(() => {
        const nameBubble = document.createElement('div');
        nameBubble.className = 'p5-bubble incoming';
        nameBubble.innerHTML = `
          <div class="bubble-tag">SYSTEM</div>
          <div class="bubble-value">Enter your Name:</div>
        `;
        body.appendChild(nameBubble);
        body.scrollTop = body.scrollHeight;
        playTick();

        // Enable input area for Name
        chatFormState = 1;
        if (input && submit) {
          input.disabled = false;
          submit.disabled = false;
          input.placeholder = 'Enter your name...';
          input.focus();
        }
      }, 700);
      return;
    }

    // 1. Spawn Typing Indicators
    const typing = document.createElement('div');
    typing.className = 'p5-typing-container';
    typing.innerHTML = `
      <div class="p5-typing-dot"></div>
      <div class="p5-typing-dot"></div>
      <div class="p5-typing-dot"></div>
    `;
    typing.style.display = 'flex';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    // 2. Resolve Typing indicator and append message bubble
    typingTimeout = setTimeout(() => {
      if (typing.parentNode === body) {
        body.removeChild(typing);
      }
      
      const item = chatData[idx];
      const bubble = document.createElement('a');
      bubble.href = item.href;
      bubble.className = `p5-bubble ${item.dir}`;
      if (item.href.startsWith('http')) {
        bubble.target = '_blank';
        bubble.rel = 'noopener noreferrer';
      }

      // Play click sound on select
      bubble.addEventListener('click', () => {
        playSelect();
      });

      bubble.innerHTML = `
        <div class="bubble-tag">${item.sender}</div>
        <div class="bubble-value">${item.value}</div>
        <div class="bubble-action">${item.actionText}</div>
      `;

      body.appendChild(bubble);
      body.scrollTop = body.scrollHeight;
      playTick();

      idx++;
      typingTimeout = setTimeout(nextBubble, 600);
    }, 800);
  }

  nextBubble();
}

// ── Keyboard Navigation Engine ──
function setupKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    const menuButtons = Array.from(document.querySelectorAll('.p5-menu-btn'));
    
    // Ignore keystrokes when transition is active
    if (isTransitioning) return;

    // Esc returns to Home View
    if (e.key === 'Escape') {
      if (currentView !== 'home') {
        goHome();
      }
      return;
    }

    if (currentView === 'home') {
      if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        focusedIndex = (focusedIndex + 1) % menuButtons.length;
        updateKeyboardFocus();
        playTick();
      } else if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        focusedIndex = (focusedIndex - 1 + menuButtons.length) % menuButtons.length;
        updateKeyboardFocus();
        playTick();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const activeBtn = menuButtons[focusedIndex];
        if (activeBtn) {
          const section = activeBtn.dataset.section;
          goTo(section);
        }
      } else if (e.key === '1') { selectIndex(0); }
      else if (e.key === '2') { selectIndex(1); }
      else if (e.key === '3') { selectIndex(2); }
      else if (e.key === '4') { selectIndex(3); }
    }
  });
}

function selectIndex(index) {
  const menuButtons = document.querySelectorAll('.p5-menu-btn');
  if (index >= 0 && index < menuButtons.length) {
    focusedIndex = index;
    updateKeyboardFocus();
    playTick();
    
    setTimeout(() => {
      const section = menuButtons[index].dataset.section;
      goTo(section);
    }, 150);
  }
}

function updateKeyboardFocus() {
  const menuButtons = document.querySelectorAll('.p5-menu-btn');
  menuButtons.forEach((btn, idx) => {
    if (idx === focusedIndex) {
      btn.classList.add('keyboard-focus');
      showPreview(btn.dataset.section);
    } else {
      btn.classList.remove('keyboard-focus');
    }
  });
}
window.goTo = goTo;
window.goHome = goHome;
window.enterSection = enterSection;
window.showPreview = showPreview;
window.toggleProjectDetails = toggleProjectDetails;
window.toggleLogDetails = toggleLogDetails;
window.handleMenuClick = handleMenuClick;
async function handleFormSubmit() {
  const body = document.getElementById('phone-screen-body');
  const input = document.getElementById('phone-chat-input');
  const submit = document.getElementById('phone-chat-submit');
  if (!body || !input || !submit) return;

  const text = input.value.trim();
  if (text === '') return;

  // Play select slash sound
  playSelect();

  // Reset text field
  input.value = '';

  // ────────────────────────────────────────
  // STATE 1: Enter Name
  // ────────────────────────────────────────
  if (chatFormState === 1) {
    senderName = text;
    input.disabled = true;
    submit.disabled = true;

    // Push Visitor Outgoing Name Bubble
    const outBubble = document.createElement('div');
    outBubble.className = 'p5-bubble outgoing';
    outBubble.innerHTML = `
      <div class="bubble-tag">YOU</div>
      <div class="bubble-value">${escapeHTML(senderName)}</div>
    `;
    body.appendChild(outBubble);
    body.scrollTop = body.scrollHeight;

    // Show system typing for next prompt
    showSystemTyping(body, () => {
      const nextBubble = document.createElement('div');
      nextBubble.className = 'p5-bubble incoming';
      nextBubble.innerHTML = `
        <div class="bubble-tag">SYSTEM</div>
        <div class="bubble-value">Understood, ${escapeHTML(senderName)}. Please enter your Email:</div>
      `;
      body.appendChild(nextBubble);
      body.scrollTop = body.scrollHeight;
      playTick();

      chatFormState = 2;
      input.disabled = false;
      submit.disabled = false;
      input.placeholder = 'Enter your email...';
      input.focus();
    });
    return;
  }

  // ────────────────────────────────────────
  // STATE 2: Enter Email
  // ────────────────────────────────────────
  if (chatFormState === 2) {
    const emailVal = text;
    input.disabled = true;
    submit.disabled = true;

    // Push Visitor Outgoing Email Bubble
    const outBubble = document.createElement('div');
    outBubble.className = 'p5-bubble outgoing';
    outBubble.innerHTML = `
      <div class="bubble-tag">YOU</div>
      <div class="bubble-value">${escapeHTML(emailVal)}</div>
    `;
    body.appendChild(outBubble);
    body.scrollTop = body.scrollHeight;

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      showSystemTyping(body, () => {
        const errBubble = document.createElement('div');
        errBubble.className = 'p5-bubble incoming';
        errBubble.style.borderColor = 'var(--red)';
        errBubble.innerHTML = `
          <div class="bubble-tag" style="color: var(--red);">SYSTEM</div>
          <div class="bubble-value" style="color: var(--red);">Format invalid. Please enter a valid Email address:</div>
        `;
        body.appendChild(errBubble);
        body.scrollTop = body.scrollHeight;
        playTick();

        input.disabled = false;
        submit.disabled = false;
        input.placeholder = 'Enter your email...';
        input.focus();
      });
      return;
    }

    senderEmail = emailVal;
    showSystemTyping(body, () => {
      const nextBubble = document.createElement('div');
      nextBubble.className = 'p5-bubble incoming';
      nextBubble.innerHTML = `
        <div class="bubble-tag">SYSTEM</div>
        <div class="bubble-value">Received. Please enter your Phone Number:</div>
      `;
      body.appendChild(nextBubble);
      body.scrollTop = body.scrollHeight;
      playTick();

      chatFormState = 3;
      input.disabled = false;
      submit.disabled = false;
      input.placeholder = 'Enter your phone number...';
      input.focus();
    });
    return;
  }

  // ────────────────────────────────────────
  // STATE 3: Enter Phone Number
  // ────────────────────────────────────────
  if (chatFormState === 3) {
    senderPhone = text;
    input.disabled = true;
    submit.disabled = true;

    // Push Visitor Outgoing Phone Bubble
    const outBubble = document.createElement('div');
    outBubble.className = 'p5-bubble outgoing';
    outBubble.innerHTML = `
      <div class="bubble-tag">YOU</div>
      <div class="bubble-value">${escapeHTML(senderPhone)}</div>
    `;
    body.appendChild(outBubble);
    body.scrollTop = body.scrollHeight;

    showSystemTyping(body, () => {
      const nextBubble = document.createElement('div');
      nextBubble.className = 'p5-bubble incoming';
      nextBubble.innerHTML = `
        <div class="bubble-tag">SYSTEM</div>
        <div class="bubble-value">Identity verified. Connection secure. Type your message for Sambhav:</div>
      `;
      body.appendChild(nextBubble);
      body.scrollTop = body.scrollHeight;
      playTick();

      chatFormState = 4;
      input.disabled = false;
      submit.disabled = false;
      input.placeholder = 'Type your message...';
      input.focus();
    });
    return;
  }

  // ────────────────────────────────────────
  // STATE 4: Enter Message & POST Request
  // ────────────────────────────────────────
  if (chatFormState === 4) {
    // Disable form inputs
    input.disabled = true;
    submit.disabled = true;
    input.placeholder = 'Sending message...';

    // Append Outgoing Bubble (YOU)
    const outBubble = document.createElement('div');
    outBubble.className = 'p5-bubble outgoing';
    outBubble.innerHTML = `
      <div class="bubble-tag">YOU</div>
      <div class="bubble-value">${escapeHTML(text)}</div>
    `;
    body.appendChild(outBubble);
    body.scrollTop = body.scrollHeight;

    // Spawn Typing dots from SYSTEM
    const typing = document.createElement('div');
    typing.className = 'p5-typing-container';
    typing.innerHTML = `
      <div class="p5-typing-dot"></div>
      <div class="p5-typing-dot"></div>
      <div class="p5-typing-dot"></div>
    `;
    typing.style.display = 'flex';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    try {
      // Send HTTP request to backend Express API
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: senderName,
          email: senderEmail,
          phone: senderPhone,
          message: text
        })
      });

      if (typing.parentNode === body) {
        body.removeChild(typing);
      }

      if (res.ok) {
        // Success response bubble
        const successBubble = document.createElement('div');
        successBubble.className = 'p5-bubble incoming';
        successBubble.innerHTML = `
          <div class="bubble-tag">SYSTEM</div>
          <div class="bubble-value">Message sent successfully! Sambhav will get back to you soon.</div>
        `;
        body.appendChild(successBubble);
      } else {
        throw new Error('API dispatch error');
      }
    } catch (err) {
      console.error(err);
      if (typing.parentNode === body) {
        body.removeChild(typing);
      }
      // Error bubble
      const errorBubble = document.createElement('div');
      errorBubble.className = 'p5-bubble incoming';
      errorBubble.style.borderColor = 'var(--red)';
      errorBubble.innerHTML = `
        <div class="bubble-tag" style="color: var(--red);">SYSTEM ERROR</div>
        <div class="bubble-value" style="color: var(--red);">Delivery failed! Please contact directly via email.</div>
      `;
      body.appendChild(errorBubble);
    }

    // Reset inputs for follow-up texts
    input.disabled = false;
    submit.disabled = false;
    input.placeholder = 'Type your message...';
    body.scrollTop = body.scrollHeight;
    playTick();
  }
}

// Helper: Show bouncing dots briefly during dialogue transition
function showSystemTyping(body, callback) {
  const typing = document.createElement('div');
  typing.className = 'p5-typing-container';
  typing.innerHTML = `
    <div class="p5-typing-dot"></div>
    <div class="p5-typing-dot"></div>
    <div class="p5-typing-dot"></div>
  `;
  typing.style.display = 'flex';
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;

  setTimeout(() => {
    if (typing.parentNode === body) {
      body.removeChild(typing);
    }
    callback();
  }, 700);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

window.initPhoneChat = initPhoneChat;
window.playSelect = playSelect;
window.playTick = playTick;

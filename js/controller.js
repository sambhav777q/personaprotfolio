/* =====================================================================
   CONTROLLER — listens to user input, updates Model, tells View.
   Sambhav Giri — Persona 5 Style Portfolio
   ===================================================================== */

const Controller = {

  transitioning: false,
  audioUnlocked: false,

  // Phone Chat State
  chatData: [
    { sender: 'EMAIL', value: 'girisambhav321@gmail.com', actionText: 'SEND EMAIL ▶', href: 'mailto:girisambhav321@gmail.com', dir: 'incoming' },
    { sender: 'PHONE', value: '+977 9762648646', actionText: 'CALL DIRECT ▶', href: 'tel:+9779762648646', dir: 'outgoing' },
    { sender: 'GITHUB', value: 'github.com/sambhav777q', actionText: 'OPEN GITHUB ▶', href: 'https://github.com/sambhav777q', dir: 'incoming' },
    { sender: 'FIGMA', value: 'RemotePlay UI Prototype', actionText: 'VIEW FIGMA ▶', href: 'https://www.figma.com/proto/sM32RacaNmR7u27FRCTbIj/movie?node-id=76-341&t=h3vayU67GBPKGnRZ-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=1%3A2', dir: 'incoming' }
  ],
  typingTimeout: null,
  chatFormState: 0, // 0: loading intro, 1: name, 2: email, 3: phone, 4: message
  senderName: '',
  senderEmail: '',
  senderPhone: '',
  chatInitialized: false,

  init() {
    View.init();
    this.bindMenu();
    this.bindKeyboard();
    this.bindAudioUnlock();
    this.bindPhoneChat();
  },

  /* ---------- Navigation ---------- */
  goTo(screen) {
    if (this.transitioning || screen === Model.state.screen) return;
    this.transitioning = true;
    this.play();

    View.wipe(
      () => { // mid-wipe: swap screens while covered
        Model.state.screen = screen;
        View.showScreen(screen);
        if (screen === "projects") this.loadProjects();
        if (screen === "skills") this.loadSkills();
        if (screen === "contact") this.initPhoneChat();
      },
      () => { this.transitioning = false; }
    );
  },

  select(index) {
    const n = View.els.menuItems.length;
    const next = (index + n) % n;
    if (next !== Model.state.menuIndex) this.play();
    Model.state.menuIndex = next;
    View.setMenuSelection(next);
  },

  /* ---------- Screen data loading ---------- */
  async loadProjects() {
    View.renderFeatured(Model.featured);
    if (Model.state.reposLoaded) return;
    const { repos, live } = await Model.fetchRepos();
    const status = live
      ? `${repos.length} repositories · live from GitHub`
      : "Showing pinned work · GitHub API unavailable right now";
    View.renderRepos(repos, status, Model);
    Model.state.reposLoaded = true;
  },

  loadSkills() {
    if (!Model.state.skillsBuilt) {
      View.renderSkills(Model.skills);
      Model.state.skillsBuilt = true;
    }
    View.animateSkillBars();
  },

  /* ---------- Sound ---------- */
  play() {
    if (this.audioUnlocked) View.playSelect();
  },

  bindAudioUnlock() {
    const unlock = () => { this.audioUnlocked = true; };
    addEventListener("pointerdown", unlock, { once: true, capture: true });
    addEventListener("keydown", unlock, { once: true, capture: true });
  },

  /* ---------- Input bindings ---------- */
  bindMenu() {
    View.els.menuItems.forEach((item, i) => {
      item.addEventListener("mouseenter", () => this.select(i));
      item.addEventListener("click", () => this.goTo(item.dataset.target));
    });

    document.querySelectorAll("[data-back]").forEach(b =>
      b.addEventListener("click", () => this.goTo("home")));

    // Clicking the name always takes you home
    const bigName = document.getElementById("big-name");
    if (bigName) {
      bigName.addEventListener("click", () => {
        if (Model.state.screen !== "home") this.goTo("home");
        else this.play();
      });
    }
  },

  bindKeyboard() {
    addEventListener("keydown", e => {
      // Don't intercept arrow keys when typing in input
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;

      if (Model.state.screen === "home") {
        if (e.key === "ArrowDown" || e.key === "s") { this.select(Model.state.menuIndex + 1); e.preventDefault(); }
        else if (e.key === "ArrowUp" || e.key === "w") { this.select(Model.state.menuIndex - 1); e.preventDefault(); }
        else if (e.key === "Enter") {
          this.goTo(View.els.menuItems[Model.state.menuIndex].dataset.target);
        }
      } else if (e.key === "Escape") {
        this.goTo("home");
      }
    });
  },

  /* =====================================================================
     ORIGINAL PERSONA 5 SNS PHONE CHAT ENGINE
     ===================================================================== */
  bindPhoneChat() {
    const form = document.getElementById('phone-chat-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      this.handlePhoneFormSubmit();
    });
  },

  initPhoneChat() {
    const body = document.getElementById('phone-screen-body');
    const input = document.getElementById('phone-chat-input');
    const submit = document.getElementById('phone-chat-submit');
    if (!body) return;

    this.chatFormState = 0;
    this.senderName = '';
    this.senderEmail = '';
    this.senderPhone = '';

    if (input && submit) {
      input.disabled = true;
      submit.disabled = true;
      input.value = '';
      input.placeholder = 'Receiving transmissions...';
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    body.innerHTML = '';
    let idx = 0;

    const nextBubble = () => {
      if (idx >= this.chatData.length) {
        const systemBubble = document.createElement('div');
        systemBubble.className = 'p5-bubble incoming';
        systemBubble.innerHTML = `
          <div class="bubble-tag">SYSTEM</div>
          <div class="bubble-value">Direct channel access requested. Please authenticate your identity.</div>
        `;
        body.appendChild(systemBubble);
        body.scrollTop = body.scrollHeight;
        this.play();

        this.typingTimeout = setTimeout(() => {
          const nameBubble = document.createElement('div');
          nameBubble.className = 'p5-bubble incoming';
          nameBubble.innerHTML = `
            <div class="bubble-tag">SYSTEM</div>
            <div class="bubble-value">Enter your Name:</div>
          `;
          body.appendChild(nameBubble);
          body.scrollTop = body.scrollHeight;
          this.play();

          this.chatFormState = 1;
          if (input && submit) {
            input.disabled = false;
            submit.disabled = false;
            input.placeholder = 'Enter your name...';
            input.focus();
          }
        }, 550);
        return;
      }

      // Typing indicators
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

      this.typingTimeout = setTimeout(() => {
        if (typing.parentNode === body) {
          body.removeChild(typing);
        }

        const item = this.chatData[idx];
        const bubble = document.createElement('a');
        bubble.href = item.href;
        bubble.className = `p5-bubble ${item.dir}`;
        if (item.href.startsWith('http')) {
          bubble.target = '_blank';
          bubble.rel = 'noopener noreferrer';
        }

        bubble.addEventListener('click', () => {
          this.play();
        });

        bubble.innerHTML = `
          <div class="bubble-tag">${item.sender}</div>
          <div class="bubble-value">${item.value}</div>
          <div class="bubble-action">${item.actionText}</div>
        `;

        body.appendChild(bubble);
        body.scrollTop = body.scrollHeight;
        this.play();

        idx++;
        this.typingTimeout = setTimeout(nextBubble, 450);
      }, 500);
    };

    nextBubble();
  },

  async handlePhoneFormSubmit() {
    const body = document.getElementById('phone-screen-body');
    const input = document.getElementById('phone-chat-input');
    const submit = document.getElementById('phone-chat-submit');
    if (!body || !input || !submit) return;

    const text = input.value.trim();
    if (text === '') return;

    this.play();
    input.value = '';

    // STATE 1: Enter Name
    if (this.chatFormState === 1) {
      this.senderName = text;
      input.disabled = true;
      submit.disabled = true;

      const outBubble = document.createElement('div');
      outBubble.className = 'p5-bubble outgoing';
      outBubble.innerHTML = `
        <div class="bubble-tag">YOU</div>
        <div class="bubble-value">${this.escapeHTML(this.senderName)}</div>
      `;
      body.appendChild(outBubble);
      body.scrollTop = body.scrollHeight;

      this.showSystemTyping(body, () => {
        const nextBubble = document.createElement('div');
        nextBubble.className = 'p5-bubble incoming';
        nextBubble.innerHTML = `
          <div class="bubble-tag">SYSTEM</div>
          <div class="bubble-value">Understood, ${this.escapeHTML(this.senderName)}. Please enter your Email:</div>
        `;
        body.appendChild(nextBubble);
        body.scrollTop = body.scrollHeight;
        this.play();

        this.chatFormState = 2;
        input.disabled = false;
        submit.disabled = false;
        input.placeholder = 'Enter your email...';
        input.focus();
      });
      return;
    }

    // STATE 2: Enter Email
    if (this.chatFormState === 2) {
      const emailVal = text;
      input.disabled = true;
      submit.disabled = true;

      const outBubble = document.createElement('div');
      outBubble.className = 'p5-bubble outgoing';
      outBubble.innerHTML = `
        <div class="bubble-tag">YOU</div>
        <div class="bubble-value">${this.escapeHTML(emailVal)}</div>
      `;
      body.appendChild(outBubble);
      body.scrollTop = body.scrollHeight;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailVal)) {
        this.showSystemTyping(body, () => {
          const errBubble = document.createElement('div');
          errBubble.className = 'p5-bubble incoming';
          errBubble.style.borderColor = 'var(--red)';
          errBubble.innerHTML = `
            <div class="bubble-tag" style="color:var(--red);">SYSTEM</div>
            <div class="bubble-value" style="color:var(--red);">Format invalid. Please enter a valid Email:</div>
          `;
          body.appendChild(errBubble);
          body.scrollTop = body.scrollHeight;
          this.play();

          input.disabled = false;
          submit.disabled = false;
          input.placeholder = 'Enter your email...';
          input.focus();
        });
        return;
      }

      this.senderEmail = emailVal;
      this.showSystemTyping(body, () => {
        const nextBubble = document.createElement('div');
        nextBubble.className = 'p5-bubble incoming';
        nextBubble.innerHTML = `
          <div class="bubble-tag">SYSTEM</div>
          <div class="bubble-value">Received. Please enter your Phone Number:</div>
        `;
        body.appendChild(nextBubble);
        body.scrollTop = body.scrollHeight;
        this.play();

        this.chatFormState = 3;
        input.disabled = false;
        submit.disabled = false;
        input.placeholder = 'Enter your phone number...';
        input.focus();
      });
      return;
    }

    // STATE 3: Enter Phone Number
    if (this.chatFormState === 3) {
      this.senderPhone = text;
      input.disabled = true;
      submit.disabled = true;

      const outBubble = document.createElement('div');
      outBubble.className = 'p5-bubble outgoing';
      outBubble.innerHTML = `
        <div class="bubble-tag">YOU</div>
        <div class="bubble-value">${this.escapeHTML(this.senderPhone)}</div>
      `;
      body.appendChild(outBubble);
      body.scrollTop = body.scrollHeight;

      this.showSystemTyping(body, () => {
        const nextBubble = document.createElement('div');
        nextBubble.className = 'p5-bubble incoming';
        nextBubble.innerHTML = `
          <div class="bubble-tag">SYSTEM</div>
          <div class="bubble-value">Identity verified. Connection secure. Type your message for Sambhav:</div>
        `;
        body.appendChild(nextBubble);
        body.scrollTop = body.scrollHeight;
        this.play();

        this.chatFormState = 4;
        input.disabled = false;
        submit.disabled = false;
        input.placeholder = 'Type your message...';
        input.focus();
      });
      return;
    }

    // STATE 4: Enter Message & Dispatch
    if (this.chatFormState === 4) {
      input.disabled = true;
      submit.disabled = true;
      input.placeholder = 'Sending message...';

      const outBubble = document.createElement('div');
      outBubble.className = 'p5-bubble outgoing';
      outBubble.innerHTML = `
        <div class="bubble-tag">YOU</div>
        <div class="bubble-value">${this.escapeHTML(text)}</div>
      `;
      body.appendChild(outBubble);
      body.scrollTop = body.scrollHeight;

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

      let success = false;

      // 1. Try local backend
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.senderName,
            email: this.senderEmail,
            phone: this.senderPhone,
            message: text
          })
        });
        if (res.ok) success = true;
      } catch {}

      // 2. Direct Supabase Fallback
      if (!success) {
        try {
          const dbRes = await fetch("https://nefzntxzwxjqwgpcahgw.supabase.co/rest/v1/messages", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZnpudHh6d3hqcXdncGNhaGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDU2NjIsImV4cCI6MjA5NTgyMTY2Mn0.7xD4AQqAsn5v2tU1KNp5P7OZPRMfCgEHNSYfYfEk8MI',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZnpudHh6d3hqcXdncGNhaGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDU2NjIsImV4cCI6MjA5NTgyMTY2Mn0.7xD4AQqAsn5v2tU1KNp5P7OZPRMfCgEHNSYfYfEk8MI',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              name: this.senderName,
              email: this.senderEmail,
              phone: this.senderPhone,
              message: text
            })
          });
          if (dbRes.ok) success = true;
        } catch {}
      }

      // 3. FormSubmit fallback
      if (!success) {
        try {
          const fsRes = await fetch(`https://formsubmit.co/ajax/${Model.contactEmail}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              name: this.senderName,
              email: this.senderEmail,
              phone: this.senderPhone,
              message: text,
              _subject: `Portfolio message from ${this.senderName}`,
            }),
          });
          if (fsRes.ok) success = true;
        } catch {}
      }

      if (typing.parentNode === body) {
        body.removeChild(typing);
      }

      const replyBubble = document.createElement('div');
      replyBubble.className = 'p5-bubble incoming';

      if (success) {
        replyBubble.innerHTML = `
          <div class="bubble-tag">SYSTEM</div>
          <div class="bubble-value">Message sent successfully! I'll get back to you soon.</div>
        `;
      } else {
        replyBubble.style.borderColor = 'var(--red)';
        replyBubble.innerHTML = `
          <div class="bubble-tag" style="color:var(--red);">SYSTEM NOTICE</div>
          <div class="bubble-value">Relay delayed. <a href="mailto:${Model.contactEmail}?subject=Message%20from%20${encodeURIComponent(this.senderName)}&body=${encodeURIComponent(text)}" style="color:var(--red);text-decoration:underline;">Click here to open email directly</a>.</div>
        `;
      }

      body.appendChild(replyBubble);
      body.scrollTop = body.scrollHeight;
      this.play();

      input.disabled = false;
      submit.disabled = false;
      input.placeholder = 'Type another message...';
      input.focus();
    }
  },

  showSystemTyping(body, callback) {
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
    }, 500);
  },

  escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
};

Controller.init();

/* =====================================================================
   MODEL — the data and state of the app. Never touches the DOM.
   Sambhav Giri — Persona 5 Style Portfolio
   ===================================================================== */

const Model = {

  githubUser: "sambhav777q",

  // Where the contact form delivers (via formsubmit.co relay)
  contactEmail: "girisambhav321@gmail.com",

  // App state (read/written by the Controller, displayed by the View)
  state: {
    screen: "home",        // which screen is showing
    menuIndex: 0,          // selected item on the home menu
    reposLoaded: false,
    skillsBuilt: false,
  },

  // ---- Featured projects (hand-written, shown above the GitHub feed) ----
  featured: [
    {
      title: "RemotePlay Movie Streaming",
      tag: "Figma Prototype", color: "#e60012", live: true,
      url: "https://www.figma.com/proto/sM32RacaNmR7u27FRCTbIj/movie?node-id=76-341&t=h3vayU67GBPKGnRZ-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=1%3A2",
      cta: "Launch Figma Prototype →",
      img: "assets/projects/remoteplay.png",
      desc: "A high-fidelity Figma interactive prototype of a next-generation movie streaming client. Designed for seamless content discovery, dynamic slider lists, immersive dark backgrounds, and visual responsiveness.",
    },
    {
      title: "Persona 5 Interactive Portfolio",
      tag: "Live Web App", color: "#3dff6e", live: true,
      url: "https://personaprotfolio.vercel.app",
      cta: "Launch Live App →",
      img: "assets/projects/personaportfolio.png",
      desc: "An interactive portfolio experience inspired by Persona 5's iconic UI, featuring dynamic angled menus, custom ransom typography, ambient animations, sound effects, and GitHub integration.",
    },
    {
      title: "TaskMaster Productivity Hub",
      tag: "Productivity", color: "#f1e05a",
      url: "https://github.com/sambhav777q",
      cta: "View on GitHub →",
      img: "assets/projects/taskmaster.png",
      desc: "A full-stack task organizer tool complete with workflow boards, category structures, urgency sorting, and responsive user settings controls.",
    },
    {
      title: "Portfolio Archive v1",
      tag: "Static HTML/CSS", color: "#3178c6",
      url: "https://github.com/sambhav777q/portfolio",
      cta: "View on GitHub →",
      img: "assets/projects/portfolio-v1.png",
      desc: "The initial iteration of my personal developer space. A responsive landing page detailing personal projects, clean design rules, and direct links.",
    },
  ],

  // Repos already shown in "featured" get hidden from the GitHub feed
  featuredRepoNames: [
    "personaprotfolio",
    "portfolio",
  ],

  // Shown if the GitHub API can't be reached
  fallbackRepos: [
    {
      name: "Discrete-lab", language: "C++", stargazers_count: 0,
      html_url: "https://github.com/sambhav777q/Discrete-lab",
      description: "Lab reports, implementations, algorithms, and practical coursework for Discrete Mathematics and Computer Science.",
    },
    {
      name: "portfolio", language: "HTML", stargazers_count: 0,
      html_url: "https://github.com/sambhav777q/portfolio",
      description: "Personal portfolio website v1 built with responsive HTML and CSS.",
    },
    {
      name: "personaprotfolio", language: "JavaScript", stargazers_count: 0,
      html_url: "https://github.com/sambhav777q/personaprotfolio",
      description: "Passion project: Persona 5 menu screen style portfolio web application.",
    },
  ],

  // Optional thumbnail overrides: repo name → image path.
  // Anything not listed is looked up at assets/projects/<RepoName>.png
  projectImages: {
    // "Discrete-lab": "assets/projects/discrete-lab.png",
  },

  langColors: {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
    PHP: "#4F5D95", CSS: "#663399", HTML: "#e34c26",
    "Jupyter Notebook": "#DA5B0B", MATLAB: "#e16737", Java: "#b07219", C: "#555", "C++": "#f34b7d",
  },

  // ---- Skills screen ----
  skills: [
    { group: "Front-End & UI/UX", items: [
      ["HTML5 / Semantic Web", 85],
      ["CSS3 / Flexbox & Grid / Animations", 82],
      ["JavaScript (ES6+)", 75],
      ["Responsive UI & Layouts", 80],
      ["Figma Prototyping & Design", 80],
    ]},
    { group: "Programming & Core CS", items: [
      ["C / C++", 65],
      ["Data Structures & Algorithms", 70],
      ["Object-Oriented Programming", 72],
      ["Computer Science Theory", 75],
    ]},
    { group: "Tools & Workflow", items: [
      ["Git & GitHub", 78],
      ["VS Code & Development Tools", 85],
      ["Node.js & Express Basics", 68],
      ["Web Audio API / Interactive Systems", 75],
    ]},
    { group: "Languages & Communication", items: [
      ["Nepali (Native)", 100],
      ["English (Fluent)", 90],
      ["Hindi (Fluent)", 85],
    ]},
  ],

  // ---- Data fetching with session caching optimization ----
  async fetchRepos() {
    const skip = new Set(this.featuredRepoNames);
    try {
      const cached = sessionStorage.getItem("p5_cached_repos");
      if (cached) {
        const parsed = JSON.parse(cached);
        return { repos: parsed.filter(r => !skip.has(r.name)), live: true };
      }
    } catch {}

    try {
      const res = await fetch(
        `https://api.github.com/users/${this.githubUser}/repos?per_page=100&sort=updated`
      );
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const repos = data.filter(r => !r.fork);
      try {
        sessionStorage.setItem("p5_cached_repos", JSON.stringify(repos));
      } catch {}
      return { repos: repos.filter(r => !skip.has(r.name)), live: true };
    } catch {
      return { repos: this.fallbackRepos.filter(r => !skip.has(r.name)), live: false };
    }
  },
};

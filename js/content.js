// ============================================================
//  content.js — Edit this file to update your portfolio
//  No Three.js knowledge needed. Just edit the text below.
// ============================================================

export const SITE = {
  name:  'Jun Bae',
  role:  'Program Manager',
  music: 'assets/audio/music.mp3',
};

// ── INTERACTABLE OBJECTS ─────────────────────────────────────
export const OBJECTS = [

  {
    id: 'about',
    label: 'About Me',
    icon: '✦',
    meshName: 'StudioBuilding',
    position: { x: 0, z: -28 },
    placeholder: { w: 4, h: 5, d: 4, color: 0x8b6040 },
    radius: 6,
    modal: {
      title: 'Jun Bae',
      body: `
        <p>I'm a Program Manager based in San Jose with over 10 years of experience working across game development, VR, and social media. I've shipped products at Ubisoft, Facebook, and on my own.</p>
        <p>I like working on things that are technically complex and creatively driven. Most of my career has been spent keeping teams of engineers, artists, and designers pointed in the same direction.</p>
        <p>Outside of work I'm building an independent game called Mindrazer, which has taught me more about production than any job I've had.</p>
      `,
      tags: ['Program Manager', 'San Jose, CA', 'Open to opportunities'],
    },
  },

  {
    id: 'career',
    label: 'Career',
    icon: '◈',
    meshName: 'NoticeBoard',
    position: { x: 22, z: -14 },
    placeholder: { w: 2, h: 3, d: 0.3, color: 0x6b4428 },
    radius: 5,
    modal: {
      title: 'Career',
      body: `
        <div class="timeline">
          <div class="tl-item">
            <div class="tl-year">Feb 2025 – Present</div>
            <div class="tl-role">Project Lead / Game Developer</div>
            <div class="tl-company">Mazeweaver (Independent)</div>
            <div class="tl-desc">Designing and building Mindrazer, a top-down roguelite action game on Steam. Handling everything from gameplay systems and level design to QA, marketing, and release planning.</div>
          </div>
          <div class="tl-item">
            <div class="tl-year">Dec 2021 – Feb 2025</div>
            <div class="tl-role">Program Manager</div>
            <div class="tl-company">Ubisoft</div>
            <div class="tl-desc">Managed cross-functional production for XDefiant across engineering, art, design, and QA from pre-production through live-service seasonal releases. Drove over $500K in annual cost savings by improving release workflows and build processes.</div>
          </div>
          <div class="tl-item">
            <div class="tl-year">Mar 2019 – Jun 2021</div>
            <div class="tl-role">QA Program Manager</div>
            <div class="tl-company">Facebook</div>
            <div class="tl-desc">Supported launch readiness for Oculus Rift S, Quest, and Quest 2. Managed 250+ bugs across 5 concurrent projects and developed 500+ test scenarios covering functional, regression, and localization testing.</div>
          </div>
          <div class="tl-item">
            <div class="tl-year">Aug 2018 – Feb 2019</div>
            <div class="tl-role">Partner Manager</div>
            <div class="tl-company">Facebook</div>
            <div class="tl-desc">Managed relationships with 250+ video creators and media publishers in Facebook's Launchpad program, helping partners grow audiences and monetize content on the platform.</div>
          </div>
        </div>
      `,
      tags: ['10+ years', 'Games', 'VR', 'Live Service'],
    },
  },

  {
    id: 'projects',
    label: 'Projects',
    icon: '▣',
    meshName: 'GalleryWall',
    position: { x: -22, z: -14 },
    placeholder: { w: 6, h: 4, d: 0.4, color: 0x4a3828 },
    radius: 6,
    modal: {
      title: 'Selected Work',
      body: `
        <div class="project-grid">
          <div class="project-item">
            <div class="project-thumb" style="background:#1a2d4a"></div>
            <div class="project-info">
              <div class="project-name">Mindrazer</div>
              <div class="project-type">Independent Game · 2025</div>
              <div class="project-desc">Top-down roguelite action game built in Unity. Procedurally generated levels, strategic upgrades, replayable combat. Available on Steam.</div>
            </div>
          </div>
          <div class="project-item">
            <div class="project-thumb" style="background:#2a1a3a"></div>
            <div class="project-info">
              <div class="project-name">XDefiant</div>
              <div class="project-type">Ubisoft · 2022 – 2025</div>
              <div class="project-desc">Cross-functional PM for a live-service FPS. Improved release workflows, established asset archival strategy, integrated AI tooling into production pipelines.</div>
            </div>
          </div>
          <div class="project-item">
            <div class="project-thumb" style="background:#1a3a2a"></div>
            <div class="project-info">
              <div class="project-name">Oculus Quest Launch</div>
              <div class="project-type">Facebook · 2019 – 2021</div>
              <div class="project-desc">QA program management for Oculus Rift S, Quest, and Quest 2 launches. Built and executed comprehensive test coverage across hardware and platform applications.</div>
            </div>
          </div>
          <div class="project-item">
            <div class="project-thumb" style="background:#3a2a1a"></div>
            <div class="project-info">
              <div class="project-name">This Portfolio</div>
              <div class="project-type">Personal · 2025</div>
              <div class="project-desc">A 3D isometric game built with Three.js to present this portfolio. Designed, produced, and shipped solo.</div>
            </div>
          </div>
        </div>
      `,
      tags: ['Unity', 'Three.js', 'Live Service', 'VR'],
    },
  },

  {
    id: 'skills',
    label: 'Skills',
    icon: '◎',
    meshName: 'Bench',
    position: { x: 16, z: 18 },
    placeholder: { w: 3, h: 1, d: 1.2, color: 0x7a5030 },
    radius: 5,
    modal: {
      title: 'Skills & Tools',
      body: `
        <div class="skills-grid">
          <div class="skill-group">
            <div class="skill-group-title">Project Management</div>
            <div class="skill-list">Agile · Scrum · Jira · Trello · Miro · Shotgrid</div>
          </div>
          <div class="skill-group">
            <div class="skill-group-title">Data & Analytics</div>
            <div class="skill-list">SQL · Excel · SPSS</div>
          </div>
          <div class="skill-group">
            <div class="skill-group-title">Game Development</div>
            <div class="skill-list">Unity · C# · Blender</div>
          </div>
          <div class="skill-group">
            <div class="skill-group-title">Design & Video</div>
            <div class="skill-list">Adobe Creative Suite · Figma</div>
          </div>
          <div class="skill-group">
            <div class="skill-group-title">Languages</div>
            <div class="skill-list">English (fluent) · Korean (fluent)</div>
          </div>
        </div>
      `,
      tags: ['Agile', 'Unity', 'Jira', 'SQL', 'Blender'],
    },
  },

  {
    id: 'contact',
    label: 'Contact',
    icon: '✉',
    meshName: 'Mailbox',
    position: { x: -16, z: 18 },
    placeholder: { w: 1.2, h: 2, d: 1.2, color: 0xc8682a },
    radius: 5,
    modal: {
      title: 'Get In Touch',
      body: `
        <p>Always open to new opportunities, collaborations, and good conversations.</p>
        <div class="contact-links">
          <a href="mailto:pleidun@gmail.com" class="contact-link">
            <span class="contact-icon">✉</span>
            pleidun@gmail.com
          </a>
          <a href="https://www.linkedin.com/in/jun-b-b8627940/" target="_blank" class="contact-link">
            <span class="contact-icon">◈</span>
            LinkedIn
          </a>
        </div>
      `,
      tags: ['San Jose, CA', 'Open to opportunities', 'Remote friendly'],
    },
  },

];

// ── WORLD SETTINGS ────────────────────────────────────────────
export const WORLD = {
  usePlaceholder: false,
  modelPath: 'assets/world.glb',
  characterPath: 'assets/character.glb',
  resourceModels: {
    people: 'assets/people.glb',
    budget: 'assets/budget.glb',
    time:   'assets/time.glb',
  },
  groundSize: 60,
  fog: null,
  ambientIntensity: 0.9,
  sunColor: 0xffe4a0,
  sunIntensity: 1.6,
};

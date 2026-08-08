/**
 * Manual navigation.
 *
 * The chapter list lives in one place and is injected into every page, so
 * adding a chapter means editing this array only. It also builds the
 * in-page table of contents from the <h2> elements it finds, and highlights the
 * section you are reading with an IntersectionObserver.
 *
 * This is chapter 4's "one source of truth" idea applied to the manual itself.
 */

const CHAPTERS = [
  { file: 'index.html', title: 'Start here', blurb: 'What this manual is, and the order to read it in.' },
  { file: '01-foundations.html', title: 'Foundations', blurb: 'How the web actually works, and the tools on your machine.' },
  { file: '02-javascript.html', title: 'JavaScript', blurb: 'From your first variable to closures, modules and async.' },
  { file: '03-react.html', title: 'React', blurb: 'Components, state, effects, reducers, and when not to use them.' },
  { file: '04-tooling.html', title: 'Tooling', blurb: 'Vite, npm, DevTools, testing, git and shipping.' },
  { file: '05-backend.html', title: 'Backend & data', blurb: 'Postgres, SQL, auth and row-level security with Supabase.' },
  { file: '06-design.html', title: 'Design', blurb: 'Type, space, colour, glass and motion: the awwwards feel, decomposed.' },
  { file: '07-architecture.html', title: 'Architecture', blurb: 'How this app is built: engine/UI split, netlists, DSLs.' },
  { file: '08-recipes.html', title: 'Recipes', blurb: 'Patterns to lift straight into your next project.' },
];

function buildSidebar() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const nav = document.querySelector('nav.sidebar');
  if (!nav) return;

  const list = document.createElement('ol');
  CHAPTERS.forEach((chapter, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'chapter' + (chapter.file === here ? ' active' : '');
    a.href = chapter.file;
    a.innerHTML = `<span class="num">${i === 0 ? '·' : String(i).padStart(2, '0')}</span><span>${chapter.title}</span>`;
    li.appendChild(a);

    // The current chapter gets an inline table of contents.
    if (chapter.file === here) {
      const toc = document.createElement('div');
      toc.className = 'toc';
      document.querySelectorAll('main h2[id]').forEach((h2) => {
        const link = document.createElement('a');
        link.href = `#${h2.id}`;
        link.textContent = h2.textContent;
        toc.appendChild(link);
      });
      if (toc.childElementCount) li.appendChild(toc);
    }
    list.appendChild(li);
  });

  nav.appendChild(list);
}

function buildChapterNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const index = CHAPTERS.findIndex((c) => c.file === here);
  if (index < 0) return;
  const main = document.querySelector('main');
  if (!main) return;

  const prev = CHAPTERS[index - 1];
  const next = CHAPTERS[index + 1];
  if (!prev && !next) return;

  const wrap = document.createElement('div');
  wrap.className = 'chapter-nav';
  if (prev) {
    wrap.innerHTML += `<a href="${prev.file}"><span class="dir">← Previous</span><span class="title">${prev.title}</span></a>`;
  }
  if (next) {
    wrap.innerHTML += `<a class="next" href="${next.file}"><span class="dir">Next →</span><span class="title">${next.title}</span></a>`;
  }
  main.appendChild(wrap);
}

/** Highlight the section currently on screen. */
function trackReadingPosition() {
  const links = [...document.querySelectorAll('nav.sidebar .toc a')];
  if (!links.length) return;
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((a) => (a.style.color = ''));
          link.style.color = 'var(--zinc-900)';
          link.style.fontWeight = '600';
        }
      });
    },
    { rootMargin: '-10% 0px -80% 0px' }
  );
  document.querySelectorAll('main h2[id]').forEach((h2) => observer.observe(h2));
}

document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  buildChapterNav();
  trackReadingPosition();
});

export { CHAPTERS };

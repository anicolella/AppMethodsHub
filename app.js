const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const progress = document.querySelector('#progress');
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const videoDialog = document.querySelector('#profile-video');
const introVideo = document.querySelector('#intro-video');

document.querySelectorAll('[data-open-video]').forEach((trigger) => trigger.addEventListener('click', () => {
  const mobile = window.matchMedia('(max-width: 640px)').matches;
  videoDialog.classList.toggle('portrait-video', mobile);
  introVideo.src = mobile ? 'assets/alexandre_vertical.mp4' : 'assets/alexandre_horizontal.mp4';
  introVideo.load();
  videoDialog.showModal();
  introVideo.play().catch(() => {});
}));
document.querySelector('[data-close-video]').addEventListener('click', () => videoDialog.close());
videoDialog.addEventListener('click', (event) => {
  if (event.target === videoDialog) videoDialog.close();
});
videoDialog.addEventListener('close', () => {
  introVideo.pause();
  introVideo.removeAttribute('src');
  introVideo.load();
  videoDialog.classList.remove('portrait-video');
});

function updateScrollState() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  header.classList.toggle('scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', updateScrollState, { passive: true });
updateScrollState();

menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
  nav.classList.toggle('open', !open);
});
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
}));

if ('IntersectionObserver' in window && !reduceMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal:not(.in), .stagger').forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll('.reveal, .stagger').forEach((element) => element.classList.add('in'));
}

if ('IntersectionObserver' in window && !reduceMotion) {
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('motion-in');
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .4 });
  document.querySelectorAll('.book-card').forEach((card) => cardObserver.observe(card));
}

const canvas = document.querySelector('#particle-field');
const phaseLabel = document.querySelector('#phase-label');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;
let particles = [];
let animationFrame = 0;
let phaseStart = 0;
let phaseIndex = 0;
const colors = ['#E3C39D', '#A4B5C4', '#CDD5DB', '#A68868'];
const phaseNames = [
  'OBSERVAR A REALIDADE',
  'FORMULAR A PERGUNTA',
  'REUNIR EVIDÊNCIAS',
  'ESCOLHER O MÉTODO',
  'CONSTRUIR O MODELO',
  'INTERPRETAR OS RESULTADOS'
];
const phaseDuration = 1850;

function makeTargets() {
  const marginX = width * .12;
  const marginY = height * .17;
  const availableW = width - marginX * 2;
  const availableH = height - marginY * 2;
  const count = particles.length;
  const scatter = particles.map((_, i) => ({
    x: marginX + Math.random() * availableW,
    y: marginY + Math.random() * availableH
  }));
  const question = particles.map((_, i) => ({
    x: width * .5 + (Math.random() - .5) * width * .32 + (i % 3 - 1) * width * .025,
    y: height * .5 + (Math.random() - .5) * height * .32
  }));
  const curve = particles.map((_, i) => {
    const t = i / (count - 1);
    return {
      x: marginX + t * availableW,
      y: marginY + availableH * (.24 + .58 * (1 - Math.pow(2 * t - 1, 2))) + (Math.random() - .5) * height * .045
    };
  });
  const line = particles.map((_, i) => {
    const t = i / (count - 1);
    return {
      x: marginX + t * availableW,
      y: marginY + availableH * (.84 - .68 * t) + (Math.random() - .5) * height * .065
    };
  });
  return [scatter, scatter, question, curve, line, line, scatter];
}

function resizeField() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.max(38, Math.min(68, Math.round(width / 8)));
  particles = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: i % 8 === 0 ? 2.8 : 1.5 + Math.random() * 1.1,
    color: colors[i % colors.length],
    targets: [],
    phaseOffset: Math.random() * .2
  }));
  const targetSets = makeTargets();
  particles.forEach((particle, i) => {
    particle.targets = targetSets.map((set) => set[i]);
  });
  phaseStart = performance.now();
  if (reduceMotion) drawStill();
}

function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function currentPosition(particle, now) {
  const local = (now - phaseStart) / phaseDuration;
  const index = Math.floor(local) % 6;
  const t = easeInOut(Math.min(1, local % 1));
  const from = particle.targets[index];
  const to = particle.targets[index + 1];
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function draw(now) {
  ctx.clearRect(0, 0, width, height);
  const elapsed = now - phaseStart;
  const nextPhase = Math.floor(elapsed / phaseDuration) % 6;
  if (nextPhase !== phaseIndex) {
    phaseIndex = nextPhase;
    phaseLabel.textContent = phaseNames[phaseIndex];
    document.querySelector('.hero-visual').classList.toggle('question-phase', phaseIndex === 1);
  }
  const positions = particles.map((particle) => currentPosition(particle, now));
  const connectionStrength = phaseIndex === 0 || phaseIndex === 1 || phaseIndex === 5 ? .14 : .24;
  const connecting = true;
  if (connecting) {
    for (let i = 0; i < positions.length - 1; i += 1) {
      const a = positions[i];
      const b = positions[i + 1];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < width * .09) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(164,181,196,${Math.max(.025, connectionStrength - distance / (width * .72))})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  positions.forEach((point, index) => {
    const particle = particles[index];
    ctx.beginPath();
    ctx.arc(point.x, point.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = .48 + .45 * Math.sin(now / 900 + index * .61) ** 2;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  animationFrame = requestAnimationFrame(draw);
}

function drawStill() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  phaseIndex = 0;
  phaseLabel.textContent = phaseNames[0];
  ctx.clearRect(0, 0, width, height);
  particles.forEach((particle) => {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();
  });
}

resizeField();
if (!reduceMotion) animationFrame = requestAnimationFrame(draw);
window.addEventListener('resize', resizeField, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (reduceMotion) return;
  if (document.hidden) cancelAnimationFrame(animationFrame);
  else animationFrame = requestAnimationFrame(draw);
});

function startLibraryParticles() {
  const field = document.querySelector('#library-particle-field');
  const label = document.querySelector('#library-phase-label');
  if (!field || !label) return;
  const fieldContext = field.getContext('2d');
  let fieldWidth = 0;
  let fieldHeight = 0;
  let fieldPoints = [];
  let fieldStart = performance.now();
  const labels = ['OBSERVAR', 'PERGUNTAR', 'ORGANIZAR EVIDÊNCIAS', 'MODELAR'];

  function resizeLibraryField() {
    const rect = field.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fieldWidth = rect.width;
    fieldHeight = rect.height;
    field.width = Math.round(fieldWidth * dpr);
    field.height = Math.round(fieldHeight * dpr);
    fieldContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    fieldPoints = Array.from({ length: Math.max(32, Math.round(fieldWidth / 8)) }, (_, i) => ({
      scatterX: 22 + Math.random() * Math.max(1, fieldWidth - 44),
      scatterY: 20 + Math.random() * Math.max(1, fieldHeight - 58),
      radius: i % 7 === 0 ? 2.5 : 1.4 + Math.random(),
      color: colors[i % colors.length]
    }));
    fieldStart = performance.now();
  }

  function libraryTarget(point, index, phase) {
    const t = index / Math.max(1, fieldPoints.length - 1);
    if (phase === 0) return { x: point.scatterX, y: point.scatterY };
    if (phase === 1) return { x: fieldWidth * .5 + (point.scatterX - fieldWidth * .5) * .38, y: fieldHeight * .46 + (point.scatterY - fieldHeight * .5) * .48 };
    if (phase === 2) return { x: 24 + t * (fieldWidth - 48), y: fieldHeight * (.7 - .43 * Math.sin(t * Math.PI)) + ((index % 4) - 1.5) * 4 };
    return { x: 24 + t * (fieldWidth - 48), y: fieldHeight * (.76 - .5 * t) + ((index % 3) - 1) * 4 };
  }

  function drawLibrary(now) {
    const duration = 1900;
    const elapsed = (now - fieldStart) / duration;
    const phase = Math.floor(elapsed) % 4;
    const next = (phase + 1) % 4;
    const mix = easeInOut(elapsed % 1);
    label.textContent = labels[phase];
    fieldContext.clearRect(0, 0, fieldWidth, fieldHeight);
    const positions = fieldPoints.map((point, index) => {
      const a = libraryTarget(point, index, phase);
      const b = libraryTarget(point, index, next);
      return { x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix };
    });
    positions.forEach((position, index) => {
      if (index && phase > 1) {
        fieldContext.beginPath();
        fieldContext.moveTo(positions[index - 1].x, positions[index - 1].y);
        fieldContext.lineTo(position.x, position.y);
        fieldContext.strokeStyle = 'rgba(164,181,196,.18)';
        fieldContext.stroke();
      }
      fieldContext.beginPath();
      fieldContext.arc(position.x, position.y, fieldPoints[index].radius, 0, Math.PI * 2);
      fieldContext.fillStyle = fieldPoints[index].color;
      fieldContext.globalAlpha = .55 + .4 * Math.sin(now / 700 + index) ** 2;
      fieldContext.fill();
    });
    fieldContext.globalAlpha = 1;
    if (!reduceMotion) requestAnimationFrame(drawLibrary);
  }

  resizeLibraryField();
  if (reduceMotion) drawLibrary(fieldStart); else requestAnimationFrame(drawLibrary);
  window.addEventListener('resize', resizeLibraryField, { passive: true });
}

startLibraryParticles();

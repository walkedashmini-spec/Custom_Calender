/**
 * Background Animator — GPU-friendly canvas particle system per theme.
 * Pauses when tab hidden, respects reduced motion & animation toggle.
 */
const BackgroundAnimator = (() => {
  const MAX_PARTICLES = 40;
  let canvas, ctx, particles = [];
  let theme = 'ocean';
  let enabled = true;
  let animId = null;
  let w = 0, h = 0;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function resize() {
    if (!canvas) return;
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createParticle(type) {
    const p = { type };
    switch (type) {
      case 'bubble':
        p.x = Math.random() * w;
        p.y = h + Math.random() * 100;
        p.r = 2 + Math.random() * 6;
        p.speed = 0.3 + Math.random() * 0.8;
        p.wobble = Math.random() * Math.PI * 2;
        p.opacity = 0.1 + Math.random() * 0.3;
        break;
      case 'cloud':
        p.x = Math.random() * w;
        p.y = Math.random() * h * 0.6;
        p.r = 30 + Math.random() * 50;
        p.speed = 0.1 + Math.random() * 0.3;
        p.opacity = 0.04 + Math.random() * 0.06;
        break;
      case 'sparkle':
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.r = 1 + Math.random() * 2;
        p.speed = 0;
        p.phase = Math.random() * Math.PI * 2;
        p.opacity = 0.2 + Math.random() * 0.4;
        break;
      case 'map':
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.r = 1 + Math.random() * 3;
        p.speed = 0.2 + Math.random() * 0.4;
        p.angle = Math.random() * Math.PI * 2;
        p.opacity = 0.15 + Math.random() * 0.2;
        break;
      case 'leaf':
        p.x = Math.random() * w;
        p.y = -20 - Math.random() * 100;
        p.r = 4 + Math.random() * 6;
        p.speed = 0.5 + Math.random() * 1;
        p.wobble = Math.random() * Math.PI * 2;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotSpeed = (Math.random() - 0.5) * 0.03;
        p.opacity = 0.2 + Math.random() * 0.3;
        break;
      case 'firefly':
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.r = 2 + Math.random() * 2;
        p.speed = 0.1 + Math.random() * 0.2;
        p.phase = Math.random() * Math.PI * 2;
        p.angle = Math.random() * Math.PI * 2;
        p.opacity = 0.3 + Math.random() * 0.4;
        break;
      default:
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.r = 2;
        p.speed = 0.5;
        p.opacity = 0.2;
    }
    return p;
  }

  function getParticleTypes() {
    switch (theme) {
      case 'sky': return ['cloud', 'sparkle'];
      case 'pirate': return ['map', 'sparkle'];
      case 'panda': return ['leaf', 'firefly'];
      default: return ['bubble', 'sparkle'];
    }
  }

  function initParticles() {
    particles = [];
    const types = getParticleTypes();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const type = types[i % types.length];
      const p = createParticle(type);
      if (type !== 'leaf' && type !== 'bubble') {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
      particles.push(p);
    }
  }

  function updateParticle(p, time) {
    switch (p.type) {
      case 'bubble':
        p.y -= p.speed;
        p.x += Math.sin(time * 0.001 + p.wobble) * 0.3;
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
        break;
      case 'cloud':
        p.x += p.speed;
        if (p.x > w + p.r) { p.x = -p.r; p.y = Math.random() * h * 0.6; }
        break;
      case 'sparkle':
        p.opacity = 0.1 + Math.abs(Math.sin(time * 0.002 + p.phase)) * 0.4;
        break;
      case 'map':
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.angle = Math.random() * Math.PI * 2;
        }
        break;
      case 'leaf':
        p.y += p.speed;
        p.x += Math.sin(time * 0.001 + p.wobble) * 0.8;
        p.rotation += p.rotSpeed;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        break;
      case 'firefly':
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.opacity = 0.1 + Math.abs(Math.sin(time * 0.003 + p.phase)) * 0.5;
        if (Math.random() < 0.01) p.angle = Math.random() * Math.PI * 2;
        if (p.x < 0 || p.x > w) p.angle = Math.PI - p.angle;
        if (p.y < 0 || p.y > h) p.angle = -p.angle;
        break;
    }
  }

  function drawParticle(p, time) {
    ctx.save();
    ctx.globalAlpha = p.opacity;

    switch (p.type) {
      case 'bubble':
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        break;
      case 'cloud':
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.arc(p.x + p.r * 0.5, p.y - p.r * 0.2, p.r * 0.7, 0, Math.PI * 2);
        ctx.arc(p.x - p.r * 0.4, p.y + p.r * 0.1, p.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'sparkle':
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'map':
        ctx.fillStyle = theme === 'pirate' ? 'rgba(201,162,39,0.6)' : 'rgba(255,255,255,0.5)';
        ctx.fillRect(p.x, p.y, p.r, p.r);
        break;
      case 'leaf':
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = theme === 'panda' ? 'rgba(82,183,136,0.6)' : 'rgba(100,200,100,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'firefly':
        ctx.fillStyle = theme === 'panda' ? 'rgba(149,213,178,0.9)' : 'rgba(255,255,150,0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
    }
    ctx.restore();
  }

  function render(time) {
    if (!enabled || prefersReducedMotion() || document.hidden) {
      animId = requestAnimationFrame(render);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      updateParticle(p, time);
      drawParticle(p, time);
    });
    animId = requestAnimationFrame(render);
  }

  function setTheme(t) {
    theme = t;
    initParticles();
  }

  function setEnabled(val) {
    enabled = val;
    if (!canvas) return;
    canvas.style.display = (val && !prefersReducedMotion()) ? 'block' : 'none';
  }

  function init() {
    canvas = document.getElementById('appBackground');
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');
    resize();
    initParticles();
    setEnabled(localStorage.getItem('animationsEnabled') !== 'false');
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && enabled) render(performance.now());
    });
    animId = requestAnimationFrame(render);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { setTheme, setEnabled, init };
})();

window.BackgroundAnimator = BackgroundAnimator;

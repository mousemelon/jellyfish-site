document.documentElement.classList.add("js");

const hero = document.querySelector(".hero");
const canvas = document.querySelector(".jelly-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let pointerX = 0;
let pointerY = 0;

if (hero) {
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 18;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 18;
    pointerX = x / 18;
    pointerY = y / 18;
    hero.style.setProperty("--drift-x", `${x}px`);
    hero.style.setProperty("--drift-y", `${y}px`);
  });

  hero.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    hero.style.setProperty("--drift-x", "0px");
    hero.style.setProperty("--drift-y", "0px");
  });
}

const clampPixelRatio = () => Math.min(window.devicePixelRatio || 1, 1.25);

async function mountJellyScene() {
  if (!canvas || reduceMotion.matches) return;

  const THREE = await import("./vendor/three.module.min.js");
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x031016, 0.045);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.35, 9);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x031016, 0);
  renderer.setPixelRatio(clampPixelRatio());

  const group = new THREE.Group();
  scene.add(group);

  const bellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x83fff0,
    emissive: 0x1fd8cf,
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0,
    transmission: 0.6,
    thickness: 0.82,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });

  const bellGeometry = new THREE.SphereGeometry(2.28, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const bell = new THREE.Mesh(bellGeometry, bellMaterial);
  bell.scale.set(1.35, 0.58, 1);
  bell.rotation.x = Math.PI;
  group.add(bell);

  const bellWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(bellGeometry),
    new THREE.LineBasicMaterial({ color: 0xcafffb, transparent: true, opacity: 0.62 })
  );
  bellWire.scale.copy(bell.scale);
  bellWire.rotation.copy(bell.rotation);
  group.add(bellWire);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.95, 0.028, 12, 160),
    new THREE.MeshBasicMaterial({ color: 0x77fff1, transparent: true, opacity: 0.95 })
  );
  rim.scale.y = 0.34;
  rim.position.y = -0.08;
  group.add(rim);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.74, 3),
    new THREE.MeshBasicMaterial({ color: 0xff8179, transparent: true, opacity: 0.72, wireframe: true })
  );
  core.position.set(0, -0.35, 0.08);
  group.add(core);

  const tentacleMaterial = new THREE.LineBasicMaterial({
    color: 0x86fff1,
    transparent: true,
    opacity: 0.82,
  });
  const tentacles = [];

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const radius = 1.1 + (i % 5) * 0.09;
    const length = 3.1 + (i % 6) * 0.36;
    const points = [];

    for (let j = 0; j < 22; j += 1) {
      const t = j / 21;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius * (1 - t * 0.3),
        -0.24 - t * length,
        Math.sin(angle) * radius * (1 - t * 0.3)
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, tentacleMaterial.clone());
    line.material.opacity = 0.42 + (i % 4) * 0.12;
    line.userData = { angle, radius, length, phase: i * 0.58 };
    tentacles.push(line);
    group.add(line);
  }

  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 160;
  const positions = new Float32Array(particleCount * 3);
  const phases = [];

  for (let i = 0; i < particleCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 13;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    phases.push(Math.random() * Math.PI * 2);
  }

  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0x9ffff5,
      size: 0.036,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(particles);

  scene.add(new THREE.AmbientLight(0x5edfd7, 0.8));
  const key = new THREE.PointLight(0x63f2df, 16, 18);
  key.position.set(0, 2.3, 4.4);
  scene.add(key);
  const coral = new THREE.PointLight(0xff706a, 6.5, 12);
  coral.position.set(-3.8, -1.8, 2.2);
  scene.add(coral);

  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setPixelRatio(clampPixelRatio());
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let frameId = 0;
  let layout = { narrow: false };
  const render = (timeMs) => {
    const time = timeMs * 0.001;
    const scrollShift = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.2);
    layout.narrow = canvas.clientWidth < 700;

    group.rotation.y = Math.sin(time * 0.33) * 0.16 + pointerX * 0.28;
    group.rotation.x = -0.08 + Math.sin(time * 0.27) * 0.05 + pointerY * 0.16;
    group.position.x = layout.narrow ? 1.55 : 1.15;
    group.position.y = (layout.narrow ? -2.1 : 0.15) + Math.sin(time * 0.74) * 0.2 - scrollShift * 0.45;
    group.scale.setScalar((layout.narrow ? 1 : 1.42) + Math.sin(time * 1.15) * 0.025);
    bellWire.material.opacity = 0.58 + Math.sin(time * 1.2) * 0.08;
    core.rotation.y = time * 0.5;
    core.rotation.x = time * 0.32;

    tentacles.forEach((line, index) => {
      const { angle, radius, length, phase } = line.userData;
      const attribute = line.geometry.attributes.position;
      for (let j = 0; j < attribute.count; j += 1) {
        const t = j / (attribute.count - 1);
        const sway = Math.sin(time * 1.5 + phase + t * 4.2) * 0.32 * t;
        const x = Math.cos(angle + sway) * radius * (1 - t * 0.3);
        const z = Math.sin(angle + sway) * radius * (1 - t * 0.3);
        const y = -0.24 - t * length + Math.sin(time * 1.1 + index) * 0.05 * t;
        attribute.setXYZ(j, x, y, z);
      }
      attribute.needsUpdate = true;
    });

    const particlePosition = particles.geometry.attributes.position;
    for (let i = 0; i < particleCount; i += 1) {
      const base = i * 3;
      const y = positions[base + 1] + Math.sin(time * 0.45 + phases[i]) * 0.006;
      particlePosition.setY(i, y);
      positions[base + 1] = y > 4.5 ? -4.5 : y;
    }
    particlePosition.needsUpdate = true;
    particles.rotation.y = time * 0.025 + pointerX * 0.08;

    camera.position.x += (pointerX * 0.7 - camera.position.x) * 0.05;
    camera.position.y += (0.35 - pointerY * 0.32 - camera.position.y) * 0.05;
    camera.lookAt(0, -0.25, 0);

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  };

  frameId = requestAnimationFrame(render);

  reduceMotion.addEventListener("change", (event) => {
    if (!event.matches) return;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    renderer.dispose();
  });
}

function scheduleJellyScene() {
  const start = () => {
    const run = () => {
      mountJellyScene().catch(() => {
        canvas?.classList.add("jelly-canvas--fallback");
      });
    };

    window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 2200 });
        return;
      }

      run();
    }, 2200);
  };

  if (document.readyState === "complete") {
    start();
    return;
  }

  window.addEventListener("load", start, { once: true });
}

scheduleJellyScene();

const revealItems = document.querySelectorAll(".reveal");

if (revealItems.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const parallaxBands = document.querySelectorAll(".parallax-band");

function updateSectionParallax() {
  if (reduceMotion.matches) return;

  const viewportMid = window.innerHeight / 2;
  parallaxBands.forEach((band) => {
    const bounds = band.getBoundingClientRect();
    const bandMid = bounds.top + bounds.height / 2;
    const shift = Math.max(-42, Math.min(42, (viewportMid - bandMid) * 0.06));
    band.style.setProperty("--scroll-shift", `${shift}px`);
  });
}

if (parallaxBands.length > 0) {
  updateSectionParallax();
  window.addEventListener("scroll", updateSectionParallax, { passive: true });
  window.addEventListener("resize", updateSectionParallax, { passive: true });
}

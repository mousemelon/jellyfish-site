const hero = document.querySelector(".hero");

if (hero) {
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 18;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 18;
    hero.style.setProperty("--drift-x", `${x}px`);
    hero.style.setProperty("--drift-y", `${y}px`);
  });

  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--drift-x", "0px");
    hero.style.setProperty("--drift-y", "0px");
  });
}

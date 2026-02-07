const skills = [
  "React", "Laravel","PHP","UI,UX", "Wordpress","Mysqli","Illustrator", "Photoshop",
  "Premiere Pro", "After Effects", "Lightroom", "Blender", "Rhino"
];

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function createTicker(containerId) {
  const container = document.getElementById(containerId);
  const shuffled = shuffle([...skills, ...skills]); // duplicate for seamless scroll
  shuffled.forEach(skill => {
    const div = document.createElement('div');
    div.className = 'horizontal-scrolling-items__item';
    div.textContent = skill;
    container.appendChild(div);
  });
}

// Create 4 lines
createTicker('scroll-1');
createTicker('scroll-2');
createTicker('scroll-3');
createTicker('scroll-4');

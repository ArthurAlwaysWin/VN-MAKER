/**
 * BacklogScreen — Shows dialogue history
 */
export class BacklogScreen {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.id = 'backlog-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);
  }

  /**
   * @param {Array<{speaker:string|null, speakerName:string|null, text:string}>} history
   * @param {Object} characters — character definitions (for colors)
   */
  show(history, characters = {}) {
    this.el.innerHTML = `
      <div class="backlog-header">
        <div class="backlog-title">回 想</div>
        <button class="backlog-close">返回</button>
      </div>
      <div class="backlog-content"></div>
    `;

    this.el.querySelector('.backlog-close').addEventListener('click', () => this.hide());

    const content = this.el.querySelector('.backlog-content');
    history.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'backlog-entry';

      const speakerColor = entry.speaker && characters[entry.speaker]
        ? characters[entry.speaker].color
        : 'rgba(255,255,255,0.5)';

      div.innerHTML = entry.speakerName
        ? `<div class="backlog-speaker" style="color:${speakerColor}">${entry.speakerName}</div>
           <div class="backlog-text">${entry.text}</div>`
        : `<div class="backlog-text" style="font-style:italic">${entry.text}</div>`;

      content.appendChild(div);
    });

    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));

    // Scroll to bottom
    requestAnimationFrame(() => {
      content.scrollTop = content.scrollHeight;
    });
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }
}

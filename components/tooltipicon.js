// tooltipicon.js

export default class TooltipIcon extends HTMLElement {
  constructor() {
    super();
    // build the markup (light-DOM so your CSS file applies)
    this.innerHTML = `
      <span class="tooltip-container">
        <span class="tooltip-icon">?</span>
        <span class="tooltip-bubble"></span>
      </span>
    `;
  }

  connectedCallback() {
    // grab references
    this._container = this.querySelector('.tooltip-container');
    this._icon      = this.querySelector('.tooltip-icon');
    this._bubble    = this.querySelector('.tooltip-bubble');

    // set initial text
    this._bubble.textContent = this.getAttribute('text') || '';

    // on every mouse move over the icon, reposition the bubble
    this._container.addEventListener('mousemove', e => {
      const iconRect  = this._container.getBoundingClientRect();
      const bubbleW   = this._bubble.offsetWidth;
      const bubbleH   = this._bubble.offsetHeight;

      // center the bubble horizontally over the icon
      const left = iconRect.left + iconRect.width/2 - bubbleW/2;
      // place the bubble just above the icon
      const top  = iconRect.top - bubbleH - 8;

      this._bubble.style.left = `${left}px`;
      this._bubble.style.top  = `${top}px`;

      // adjust the little arrow via your CSS var (--arrow-left)
      // arrow should point to icon center, so:
      const arrowX = iconRect.left + iconRect.width/2 - left;
      this._bubble.style.setProperty('--arrow-left', `${arrowX}px`);
    });
  }

  static get observedAttributes() {
    return ['text'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'text' && this._bubble) {
      this._bubble.textContent = newValue;
    }
  }
}

// Temporary page faces only: the live text remains the sole reading content.
// No canvas, image snapshots, chapter copies, or persistent animation loops.
export function createPageMotion({viewport, textElement}) {
  let current = null;

  function finish(job) {
    if (!job) return;
    for (const animation of job.animations) animation.cancel();
    job.layer.remove();
    if (current === job) {
      current = null;
      delete viewport.dataset.motion;
    }
  }

  function cancel() {
    finish(current);
  }

  function face(layer, text, kind) {
    const sheet = document.createElement('div');
    sheet.className = 'reader-motion-face ' + kind;
    const copy = document.createElement('div');
    copy.className = textElement.className + ' reader-motion-copy';
    copy.textContent = text;
    sheet.append(copy);
    layer.append(sheet);
    return sheet;
  }

  async function play({direction = 1, automatic = false, previousText, duration} = {}) {
    cancel();
    const oldText = typeof previousText === 'string' ? previousText : '';
    const newText = textElement.textContent;
    if (!oldText || oldText === newText || !viewport.clientWidth || !viewport.clientHeight ||
        typeof viewport.animate !== 'function') return;

    const reduce = viewport.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const requested = Number.isFinite(duration) ? Math.max(0, Math.min(60000, duration)) : (automatic ? 650 : 460);
    if (!requested) return;
    const milliseconds = reduce ? Math.min(requested, 100) : requested;
    const motion = automatic ? 'cover-down' : direction < 0 ? 'page-backward' : 'page-forward';
    const layer = document.createElement('div');
    layer.className = 'reader-motion-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.dataset.motion = motion;
    if (reduce) layer.dataset.reducedMotion = 'true';
    // One viewport-sized layer; faces inherit the actual reader typography.
    layer.style.width = viewport.clientWidth + 'px';
    layer.style.height = viewport.clientHeight + 'px';
    layer.style.perspective = Math.max(700, viewport.clientWidth * 2.5) + 'px';
    const job = {layer, animations: []};
    current = job;
    viewport.dataset.motion = motion;
    viewport.append(layer);

    function animate(element, frames, options = {}) {
      const animation = element.animate(frames, {
        duration: milliseconds,
        fill: 'both',
        easing: 'cubic-bezier(.22,.7,.2,1)',
        ...options
      });
      // cancel() deliberately rejects finished; consume every rejection, also
      // for secondary crease/shadow animations that are not individually awaited.
      animation.finished.catch(() => {});
      job.animations.push(animation);
      return animation;
    }

    try {
      let main;
      if (reduce) {
        const old = face(layer, oldText, 'reader-motion-under');
        main = animate(old, [{opacity: 1}, {opacity: 0}], {easing: 'linear'});
      } else if (automatic) {
        face(layer, oldText, 'reader-motion-under');
        const cover = face(layer, newText, 'reader-motion-cover');
        main = animate(cover, [
          {clipPath: 'inset(0 0 100% 0)'},
          {clipPath: 'inset(0 0 0% 0)'}
        ], {easing: 'linear'});
        const edge = document.createElement('div');
        edge.className = 'reader-motion-cover-edge';
        layer.append(edge);
        animate(edge, [
          {transform: 'translateY(-2px)', opacity: 0},
          {transform: 'translateY(' + (viewport.clientHeight * .08) + 'px)', opacity: 1, offset: .08},
          {transform: 'translateY(' + (viewport.clientHeight - 1) + 'px)', opacity: 0}
        ], {easing: 'linear'});
      } else {
        const backward = direction < 0;
        if (backward) face(layer, oldText, 'reader-motion-under');
        const leaf = face(layer, backward ? newText : oldText, 'reader-motion-leaf');
        const shade = document.createElement('div');
        shade.className = 'reader-motion-shade';
        leaf.append(shade);
        const open = {transform: 'rotateY(0deg) skewY(0deg)', opacity: 1};
        const folded = {transform: 'rotateY(-96deg) skewY(-1.2deg)', opacity: .98};
        main = animate(leaf, backward ? [folded, open] : [open, folded]);
        animate(shade, backward ? [
          {opacity: .55}, {opacity: .35, offset: .4}, {opacity: 0}
        ] : [
          {opacity: 0}, {opacity: .35, offset: .6}, {opacity: .55}
        ]);
      }
      await main.finished;
    } catch {
      // Cancellation, an interrupted render, or a browser without a supported
      // effect leaves the already-updated live page readable.
    } finally {
      finish(job);
    }
  }

  return {play, cancel, get active() { return current !== null; }};
}

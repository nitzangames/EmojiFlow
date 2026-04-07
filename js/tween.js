var activeTweens = [];
var tweenIdCounter = 0;

function easingLinear(t) { return t; }
function easingBackIn(t) { return t * t * (2.7 * t - 1.7); }

var EASING = {
  linear: easingLinear,
  backIn: easingBackIn,
};

function tweenTo(target, props, duration, ease, onComplete) {
  var id = ++tweenIdCounter;
  var startValues = {};
  for (var key in props) {
    startValues[key] = target[key];
  }
  activeTweens.push({
    id: id,
    target: target,
    startValues: startValues,
    endValues: props,
    duration: duration,
    elapsed: 0,
    ease: EASING[ease] || easingLinear,
    onComplete: onComplete || null,
  });
  return id;
}

function updateTweens(dt) {
  var i = activeTweens.length;
  while (i--) {
    var tw = activeTweens[i];
    tw.elapsed += dt;
    var t = Math.min(tw.elapsed / tw.duration, 1);
    var eased = tw.ease(t);
    for (var key in tw.endValues) {
      tw.target[key] = tw.startValues[key] + (tw.endValues[key] - tw.startValues[key]) * eased;
    }
    if (t >= 1) {
      activeTweens.splice(i, 1);
      if (tw.onComplete) tw.onComplete();
    }
  }
}

function clearTweens() {
  activeTweens.length = 0;
}

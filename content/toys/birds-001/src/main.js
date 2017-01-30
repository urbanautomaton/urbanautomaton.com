var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var X = canvas.width;
var Y = canvas.height;
var SCALE = 0.5;
var BIRDS = 100;
var ANIMATING = true;
var ANIMATION_REQUEST_IDS = [];
var MIN_VELOCITY = 40;
var MAX_VELOCITY = 150;
var NEIGHBOUR_RADIUS = 75;
var VISIBLE_ANGLE = Math.PI * .8;
var GOAL = $V([0, 0]);
var GOAL_LIMIT = 150;

var vel, pos, acc, last, visibility_matrix;

var allRepels;
var allHeadings;
var allCentroids;
var allGoals;

function randPlusMinus(limit) {
  return (Math.random() - 0.5) * limit * 2;
}

ctx.save();
ctx.translate(X/2, Y/2);
ctx.scale(SCALE, SCALE);

function init() {
  vel = [];
  pos = [];
  acc = [];
  last = null;
  visibility_matrix = new Array(BIRDS);

  for (var i=0; i < BIRDS; i++) {
    vel[i] = $V([randPlusMinus(100), randPlusMinus(100)]);
    acc[i] = $V([0, 0]);
    pos[i] = $V([randPlusMinus(200), randPlusMinus(200)]);
    visibility_matrix[i] = new Array(BIRDS);
  }
}

function pause() {
  if (ANIMATING) {
    ANIMATING = false;
    for (var i=0; i<ANIMATION_REQUEST_IDS.length; i++) {
      window.cancelAnimationFrame(ANIMATION_REQUEST_IDS[i]);
    }
  }
}

function play() {
  if (!ANIMATING) {
    ANIMATING = true;
    last = null;
    window.requestAnimationFrame(step);
  }
}

function toggleAnimation() {
  if (ANIMATING) {
    pause();
  } else {
    play();
  }
}

function drawCircle(centre, radius, color, stroke) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centre.e(1), centre.e(2), radius, 0, Math.PI*2, true)
  ctx.fill();
  if (stroke) { ctx.stroke(); }
}

function drawTriangle(centre, heading, color, stroke) {
  var deltas = [
    $V([-1.0, 0]),
    $V([0, 3.0]),
    $V([1.0, 0]),
    $V([0, 0])
  ];
  var angle = heading.angleFrom($V([0, 1])) * -Math.sign(heading.e(1));

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(centre.e(1), centre.e(2));
  for (var i=0; i<deltas.length; i++) {
    var point = centre.add(deltas[i].rotate(angle, $V([0, 0])).x(5));
    ctx.lineTo(point.e(1), point.e(2));
  }
  ctx.fill();
  if (stroke) { ctx.stroke(); }
}

function drawBird(bird) {
  if (bird === 1) {
    drawCircle(pos[bird], NEIGHBOUR_RADIUS, "rgba(255, 0, 0, 0.1)");
    drawVector(pos[bird], allRepels[bird], "red");
    drawVector(pos[bird], allHeadings[bird], "green");
    drawVector(pos[bird], allCentroids[bird], "black");
    drawVector(pos[bird], allGoals[bird], "blue");
  }
  drawTriangle(pos[bird], vel[bird], "green", true);
}

function drawVector(start, vector, color) {
  var newPos = start.add(vector);
  var originalStrokeStyle = ctx.strokeStyle;

  ctx.strokeStyle = color || "black";
  ctx.beginPath();
  ctx.moveTo(start.e(1), start.e(2));
  ctx.lineTo(newPos.e(1), newPos.e(2));
  ctx.stroke();

  ctx.strokeStyle = originalStrokeStyle;
}

function updateFrameRate(delta) {
  var rate = 1 / delta;

  var element = document.getElementById('frame-rate');
  if (element) {
    element.textContent = Math.round(rate * 100) / 100;
  }
}

function sees(delta, velocity) {
  return (
    delta.modulus() <= NEIGHBOUR_RADIUS &&
    velocity.angleFrom(delta) < VISIBLE_ANGLE
  );
}

function repelVector(delta) {
  return delta.toUnitVector().x(-30/delta.modulus());
}

function meanVector(vs) {
  var sum = _.reduce(
    vs,
    function(sum, el) { return sum.add(el); },
    $V([0, 0])
  );

  if (vs.length > 1) {
    sum = sum.x(1/vs.length);
  }

  return sum;
}

function clamp(vector, min, max) {
  var mod = vector.modulus();

  if (mod > max) {
    return vector.x(max / mod);
  } else if (mod < min) {
    return vector.x(min / mod);
  } else {
    return vector;
  }
}

function goalSeeking(from) {
  var heading = GOAL.subtract(from);;

  return clamp(heading, 0, GOAL_LIMIT);
}

function updateAcceleration() {
  allRepels = [];
  allHeadings = [];
  allCentroids = [];
  allGoals = [];

  for (var i=0; i<BIRDS; i++) {
    var repel = $V([0, 0]);
    var headings = [];
    var centroids = [];

    for (var j=0; j<BIRDS; j++) {
      if (i !== j) {
        var iToj = pos[j].subtract(pos[i]);

        if (sees(iToj, vel[i])) {
          repel = repel.add(repelVector(iToj).x(15));
          headings.push(vel[j]);
          centroids.push(iToj);
        }
      }
    }

    var heading = meanVector(headings).x(1.5);
    var centroid = meanVector(centroids);
    var goal = goalSeeking(pos[i]);

    allRepels.push(repel);
    allHeadings.push(heading);
    allCentroids.push(centroid);
    allGoals.push(goal);

    acc[i] = repel.add(heading).add(centroid).add(goal);
  }
}

function updateVelocity(delta_t) {
  for (var i=0; i<BIRDS; i++) {
    var v1 = vel[i].add(acc[i].x(delta_t));

    vel[i] = clamp(v1, MIN_VELOCITY, MAX_VELOCITY);
  }
}

function updatePosition(delta_t) {
  for (var i=0; i<BIRDS; i++) {
    pos[i] = pos[i].
      add(vel[i].x(delta_t)).
      add(acc[i].x(0.5 * delta_t * delta_t));
  }
}

function drawBirds() {
  for (var i=0; i<BIRDS; i++) { drawBird(i); }
}

function step(timestamp) {
  if (!ANIMATING) { return; }
  if (!last) { last = timestamp }
  var delta_t = (timestamp - last) / 1000;
  updateFrameRate(delta_t);
  last = timestamp;

  ctx.clearRect(-X/(2*SCALE), -Y/(2*SCALE), X/SCALE, Y/SCALE);

  updateAcceleration();
  updateVelocity(delta_t);
  updatePosition(delta_t);
  drawBirds();
  drawCircle(GOAL, 3, "red", true);

  if (ANIMATING) {
    ANIMATION_REQUEST_IDS.push(window.requestAnimationFrame(step));
  }
}

init();

ANIMATION_REQUEST_IDS.push(window.requestAnimationFrame(step));

function updateGoal() {
  GOAL = $V([randPlusMinus(X/3), randPlusMinus(Y/3)]);
  window.setTimeout(updateGoal, 5000);
}

updateGoal();

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    pause();
  } else {
    play();
  }
});

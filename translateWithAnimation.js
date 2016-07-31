import Timer from 'react-timer-mixin';

const INTERPOLATE_TIMES = 10;
async function translateWithAnimation(componentRef, origPosition, destPosition, spring = true, speed = 'normal') {
  try {
    let interval = undefined;
    switch (speed) {
      case 'fast':
        interval = 4;
        break;
      case 'normal':
        interval = 8;
        break;
      case 'slow':
        interval = 16;
        break;
      default:
        break;
    }
    if (interval === undefined) {
      if (typeof speed === 'number') {
        interval = speed / INTERPOLATE_TIMES;
      }
      else {
        // normal
        interval = 8;
      }
    }

    if (!componentRef || !typeCheck(origPosition.left) || !typeCheck(origPosition.top)
      || !typeCheck(origPosition.left) || !typeCheck(origPosition.top)) {
      throw new Error('The paramters are invalid.');
    }

    const interpolations = interpolatePosition(origPosition, destPosition, spring);
    for (let i = 1; i < interpolations.length; i++) {
      const style = { left: interpolations[i].left, top: interpolations[i].top };
      const nativeProps = { style };
      await setNativePropsLazily(componentRef, nativeProps, interval);
    }
  }
  catch(error) {
    console.error(error);
  }
}

function typeCheck(value, type = 'number') {
  return typeof value === type;
}

function interpolatePosition(origPosition, destPosition, spring) {
  const lefts = interpolate(origPosition.left, destPosition.left, spring);
  const tops = interpolate(origPosition.top, destPosition.top, spring);
  const result = [];
  for (let i = 0; i < lefts.length; i++) {
    result.push({ left: lefts[i], top: tops[i] });
  }

  return result;
}

function interpolate(orig, dest, spring) {
  if (typeof orig !== 'number' || typeof dest !== 'number') {
    throw new Error('Wrong paramters.');
  }

  const result = [];
  const gap = (dest - orig) / INTERPOLATE_TIMES;
  for (let i = 1; i < INTERPOLATE_TIMES; i++) {
    result.push(orig + gap * i);
  }
  result.push(dest - gap * 0.6);
  result.push(dest);
  if (spring) {
    // Aim to smooth the animation.
    result.push(dest + gap * 0.2);
  }

  return result;
}

function setNativePropsLazily(componentRef, nativeProps, interval) {
  return new Promise((resolve, reject) => {
    Timer.setTimeout(() => {
      try {
        componentRef.setNativeProps(nativeProps);
        resolve();
      }
      catch(error) {
        console.error(error);
        reject();
      }
    }, interval);
  });
}

export default translateWithAnimation;

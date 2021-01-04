
// Link to options page
document.querySelector('#options').addEventListener("click", function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});

// Timer script - credit Mateusz Rybczonek 

const FULL_DASH_ARRAY = 283;
const WARNING_THRESHOLD = 30;
const ALERT_THRESHOLD = 10;

const COLOR_CODES = {
  info: {
    color: "green"
  },
  warning: {
    color: "orange",
    threshold: WARNING_THRESHOLD
  },
  alert: {
    color: "red",
    threshold: ALERT_THRESHOLD
  }
};

const timerLength = 10*60;
let countdown = null;
let remainingPathColor = COLOR_CODES.info.color;

document.getElementById("app").innerHTML = `
<div class="base-timer">
  <svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g class="base-timer__circle">
      <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
      <path
        id="base-timer-path-remaining"
        stroke-dasharray="283"
        class="base-timer__path-remaining ${remainingPathColor}"
        d="
          M 50, 50
          m -45, 0
          a 45,45 0 1,0 90,0
          a 45,45 0 1,0 -90,0
        "
      ></path>
    </g>
  </svg>
  <span id="base-timer-label" class="base-timer__label">${formatTime(
    timerLength
  )}</span>
</div>
`;

function formatTime(time) {
  const minutes = Math.floor(time / 60);
  let seconds = time % 60;

  if (seconds < 10) {
    seconds = `0${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

function setRemainingPathColor(timeLeft, reset) {
  const { alert, warning, info } = COLOR_CODES;
  if (timeLeft <= alert.threshold) {
    document
      .getElementById("base-timer-path-remaining")
      .classList.remove(warning.color);
    document
      .getElementById("base-timer-path-remaining")
      .classList.add(alert.color);
  } else if (timeLeft <= warning.threshold) {
    document
      .getElementById("base-timer-path-remaining")
      .classList.remove(info.color);
    document
      .getElementById("base-timer-path-remaining")
      .classList.add(warning.color);
  }
  if (reset){
    document
      .getElementById("base-timer-path-remaining")
      .classList.remove(alert.color);
    document
      .getElementById("base-timer-path-remaining")
      .classList.remove(warning.color);
    document
      .getElementById("base-timer-path-remaining")
      .classList.add(info.color);
  }

}

function calculateTimeFraction(timeLeft) {
  const rawTimeFraction = timeLeft / timerLength;
  return rawTimeFraction - (1 / timerLength) * (1 - rawTimeFraction);
}

function setCircleDasharray(timeLeft) {
  const circleDasharray = `${(
    calculateTimeFraction(timeLeft) * FULL_DASH_ARRAY
  ).toFixed(0)} 283`;
  document
    .getElementById("base-timer-path-remaining")
    .setAttribute("stroke-dasharray", circleDasharray);
}

function timer(startTime) {
  clearInterval(countdown);

  let timeLeft = startTime;
  let timePassed = timerLength - timeLeft

  countdown = setInterval(() => {
    timePassed += 1;
    timeLeft = timerLength - timePassed;

    document.getElementById("base-timer-label").innerHTML = formatTime(timeLeft);

    setCircleDasharray(timeLeft);
    setRemainingPathColor(timeLeft, false);

    if (timeLeft === 0) {
      clearInterval(countdown);
      chrome.runtime.sendMessage({ cmd: 'RESET_TIMER'});
    }
  }, 1000);
}

chrome.runtime.sendMessage({ cmd: 'GET_TIME' }, response => { // when extension is opened
  if (response.endTime > 0) { // check whether timer is active
    timerTime = Math.round((response.endTime - Date.now())/1000) // if true, display active timer
    document.getElementById("base-timer-label").innerHTML = formatTime(timerTime);
    timer(timerTime)
  }
});

document.querySelector('#start').addEventListener("click", function() { // when start button is clicked, start timer
	// add code to update timerLength / restLength based on options
	chrome.runtime.sendMessage({ cmd: 'START_TIMER', timerLength: timerLength });
	setRemainingPathColor(timerLength, true);
  	timer(timerLength);
});

document.querySelector('#reset').addEventListener("click", function() { // when reset button is clicked, reset timer
	chrome.runtime.sendMessage({ cmd: 'RESET_TIMER'});
	clearInterval(countdown);
	setCircleDasharray(timerLength);
    setRemainingPathColor(timerLength, true);
    document.getElementById("base-timer-label").innerHTML = formatTime(timerLength);
});


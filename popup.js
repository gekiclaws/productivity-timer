
// Link to options page
document.querySelector('#options').addEventListener("click", function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});

// Options
let workPeriod = 25*60;
let restPeriod = 5*60;
let blocking = true;
let musicOn = true;

// Retrieve options from chrome.storage
chrome.storage.sync.get(['workPeriod','restPeriod','musicOn', 'blocking'], function(items) {
  if (items.workPeriod){
    workPeriod = items.workPeriod*60;
    restPeriod = items.restPeriod*60;
    blocking = items.blocking;
    musicOn = items.musicOn;
  }
  document.getElementById("base-timer-label").innerHTML = `${timerTypeLabel} <br> ${formatTime(workPeriod)}`;
});

// Timer script - credit Mateusz Rybczonek 

const FULL_DASH_ARRAY = 283;
const COLOR_CODES = {
  work: {
    color: "blue"
  },
  rest: {
    color: "green",
  }
};

let countdown = null;
let timerType = true;
let timerTypeLabel = "work";

document.getElementById("app").innerHTML = `
<div class="base-timer">
  <svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g class="base-timer__circle">
      <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
      <path
        id="base-timer-path-remaining"
        stroke-dasharray="283"
        class="base-timer__path-remaining ${COLOR_CODES.work.color}"
        d="
          M 50, 50
          m -45, 0
          a 45,45 0 1,0 90,0
          a 45,45 0 1,0 -90,0
        "
      ></path>
    </g>
  </svg>
  <span id="base-timer-label" class="base-timer__label"></span>
</div>
`;

// Format given time (in seconds) into MM:SS display format
function formatTime(time) { 
  const minutes = Math.floor(time / 60);
  let seconds = time % 60;

  if (seconds < 10) {
    seconds = `0${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

// Animate timer UI
function setRemainingPathColor() { // type is timer type: true for work timer/reset, false for rest timer
  const { work, rest } = COLOR_CODES;
  if (timerType){ 
    document.getElementById("base-timer-path-remaining").classList = `base-timer__path-remaining ${work.color}`
  } else {
    document.getElementById("base-timer-path-remaining").classList = `base-timer__path-remaining ${rest.color}`
  }
}

function calculateTimeFraction(timeLeft, timerLength) {
  const rawTimeFraction = timeLeft / timerLength;
  return rawTimeFraction - (1 / timerLength) * (1 - rawTimeFraction);
}

function setCircleDasharray(timeLeft, timerLength) {
  const circleDasharray = `${(
    calculateTimeFraction(timeLeft, timerLength) * FULL_DASH_ARRAY
  ).toFixed(0)} 283`;
  document
    .getElementById("base-timer-path-remaining")
    .setAttribute("stroke-dasharray", circleDasharray);
}

// Timer logic
function timer(timeLeft, timerLength, restTime) {
  clearInterval(countdown);

  setRemainingPathColor();
  
  let timePassed = timerLength - timeLeft;
  countdown = setInterval(() => { // update timer every second
    timePassed += 1;
    timeLeft = timerLength - timePassed;

    document.getElementById("base-timer-label").innerHTML = `${timerTypeLabel} <br> ${formatTime(timeLeft)}`
    setCircleDasharray(timeLeft, timerLength);

    if (timeLeft === 0) { // timer ended
      if (timerType){
        timerType = false;
        timerTypeLabel = "rest";
        timer(restTime, restTime, restTime)
      } else {
        resetTimer()
      }
      
    }
  }, 1000); // 1000ms = 1s
}

function runTimer(timeLeftTotal, workTime, restTime){ // initialize work-rest period
  if (timeLeftTotal >= restTime){ // timer in work phase
    timerTypeLabel = "work";
    document.getElementById("base-timer-label").innerHTML = `${timerTypeLabel} <br> ${formatTime(timeLeftTotal-restTime)}`;
    timer(timeLeftTotal-restTime, workTime, restTime);
  } else {
    timerType = false;
    timerTypeLabel = "rest";
    document.getElementById("base-timer-label").innerHTML = `${timerTypeLabel} <br> ${formatTime(timeLeftTotal)}`;
    timer(timeLeftTotal, restTime, restTime);
  }
}

function resetTimer(){ // reset UI
  clearInterval(countdown);
  timerType = true;
  timerTypeLabel = "work";
  setCircleDasharray(workPeriod, workPeriod);
  setRemainingPathColor();
  document.getElementById("base-timer-label").innerHTML = `${timerTypeLabel} <br> ${formatTime(workPeriod)}`;
}

chrome.runtime.sendMessage({ cmd: 'GET_TIME' }, response => { // when extension is opened
  if (response.restEnd > Date.now()) { // check whether timer is active
    let timerTime = Math.round((response.restEnd - Date.now())/1000)
    console.log(timerTime)
    runTimer(timerTime, response.workLength, response.restLength);
  }
  document.querySelector('#volume-control').value = response.volume*100;
});

document.querySelector('#start').addEventListener("click", function() { // when start button is clicked, start timer
	chrome.runtime.sendMessage({ cmd: 'RESET_TIMER'});
  chrome.runtime.sendMessage({ cmd: 'START_TIMER', workLength: workPeriod, restLength: restPeriod, musicOn: musicOn, blocking: blocking});
  runTimer(workPeriod+restPeriod, workPeriod, restPeriod);
});

document.querySelector('#reset').addEventListener("click", function() { // when reset button is clicked, reset timer
	chrome.runtime.sendMessage({ cmd: 'RESET_TIMER'});
  resetTimer();
});

document.querySelector('#volume-control').addEventListener("change", function(e) {
  chrome.runtime.sendMessage({ cmd: 'CHANGE_VOLUME', volume: e.currentTarget.value/100});
})

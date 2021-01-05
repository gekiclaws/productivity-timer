
// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			// Fires when pageURL has a web protocol
			conditions: [
			    new chrome.declarativeContent.PageStateMatcher({
			      pageUrl: {urlContains: '://'},
			    })
			],
			actions: [new chrome.declarativeContent.ShowPageAction()]
			}]);
	});
});

let workLength;
let workEnd;
let restLength;
let restEnd;

var music = new Audio(chrome.runtime.getURL("music/music.mp3"));
music.volume = 0.8;
music.loop = true;
var noti1 = new Audio(chrome.runtime.getURL("music/noti1.mp3"));
var noti2 = new Audio(chrome.runtime.getURL("music/noti2.mp3"));

let blocking = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.cmd === 'CHANGE_VOLUME'){
  	music.volume = request.volume;
  } else if (request.cmd === 'START_TIMER') {
  	if (request.musicOn){ music.play(); } // music on/off
  	blocking = request.blocking; // site blocking on/off

  	workLength = request.workLength;
  	workEnd = Date.now()+workLength*1000;
  	chrome.alarms.create('workAlert', {delayInMinutes: Math.round(workLength/60)});

    restLength = request.restLength;
    restEnd = Date.now()+(workLength+restLength)*1000;
    chrome.alarms.create('restAlert', {delayInMinutes: Math.round((workLength+restLength)/60)});

  } else if (request.cmd === 'GET_TIME') {
    sendResponse({ workEnd: workEnd, workLength: workLength, restEnd: restEnd, restLength: restLength, volume: music.volume});
  } else if (request.cmd === 'RESET_TIMER') {
    music.load();
    blocking = false;
    workEnd = 0;
    restEnd = 0;
    chrome.alarms.clear('workAlert', (wasCleared) => {})
    chrome.alarms.clear('restAlert', (wasCleared) => {})
  }
});

chrome.alarms.onAlarm.addListener(function(alarm){ // alert user when work/rest periods end
	if (alarm.name == "workAlert"){
		music.load();
		noti1.play();
		setTimeout(() => {alert(`work period ended. take a ${Math.round(restLength/60)} minute break!`)}, 2000);
	} else if (alarm.name == "restAlert"){
		noti2.play();
		setTimeout(() => {alert("rest over! click on the extension to start a new session.")}, 3000);
	}
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) { // block given list of sites 'blacklist'
  const url = changeInfo.pendingUrl || changeInfo.url;
  if (!url || !url.startsWith("http")) {
    return;
  }

  const hostname = new URL(url).hostname;

  chrome.storage.sync.get(["blacklist"], function (sync) {
    if (Array.isArray(sync.blacklist) && blocking && sync.blacklist.find(domain => hostname.includes(domain))) {
    	chrome.tabs.remove(tabId);
    }
  });
});

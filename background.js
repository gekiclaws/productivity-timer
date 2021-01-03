
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

let endAlert;
let endTime;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.cmd === 'START_TIMER') {
    endTime = Date.now()+request.timerLength*1000;
    endAlert = setTimeout(() => {
       alert("the timer has ended");
    }, request.timerLength*1000);
  } else if (request.cmd === 'GET_TIME') {
    sendResponse({ endTime: endTime});
  } else if (request.cmd === 'RESET_TIMER') {
    endTime = 0;
    clearTimeout(endAlert);
  }
});



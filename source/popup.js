"use strict";

var cardsToGen = 0;
var cardsGenned = 0;
var progressBarValue = 0;
var incrementValue = 0;
var working = "idle";
var oAuthToken;

const createCards = () => {
  document.getElementById("create-cards-btn").style.display = "none";
  document.getElementById("stop-generating-btn").style.display = "block";

  cardsToGen = document.getElementById("numCards").value;
  console.log(cardsToGen);
  cardsGenned = 0;
  setProgressBar(cardsGenned, cardsToGen);

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      function: "generate",
      deleteCards: document.getElementById("delCards").checked,
      numToGen: cardsToGen,
      authToken: oAuthToken
    });
  });
};

const stopGenerating = () => {
  document.getElementById("myBar").innerText = "Stopping";
  document.getElementById("myBar").style.background = "red";

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { function: "stop" });
  });
};

const getUserToken = () => {
  chrome.tabs.create({ url: "index.html" });
};

const setProgressBar = (cardsGenned, cardsToGen) => {
  progressBarValue = 0;
  incrementValue = 100 / cardsToGen;
  document.getElementById("myBar").innerHTML = `${cardsGenned}/${cardsToGen}`;
};

const updateProgressBar = (finished) => {
  var progressBar = document.getElementById("myBar");
  if (finished === true) {
    progressBar.style.width = "100%";
    progressBar.innerHTML = `Finished. Genned ${cardsGenned} cards`;
  } else {
    if (progressBar.style.width < 100) {
      progressBarValue = incrementValue * cardsGenned;
      progressBar.style.width = progressBarValue + "%";
      progressBar.innerHTML = `${cardsGenned}/${cardsToGen}`;
    }
  }
};

const logout = () => {
  chrome.storage.sync.set({ oAuthToken: null }, function () {
    oAuthToken = null;

    document.getElementById("logged-in").style = "display:none";
    document.getElementById("not-authed").style = "display:block";

    console.log("logged out");
  });
};

const checkIfOnCledara = () => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    if (!tabs[0].url.includes("cledara")) return;

    document.getElementById("create-cards-btn").disabled = false;
    document.getElementById("not-on-cled").style.display = "none";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { function: "check" }, (response) => {
        working = response.status;
        cardsToGen = response.cardsToGen;
        cardsGenned = response.cardsGenned;
        console.log(working);
      });
    });

    if (cardsToGen > 0) {
      setProgressBar(cardsGenned, cardsToGen);
    }
  });
};

document
  .getElementById("create-cards-btn")
  .addEventListener("click", createCards);

document.getElementById("login-btn").addEventListener("click", getUserToken);
document.getElementById("logout-btn").addEventListener("click", logout);
document
  .getElementById("stop-generating-btn")
  .addEventListener("click", stopGenerating);


chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.function === "callback") {
    switch (msg.status) {
      case "finished":
        updateProgressBar(true);
        document.getElementById("create-cards-btn").style.display = "block";
        document.getElementById("stop-generating-btn").style.display = "none";
        break;
      case "generating":
        document.getElementById("create-cards-btn").style.display = "none";
        document.getElementById("stop-generating-btn").style.display = "block";
        cardsGenned = msg.cardsGenned;
        updateProgressBar(false);
        break;
      case "oAuth":
        if (!msg.oAuthToken) return;
        oAuthToken = msg.oAuthToken;
        document.getElementById("not-authed").style = "display:none";
        document.getElementById("logged-in").style = "display:block";
        break;
    }
  }
});

chrome.storage.sync.get(["oAuthToken"], (result) => {
  if (!result.oAuthToken) return;

  oAuthToken = result.oAuthToken;
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    chrome.storage.sync.set({ oAuthToken: token }, () => {
      console.log(token);
      oAuthToken = token;
    });
  });
  document.getElementById("not-authed").style = "display:none";
  document.getElementById("logged-in").style = "display:block";
});

checkIfOnCledara();

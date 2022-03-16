"use strict";

class Card {
  constructor(cardName, name, cardNumber, expiryMonth, expiryYear, cvv) {
    this.cardName = cardName;
    this.name = name;
    this.cardNumber = cardNumber;
    this.expiryMonth = expiryMonth;
    this.expiryYear = expiryYear;
    this.cvv = cvv;
  }
}

var working = "idle";
var cardsGenned = 0;
var cardsToGen = 0;
var cards = [];
var stopWorking = false;
var accountId = "";

const resetGlobals = async () => {
  var accountInfo = await getAccountInfo();
  accountId = Object.keys(accountInfo.roles)[0];
  stopWorking = false;
  cards = [];
  working = "generating";
};

const deleteAllCards = async () => {
  var cards = getAllCards();
  var numDeleted = 0;
  for (let i = 0; i < cards.length; i++) {
    if (numDeleted >= request.numToGen) break;
    const loop = async () => {
      await deleteCard(cards[i], accountId);
    };
    loop();
    numDeleted++;
  }
  return numDeleted;
};

const getAllCards = () => {
  let pattern = new RegExp('href="/cards/(.*?)">', "g");
  var matches = document.documentElement.outerHTML.match(pattern);
  var cards = [];
  for (var match in matches) {
    var groups = pattern.exec(matches[match]);
    if (groups != null) {
      cards.push(groups[1]);
    }
    pattern.lastIndex = -1;
  }
  return cards;
};

const sleep = async (ms) => {
  if (ms == null) return;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const determineName = (cardText) => {
  var name = cardText[4];
  if (name.match(/[\d]/)) {
    name = undefined;
  }
  return name;
};

const determineExpiry = (cardText) => {
  let expiryMonth, expiryYear;
  cardText.forEach((text) => {
    if (text.match(/\d\d\/\d\d/)) {
      expiryMonth = text.split("/")[0];
      expiryYear = text.split("/")[1];
    }
  });
  return [expiryMonth, expiryYear];
};

const determineCVV = (cardText) => {
  let cvv = cardText[3]
    .replace("CW ", "")
    .replace("JW", "")
    .replace("CVV", "")
    .trim();
  if (!cvv.match(/[^\/\s]{3}/)) {
    cardText.forEach((text) => {
      if (text.match(/(CJ||CW||CVV) [^\/\s]{3}/)) {
        cvv = text
          .replace("CW", "")
          .replace("JW", "")
          .replace("CVV", "")
          .trim();
      }
    });
  }
  return cvv;
};

const createCardReq = async (name, accountId) => {
  const response = await fetch(
    `https://app.cledara.com/api/accounts/${accountId}/simpleCards`,
    {
      method: "POST",
      mode: "same-origin",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify({
        name: name,
        description: ".",
        teamId: "",
        currency: "GBP",
      }),
    }
  );
  return response.json(); // parses JSON response into native JavaScript objects
};

const deleteCard = async (cardId, accountId) => {
  const response = await fetch(
    `https://app.cledara.com/api/accounts/${accountId}/simpleCards/${cardId}/status`,
    {
      method: "PUT",
      mode: "same-origin",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify({ status: "disabled" }),
    }
  );
  return response.json(); // parses JSON response into native JavaScript objects
};

const getCardInfo = async (cardId, accountId) => {
  const response = await fetch(
    `https://app.cledara.com/api/accounts/${accountId}/cards/${cardId}/showCard`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      referrerPolicy: "strict-origin-when-cross-origin",
      body: "{}",
    }
  );
  return response.json(); // parses JSON response into native JavaScript objects
};

const getCardStatus = async (cardId, accountId) => {
  const response = await fetch(
    `https://app.cledara.com/api/accounts/${accountId}/cards/${cardId}/status`,
    {
      method: "GET",
      mode: "same-origin",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      referrerPolicy: "strict-origin-when-cross-origin",
    }
  );
  return response.json(); // parses JSON response into native JavaScript objects
};

const getAccountInfo = async () => {
  const response = await fetch(`https://app.cledara.com/api/users/me`, {
    method: "GET",
    mode: "same-origin",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  return response.json(); // parses JSON response into native JavaScript objects
};

const parseCardImage = async (cardImageUrl, oAuthKey) => {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oAuthKey}`,
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              source: {
                imageUri: cardImageUrl,
              },
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
              },
            ],
          },
        ],
      }),
    }
  );
  return response.json(); // parses JSON response into native JavaScript objects}
};

const generateCard = async (authToken) => {
  var cardName = Math.random().toString(36).substring(2, 8);

  var card = await createCardReq(cardName, accountId);

  if (card.cardId == null || card.cardId == undefined || card.cardId == "") {
    throw "Max cards reached!"; // max cards reached
  }

  let cardStatus;
  do {
    await sleep(2000);
    let response = await getCardStatus(card.cardId, accountId);
    cardStatus = response.status;
    if (cardStatus == "cardFailedToActivate") break;
  } while (cardStatus != "active");

  if (cardStatus == "cardFailedToActivate") {
    // skips to next card
    return null;
  }

  var cardInfo = await getCardInfo(card.cardId, accountId);

  var response = await parseCardImage(cardInfo.cardUrl, authToken);

  var cardText = response.responses[0].fullTextAnnotation.text.split("\n");
  var expiry = determineExpiry(cardText);
  var cvv = determineCVV(cardText);
  var name = determineName(cardText);

  return new Card(
    cardName,
    name,
    cardInfo.cardNumber,
    expiry[0],
    expiry[1],
    cvv
  );
};

const generateCards = async (numOfCards, authToken) => {
    for (let i = 0; i < numOfCards; i++) {
      let newCard;
      try {
        newCard = await generateCard(authToken);
      } catch (e) {
        alert(e);
        return;
      }

      console.log(newCard);

      if (newCard == null) continue;

      cards.push(newCard);

      cardsGenned = cards.length;

      chrome.runtime.sendMessage({
        function: "callback",
        status: "generating",
        cardsGenned: cardsGenned,
      });

      if (stopWorking) return;
    }
};

const exportToCSV = () => {
  let csv = "";
  for (let row = -1; row < cards.length; row++) {
    let keysAmount = Object.keys(cards[0]).length;
    let keysCounter = 0;

    if (row == -1) {
      for (let key in cards[0]) {
        csv += key + (keysCounter + 1 < keysAmount ? "," : "\r\n");
        keysCounter++;
      }
    } else {
      for (let key in cards[row]) {
        csv += cards[row][key] + (keysCounter + 1 < keysAmount ? "," : "\r\n");
        keysCounter++;
      }
    }

    keysCounter = 0;
  }

  let link = document.createElement("a");
  link.id = "download-csv";
  link.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(csv)
  );
  link.setAttribute("download", "cards.csv");
  document.body.appendChild(link);
  document.querySelector("#download-csv").click();
};

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  switch (request.function) {
    case "generate":
      await resetGlobals();

      cardsToGen = request.numToGen;

      if (request.deleteCards) {
        var numDeleted = await deleteAllCards();
        alert(`Deleted ${numDeleted} cards! Click Ok to continue.`);
      }

      await generateCards(request.numToGen, request.authToken);

      console.log(cards);
    
      if (cards.length > 0) exportToCSV();
      
      sendResponse({
        function: "callback",
        status: "finished",
        cardsGenned: cardsGenned,
        cardsToGen: cardsToGen,
      });
      break;
    case "stop":
      stopWorking = true;
      break;
    case "check":
      sendResponse({
        function: "callback",
        status: working,
        cardsGenned: cardsGenned,
        cardsToGen: cardsToGen,
      });
      break;
  }
  return true;
});

console.log("injected");

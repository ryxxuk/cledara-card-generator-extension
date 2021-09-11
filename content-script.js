function createCard(name) {
    const response = await fetch(url, {
        method: 'POST', 
        mode: 'same-origin',
        cache: 'no-cache', 
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        referrerPolicy: 'strict-origin-when-cross-origin', 
        body: JSON.stringify({
            'name': name,
            'description': '.',
            'teamId': '',
            'currency': 'GBP',
          })
      });
      return response.json(); // parses JSON response into native JavaScript objects
}

function deleteCard() {

}

function getAllCards() {

}

function enableCard() {

}

function getCardInfo() {

}

function getAccountInfo() {

}

function parseCardImage() {

}
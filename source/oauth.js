window.onload = function () {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    chrome.storage.sync.set({ oAuthToken: token }, function () {
      console.log(token);
      alert("Authenticated");
      window.close();
    });
  });
};

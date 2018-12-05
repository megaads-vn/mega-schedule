'use strict'

class ActivityController {

  constructor ({ socket, request }) {
    this.socket = socket;
    this.request = request;
    console.log("Socket connected as %s.", socket.id);
  }

  onClientEmit (message) {
    console.log(message);
  }

}

module.exports = ActivityController

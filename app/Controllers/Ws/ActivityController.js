'use strict'

class ActivityController {

  constructor ({ socket, request }) {
    this.socket = socket;
    this.request = request;
    socket.emit('socketId', socket.id);
    socket.emit('scheduleRun', scheduleRun);
  }

  onClientEmit (message) {
    console.log(message);
  }

}

module.exports = ActivityController

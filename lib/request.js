"use strict";

var requestState = {
    Start: 1,
    SendCmd: 2,
    SendAck: 3,
    Done: 4,
    Error: 5
};

function Request() {
    this.state = requestState.Start;
}

exports.states = requestState;
exports.Request = Request;

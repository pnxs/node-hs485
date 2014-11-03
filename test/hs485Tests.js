"use strict";

var assert = require("assert");
var hs485 = require("../index");
var physical = require("../lib/physical");

describe("hs485", function() {

    describe("request", function() {
        it('create request object', function() {
            var r = new hs485.request.Request();

            assert.equal(r.state, hs485.request.states.Start);
        });
    });
});

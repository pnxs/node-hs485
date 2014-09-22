"use strict"
var assert = require("assert");
var hs485 = require("../");
var util = require("util");

describe("hs485", function() {

    describe("manager", function() {
        it('discover', function() {
            var manager = new hs485.Manager();

            // expect send fe0400aed0

            // push receive: 
            // fe 00 98 00 07 80 00 00 05 4e 8d 34
            // fe 00 98 00 07 80 00 00 05 e9 5c 6e
            // fe 00 98 00 07 80 00 00 0c 52 de 3c
            // fe 00 98 00 07 80 00 00 12 0a c1 78
            // fe 00 98 00 07 80 00 00 2a 92 17 2c
            // fe 00 98 00 07 80 00 00 2a 99 a7 3a
            // fe 00 98 00 07 80 ff ff ff ff 4a ee (End of discovery)

            manager.discoverModules(function(devList) {
                assert.deepEqual(devList, []);
            });


        });
    });
});

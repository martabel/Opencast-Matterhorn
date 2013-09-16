/*global define, describe, beforeEach, it, expect*/
define(['engage/engage_core'], function (EngageCore) {
  describe("EngageCore", function () {
    var engageCore;

    beforeEach(function () {
      engageCore = EngageCore;
    });


    it("should have pluginInfo", function () {
      expect(engageCore.pluginInfos).toBeDefined();
    });

    describe("pluginInfos", function () {

      it("should have a urlRoot", function () {
        expect(engageCore.pluginInfos.urlRoot).toBeDefined();
        expect(engageCore.pluginInfos.urlRoot).toBe('/engage/theodul/manager/list.json');
      });

    });
  });
});
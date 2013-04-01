$(function () {
  var startEliza = function(jqconsole) {
    var eliza = new Eliza(eliza_script);
    jqconsole.Write(eliza.greet() + '\n');
    waitRespond(jqconsole, eliza);
  };

  var waitRespond = function (jqconsole, eliza) {
    jqconsole.Prompt(true, function (input) {
      jqconsole.Write(eliza.respondTo(input) + '\n', 'jqconsole-output');
      if (!eliza.finished) {
        waitRespond(jqconsole, eliza);
      } else {
        window.setTimeout(
          function(){
            jqconsole.Reset();
            startEliza(jqconsole);
          },
          2000);
      }
    });
  };

  var jqconsole = $('#console').jqconsole('', '> ');
  startEliza(jqconsole);
});


$(function () {
  var Client = function(jqconsole) {
    this.finished = false;

    this.say = function(phrase) {
      jqconsole.Write((phrase + '\n').toUpperCase(), 'jqconsole-output');
    };

    this.quit = function() {
      this.finished = true;
    };
  };

  var startEliza = function(jqconsole) {
    var client = new Client(jqconsole);
    var eliza = new Eliza(client, eliza_script);
    waitRespond(jqconsole, eliza, client);
  };

  var waitRespond = function (jqconsole, eliza, client) {
    jqconsole.Prompt(true, function (input) {
      eliza.say(input)
      if (!client.finished) {
        waitRespond(jqconsole, eliza, client);
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


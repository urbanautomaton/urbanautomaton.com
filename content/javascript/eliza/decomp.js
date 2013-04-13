function Decomp (regex, phrases) {
  var phrases = phrases;
  var count   = 0;
  var regex   = regex;

  this.match = function(phrase) {
    var m = regex.exec(phrase);
    if (m) {
      m.shift(1);
      return this.nextPhrase(m);
    } else {
      return false;
    }
  };

  this.nextPhrase = function(captures) {
    var phrase = phrases[count % phrases.length];
    count += 1;
    for (var i=0; i < captures.length; i++) {
      sub_regex = new RegExp("\\(" + (i+1) + "\\)");
      phrase = phrase.replace(sub_regex, captures[i]);
    }
    return phrase;
  };
};



function Eliza (script) {
  this.script = script;
  this.finished = false;

  this.pipe = function(terms, funs) {
    var output = terms;
    for (var i=0; i<funs.length; i++) {
      output = funs[i].call(this, output);
    }
    return output;
  }

  this.preSub = function(terms) {
    return this.substitute(terms, 'pre');
  };

  this.postSub = function(terms) {
    return this.substitute(terms, 'post');
  };

  this.substitute = function(terms, sub) {
    output = [];
    for (var i=0; i<terms.length; i++) {
      output.push(this.script[sub][terms[i].toLowerCase()] || terms[i]);
    }
    return output;
  };

  this.isQuitMessage = function(input) {
    return (this.script['quit'].indexOf(input) >= 0);
  };

  this.responseFor = function(input) {
    var in_terms = input.split(" ");
    var out_terms = this.pipe(in_terms, [this.preSub, this.postSub]);
    return out_terms.join(" ");
  }

}

Eliza.prototype.greet = function() {
  return this.script['initial'];
};

Eliza.prototype.respondTo = function(input) {
  if (this.isQuitMessage(input)) {
    return this.quit();
  } else {
    return this.responseFor(input);
  }
};

Eliza.prototype.quit = function() {
  this.finished = true;
  return this.script['final'];
};

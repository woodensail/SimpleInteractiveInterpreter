function Interpreter() {
    this.vars = {};
    this.functions = {};
    this.native = {'+': this.add, '-': this.sub, '*': this.mul, '/': this.div, '%': this.mod, '=': this.assign};
}

Interpreter.prototype.add = function (x, y, scope) {
    return this.extractValue(x, scope) + this.extractValue(y, scope);
};
Interpreter.prototype.sub = function (x, y, scope) {
    return this.extractValue(x, scope) - this.extractValue(y, scope);
};
Interpreter.prototype.mul = function (x, y, scope) {
    return this.extractValue(x, scope) * this.extractValue(y, scope);
};
Interpreter.prototype.div = function (x, y, scope) {
    return this.extractValue(x, scope) / this.extractValue(y, scope);
};
Interpreter.prototype.mod = function (x, y, scope) {
    return this.extractValue(x, scope) % this.extractValue(y, scope);
};
Interpreter.prototype.assign = function (x, y, scope) {
    var value = this.extractValue(y, scope);
    if (scope.x !== void 0) {
        return scope[x] = value;
    } else if ('number' === typeof x) {
        throw 'assign to lValue'
    } else if (!this.functions[x]) {
        return this.vars[x] = value;
    }
    throw 'name conflicting'
};
Interpreter.prototype.tokenize = function (program) {
    if (program === '')
        return [];

    var regex = /\s*(=>|[-+*\/\%=\(\)]|[A-Za-z_][A-Za-z0-9_]*|[0-9]*\.?[0-9]+)\s*/g;
    return program.split(regex).filter(function (s) {
        return !s.match(/^\s*$/);
    });
};
Interpreter.prototype.extractValue = function (key, scope) {
    scope = scope || {};
    if (this.functions[key]) {
        return this.exec(this.functions[key].syntaxTree)
    } else {
        var value = scope[key];
        if (value === void 0) {
            value = this.vars[key];
        }
        if (value === void 0) {
            value = key;
        }
        if ('number' === typeof value) {
            return value;
        }
        throw 'nonexistent var';
    }
};
Interpreter.prototype.exec = function (syntaxTree, scope) {
    scope = scope || {};
    var name = syntaxTree[0], params, _this = this;
    for (var i = 1; i < syntaxTree.length; i++) {
        if (syntaxTree[i] instanceof Array) {
            syntaxTree[i] = this.exec(syntaxTree[i], scope);
        }
    }
    if (this.native[name]) {
        params = syntaxTree.slice(1);
        params.push(scope);
        return this.native[name].apply(this, params);
    } else if (this.functions[name]) {
        var fun = this.functions[name];
        params = {};

        fun.params.forEach(function (key, i) {
            var k = syntaxTree[i + 1];
            params[key] = _this.extractValue(k, scope);
        });

        return this.exec(fun.syntaxTree, params);
    } else {
        if (name === void 0) {
            return syntaxTree
        }
        return this.extractValue(name, scope);
    }
};
Interpreter.prototype.input = function (expr) {
    var syntax, result, tokens = this.tokenize(expr);
    if (!tokens.length) {
        return '';
    }
    if (syntax = this.parser(tokens)) {
        result = this.exec(syntax[0]);
        return result;
    } else {
        return '';
    }
};

var operators = {'=': 4, '+': 3, '-': 3, '*': 2, '/': 2, '%': 2};

Interpreter.prototype.parser = function (tokens) {
    if (tokens[0] === 'fn') {
        this.functionParser(tokens);
    } else {
        return this.expressionParser(tokens);
    }
};
Interpreter.prototype.functionParser = function (tokens) {
    var index = tokens.indexOf('=>'), paramObj = {}, params = [], fnName = tokens[1];
    if (this.vars[fnName] !== void 0) {
        throw 'name conflicting'
    }
    for (var i = 2; i < index; i++) {
        if (paramObj[tokens[i]]) {
            throw 'param conflicting'
        }
        paramObj[tokens[i]] = 1;
        params.push(tokens[i]);
    }
    var result = this.expressionParser(tokens.slice(index + 1));
    var syntaxTree = result[0], varList = result[1];
    varList.forEach(function (v) {
        if (!paramObj[v]) {
            throw 'nonexistent param'
        }
    });
    this.functions[fnName] = {params: params, syntaxTree: syntaxTree}
};
Interpreter.prototype.expressionParser = function (tokens) {
    var SPACE = {}, params = [], operatorStack = [], dataStack = [SPACE], expressionFlag = true, lValue, rValue, operator, vars = {};
    tokens = tokens.slice();
    tokens.push(')');
    tokens.unshift('(');

    while (tokens.length) {
        var next = tokens.pop();
        if (operators[next]) {
            while (true) {
                if (!operatorStack.length) {
                    operatorStack.push(next);
                    break;
                } else if (operatorStack[operatorStack.length - 1] === ')') {
                    operatorStack.push(next);
                    break;
                } else if ((operators[operatorStack[operatorStack.length - 1]] === operators[next] ) && (next !== '=')) {
                    operatorStack.push(next);
                    break;
                } else if (operators[operatorStack[operatorStack.length - 1]] > operators[next]) {
                    operatorStack.push(next);
                    break;
                } else {
                    operator = operatorStack.pop();
                    lValue = dataStack.pop();
                    rValue = dataStack.pop();
                    dataStack.push([operator, lValue, rValue]);

                }
            }
            expressionFlag = true;
            continue;
        } else if (next === '(') {
            next = operatorStack.pop();
            while (next !== ')') {
                if (next === void 0) {
                    break
                }
                lValue = dataStack.pop();
                rValue = dataStack.pop();
                dataStack.push([next, lValue, rValue]);
                next = operatorStack.pop();
            }
            continue;
        }
        if (expressionFlag) {
            expressionFlag = false;
        } else {
            while (operatorStack.length) {
                operator = operatorStack.pop();
                if (operator === ')') {
                    operatorStack.push(operator);
                    break;
                } else {
                    lValue = dataStack.pop();
                    rValue = dataStack.pop();
                    dataStack.push([operator, lValue, rValue]);
                }
            }
        }

        if (next === ')') {
            expressionFlag = true;
            operatorStack.push(next);
        } else if (!this.functions[next]) {
            if (!this.regexNum.test(next)) {
                vars[next] = 1;
            } else {
                next = Number(next);
            }
            dataStack.push(next);
        } else {
            params = [next];
            for (var i in this.functions[next].params) {
                params.push(dataStack.pop());
            }
            dataStack.push(params);
        }
    }
    var varList = [];
    for (var k in vars) {
        varList.push(k);
    }
    if (dataStack[0] === SPACE) {
        dataStack.shift();
    } else {
        throw 'expression error'
    }
    if (dataStack.length > 1) {
        throw 'expression error'
    }
    return [dataStack[0], varList];
};
Interpreter.prototype.regexNum = /^-?\d+(\.\d+)?$/;
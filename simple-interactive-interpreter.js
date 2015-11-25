function Interpreter() {
    this.vars = {};
    this.functions = {test: {params: ['x', 'y']}, echo: {params: ['v']}};
}
Interpreter.prototype.tokenize = function (program) {
    if (program === "")
        return [];

    var regex = /\s*(=>|[-+*\/\%=\(\)]|[A-Za-z_][A-Za-z0-9_]*|[0-9]*\.?[0-9]+)\s*/g;
    return program.split(regex).filter(function (s) {
        return !s.match(/^\s*$/);
    });
};

Interpreter.prototype.input = function (expr) {
    var tokens = this.tokenize(expr);
    var t = this.parser(tokens);
};

var operators = {'=': 4, '+': 3, '-': 3, '*': 2, '/': 2, '%': 2};
Interpreter.prototype.parser = function (tokens) {
    var params = [], operatorStack = [], dataStack = [], expressionFlag = true, lValue, rValue, operator;
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
                } else if (operators[operatorStack[operatorStack.length - 1]] >= operators[next]) {
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
            dataStack.push(next);
        } else {
            params = [next];
            for (var i in this.functions[next].params) {
                params.push(dataStack.pop());
            }
            dataStack.push(params);
        }

    }
    return dataStack[0];
};
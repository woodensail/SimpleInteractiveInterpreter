function Compiler() {
}

Compiler.prototype.compile = function (program) {
    return this.pass3(this.pass2(this.pass1(program)));
};

Compiler.prototype.tokenize = function (program) {
    // Turn a program string into an array of tokens.  Each token
    // is either '[', ']', '(', ')', '+', '-', '*', '/', a variable
    // name or a number (as a string)
    var regex = /\s*([-+*/\(\)\[\]]|[A-Za-z]+|[0-9]+)\s*/g;
    return program.replace(regex, ":$1").substring(1).split(':').map(function (tok) {
        return isNaN(tok) ? tok : tok | 0;
    });
};
var operators = {'+': 2, '-': 2, '*': 1, '/': 1};
Compiler.prototype.pass1 = function (program) {
    var tokens = this.tokenize(program), index = tokens.indexOf(']'), args = {}, next, dataStack = [];
    operatorStack = [];
    for (var i = 1; i < index; i++) {
        args[tokens[i]] = i - 1;
    }
    tokens = tokens.slice(index + 1);
    tokens.unshift('(');
    tokens.push(')');
    while ((next = tokens.pop()) !== void 0) {
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
                    dataStack.push({op: operatorStack.pop(), a: dataStack.pop(), b: dataStack.pop()});
                }
            }
        } else if (next === '(') {
            while ((next = operatorStack.pop()) !== ')') {
                if (next === void 0) {
                    break
                }
                dataStack.push({op: next, a: dataStack.pop(), b: dataStack.pop()});
            }
        } else if (next === ')') {
            operatorStack.push(next);
        } else {
            if (args[next] !== void 0) {
                dataStack.push({op: 'arg', n: args[next]});
            } else {
                dataStack.push({op: 'imm', n: Number(next)});
            }
        }
    }
    return dataStack[0];
};

Compiler.prototype.pass2 = function (ast) {
    if ((ast.op === 'arg') || (ast.op === 'imm')) {
        return ast;
    }
    ast.a = this.pass2(ast.a);
    ast.b = this.pass2(ast.b);
    if ((ast.a.op === 'imm') && (ast.b.op === 'imm')) {
        return {op: 'imm', n: this.execOp(ast.op, ast.a.n, ast.b.n)}
    } else {
        return ast;
    }
};

Compiler.prototype.pass3 = function (ast) {
    switch (ast.op) {
        case 'imm':
            return ["IM " + ast.n, "PU"];
        case 'arg':
            return ["AR " + ast.n, "PU"];
        case '+':
            return this.pass3(ast.a).concat(this.pass3(ast.b)).concat(["PO", "SW", "PO", "AD", "PU"]);
        case '-':
            return this.pass3(ast.a).concat(this.pass3(ast.b)).concat(["PO", "SW", "PO", "SU", "PU"]);
        case '*':
            return this.pass3(ast.a).concat(this.pass3(ast.b)).concat(["PO", "SW", "PO", "MU", "PU"]);
        case '/':
            return this.pass3(ast.a).concat(this.pass3(ast.b)).concat(["PO", "SW", "PO", "DI", "PU"]);
    }
};
Compiler.prototype.execOp = function (op, a, b) {
    switch (op) {
        case '+':
            return a + b;
        case '-':
            return a - b;
        case '*':
            return a * b;
        case '/':
            return a / b;
    }
};
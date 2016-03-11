/*
 * Copyright (c) 2016 Internet of Protocols Alliance (IOPA)
 * Portions Copyright 2013 Andy Edinborough under MIT license
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function(global, module, undefined){
	"use strict";
var proxy = function (func) {
	return function (obj, arg) { return func.apply(obj, [arg]); };
},
	each = proxy(Array.prototype.forEach),
	map = proxy(Array.prototype.map),
	some = proxy(Array.prototype.some),
	objectKeys = Object.keys,
	bind = proxy(Function.prototype.bind);
function extend(a) {
	each(arguments, function (b, i) {
		if (i === 0) return;
		if (b)
			each(objectKeys(b), function (key) {
				a[key] = b[key];
			});
	});
	return a;
}

function doubleEncode(txt) {
	return txt
		.split('\\').join('\\\\')
		.split('\r').join('\\r')
		.split('\n').join('\\n')
		.split('"').join('\\"');
}

function htmlString(value) {
	return {
		toString: function () {
			return value;
		},
		isHtmlString: true
	};
}

function encode(value){
	if (value === null || value === undefined) value = '';
	if (value.isHtmlString) return value;
	if (typeof value !== 'string') value += '';
	value = value
		.split('&').join('&amp;')
		.split('<').join('&lt;')
		.split('>').join('&gt;')
		.split('"').join('&quot;');
	return htmlString(value);
}

var HtmlHelper = function(){ };
extend(HtmlHelper.prototype, {
	encode: encode,
	attributeEncode: encode,
	raw: htmlString,
	renderPartial: function (view, model, page) {
		return htmlString(Razor.view(view)(model, page || this.page));
	}
});
var Reader = (function () {
	var reader = function (text) {
		this.text = (text || '') + '';
		this.position = -1;
		this.length = this.text.length;
	};

	var Chunk = reader.Chunk = function (value, next) {
		this.value = value || ''; this.next = next || '';
		if(!value && !next) return '';
		this.length = (this.value + this.next).length;
	};
	extend(Chunk.prototype, {
		length: 0,
		toString: function () { return this.value + this.next + ''; }
	});
	Chunk.create = function(value, next) {
		if(!value && !next) return '';
		return new Chunk(value, next);
	};

	function read(rdr, chars, until) {
		var l, cache = [], result = '', next = '';

		function predicate(chr) {
			l = chr.length;
			next = cache[l] || (cache[l] = rdr.peek(l));
			return next === chr;
		}

		while (!rdr.eof()) {
			cache.length = 0;
			if (until === some(chars, predicate)) {
				if (until) {
					rdr.seek(l);
				} else {
					next = last(result);
					result = result.length > 0 ? result.substr(0, result.length - 1) : '';
				}
				return Chunk.create(result, next);
			}

			next = rdr.read();
			if (next) {
				result += next;
			} else break;
		}

		return Chunk.create(result, next);
	}

	extend(reader.prototype, {
		eof: function() {
			return this.position >= this.length;
		},

		read: function (len) {
			var value = this.peek(len);
			this.position = Math.min(this.length, this.position + (len || 1));
			return value;
		},

		readAll: function () {
			if (this.position >= this.length) return undefined;
			var value = this.text.substr(this.position + 1);
			this.position = this.length;
			return value;
		},

		peek: function (len) {
			if ((this.position + 1) >= this.length) return undefined;
			return this.text.substr(this.position + 1, len || 1);
		},

		seek: function (offset, pos) {
			this.position = Math.max(0,
			Math.min(this.length,
				(pos === 0 ? 0 : pos === 2 ? this.length : this.position) +
				(offset || 1)
				)
			);
			return this.position === this.length;
		},

		readUntil: function (chars) {
			if (typeof chars === 'string') chars = [].slice.call(arguments);
			return read(this, chars, true);
		},

		readWhile: function (chars) {
			if (typeof chars === 'string') chars = [].slice.call(arguments);
			return read(this, chars, false);
		}
	});

	return reader;
})();


//Reader Extensions
var rxValid = /^[a-z0-9\._]+/i, rxTagName = /^[a-z]+(?:\:[a-z]+)?/i;
function last(str) {
	return (str = (str || '')).substr(str.length - 1);
}

Reader.prototype.readWhitespace = function () {
	return this.readWhile('\r', '\n', '\t', ' ');
};

Reader.prototype.readQuoted = function (quote) {
	var result = '', block;
	while (true) {
		block = this.readUntil(quote);
		if (!block) break;
		result += block.value + block.next;
		if (last(block.value) !== '\\')
			break;
	}
	return result;
};

Reader.prototype.readQuotedUntil = function (chars) {
	var result = '', block;
	if (typeof chars == 'string') chars = [].slice.call(arguments);
	chars = ['"', "'", '@*'].concat(chars);

	while (!!(block = this.readUntil(chars))) {
		result += block.value;
		if (block.next === '"' || block.next === "'") {
			result += block.next + this.readQuoted(block.next);

		} else if (block.next === '@*') {
			this.readUntil('*@');
		} else break;
	}

	return Reader.Chunk.create(result, block.next);
};

Reader.prototype.readBlock = function (open, close, numOpen) {
	var block, blockChars = [open, close], ret = '';
	numOpen = numOpen || 0;

	while (!!(block = this.readUntil(blockChars))) {
		ret += block.value;

		if (block.next === open) {
			numOpen++;
		} else if (block.next === close) {
			numOpen--;
		}

		if (numOpen === 0) {
			ret += block.next;
			return ret;
		} else ret += block.next;
	}

	return ret;
};
var Razor;
var Cmd = function (code, type) {
	this.code = code || '';
	this.type = type || 0;
};
extend(Cmd.prototype, {
	type: 0, code: '',
	toString: function () {
		var code = this.code;
		if (this.type === 0) return code;
		if (this.type === 2) return "writeLiteral(\"" + doubleEncode(code) + "\");";
			if (this.type === 3) return "writeLiteral(\"" + code + "\");";
					if (this.type === 4) return "writeLiteral(" + code + ");";
	
		return 'write(' + code + ');';
	}
});

var _function_template_basic = 'var writer = [], writeLiteral = function(a) { writer.push(a); }, write = function(a){ writeLiteral(html.encode(a)); };\n';
var _function_template = 
	_function_template_basic + 
	'var page = this, model = page.model, viewBag = this.viewBag, html = this.html,\n' + 
	'	isSectionDefined = this.isSectionDefined ? bind(this.isSectionDefined, this) : undefined,\n' +
	'	renderSection = this.renderSection ? bind(this.renderSection, this) : undefined,\n' +
	'	renderBody = this.renderBody ? bind(this.renderBody, this) : undefined,\n' +
	'	_layout = this.layout, layout;\n' +
	'@code\nif(_layout !== layout) { this.layout = layout; }\nreturn writer.join("");\n';

function parse(template) {
	var rdr = new Reader(template),
		level = arguments[1] || 0, mode = arguments[2] || 0,
		cmds = [], helpers = [], sections = [], chunk, peek, block, bracket,
		parseCodeBlock = function() {
			peek = rdr.peek();
			if (peek === '*') rdr.readUntil('*@');
			else if (peek === '(') {
				block = rdr.readBlock('(', ')');
				cmds.push(block.substr(1, block.length - 2), 1);
		
			} else if (peek === '{') {
				block = rdr.readBlock('{', '}');
				cmds.push(parse(block.substr(1, block.length - 2), level + 1, 1).join('\n'));
		
			} else if (peek === ':' && mode === 1) {
				block = rdr.readUntil('\n', '@', '}');
				block.value = block.value.substr(1);
             
				cmds.push(block.value,3);
				
				while (block.next === '@') {
					if (rdr.peek() === "{")
					{
						var temp = rdr.readBlock('{', '}');
						block.value = temp.substr(1, temp.length - 2);
						block.next = ' ';
					} else {
						var temp = rdr.readUntil('\n', '@', '}', ' ');
						block.value = temp.value;
						block.next = temp.next;
					}	
					cmds.push(block.value,4);
					if (block.next === ' ')
					{
						var temp = rdr.readUntil('\n', '@', '}');
						block.value = temp.value;
						block.next = temp.next;
						cmds.push(block.value,3);
					}
				}
				if (block.next === '\n')
					cmds.push('\n', 2);
				else
				  rdr.seek(-1);
			} else if (
					(peek === 'i' && rdr.peek(2) === 'if') ||
					(peek === 'd' && rdr.peek(2) === 'do') ||
					(peek === 'f' && rdr.peek(3) === 'for') ||
					(peek === 'w' && rdr.peek(5) === 'while') ||
					(peek === 'h' && rdr.peek(6) === 'helper') ||
					(peek === 's' && rdr.peek(6) === 'switch') ||
					(peek === 's' && rdr.peek(7) === 'section')
				) {
						block = rdr.readBlock('{', '}');

						if (peek === 'i') {
							while (!rdr.eof()) {
								var whiteSpace = rdr.readWhitespace();
								if (!whiteSpace) break;
								else if (rdr.peek(4) !== 'else') {
									rdr.seek(-whiteSpace.length);
									break;
								}
								block += whiteSpace + rdr.readBlock('{', '}');
							}
						} 

						var parsed = parse(block.substr(0, block.length - 1), level + 1, 1).join('\r\n\t'),
							paren = parsed.indexOf('(');
						bracket = parsed.indexOf('{');

						if (paren === -1 || bracket < paren) paren = bracket;
						if (peek === 'h') helpers.push('function ' + parsed.substring(7, bracket) + '{' +
							_function_template_basic + parsed.substr(bracket + 1) + 
							'\nreturn html.raw(writer.join(""));\n}\n');
						else if (peek === 's' && block.substr(0,6) != 'switch') 
							sections.push('sections.' + parsed.substr(8, paren - 8) + ' = function () {' + 
								_function_template_basic + parsed.substr(bracket + 1) + 
								'\nreturn writer.join("");\n}\n');
						else cmds.push(parsed + '}');

			} else if (peek && !rxValid.test(last(chunk.value))) {

				var remain, match;
				block = ''; 
				while (!rdr.eof()) {
					remain = rdr.text.substr(rdr.position + 1);
					match = remain.match(rxValid);
					if (!match) break;
					block += rdr.read(match[0].length);
					peek = rdr.peek();
					if(!peek) break;
					if (peek === '[' || peek === '(') {
						remain = rdr.readBlock(peek, peek === '[' ? ']' : ')');
						if(peek === '(' && (/\s*function[\s*\(]/).test(remain)) {
							bracket = remain.indexOf('{');
							block += remain.substr(0, bracket);
							block += parse(remain.substr(bracket), level + 1, 1).join('\r\n\t');
						} else {
							block += remain;
						}
						break;
					}
				}
				if (block) 
					cmds.push(block, 1);
					
			} else if (mode === 0) {
				if(chunk.next) cmds.push('@', 2);
			}
		};

	cmds.push = (function (push) {
		return function (code, type) {
			if (typeof code === 'string') code = [code];
			code = map(code, function (x) {
				return typeof x.code !== 'undefined' ? x : new Cmd(x, type);
			});
			push.apply(this, code);
		};
	})(cmds.push);

	while (!rdr.eof()) {
		chunk = mode === 0 ? rdr.readUntil('@') : rdr.readQuotedUntil('@', '<');
		if (!chunk) break;
		peek = rdr.peek();
		if(peek === '@' && chunk.next === '@') {
			rdr.read();
			cmds.push(chunk.value + peek, 2);
			continue;
		}

		while (true) {
			peek = rdr.peek();

			if (mode === 1 && chunk.next === '<') {
				//the longest tagname is 8 chars, reading 30 out to cover it
				var tag_written = false, tagname = (rdr.text.substr(rdr.position + 1, 30).match(rxTagName) || 0)[0] || '';
				if (tagname) {
					cmds.push(chunk.value, 0);
					while(!rdr.eof()) {
						chunk = rdr.readUntil('@', '>');
						if(chunk.next == '@') {
							cmds.push((tag_written ? '' : '<') + chunk.value, 2);
							tag_written = true;
							parseCodeBlock();
						} else break;
					}
					block = chunk + '';
					if (last(chunk.value) !== '/') {
						var nested_count = 1, nested;
						while(nested_count > 0) {
							nested = rdr.readQuotedUntil(['</'+tagname,'<'+tagname]);
							block += nested;
							if(rdr.eof()) break;
							nested_count += nested.next.substr(1,1) === '/' ? -1 : 1;
						}
						block += rdr.readQuotedUntil('>');
					}
					if(!tag_written) {
						if(tagname === 'text'){
							block = block.substr(5, block.length - 5 - 7);
						} else block = '<' + block;
					} 
					cmds.push(parse(block, level + 1, 0));

				} else {
					var chunk1 = rdr.readQuotedUntil('@', '<', ' ');
					chunk.value += chunk.next + chunk1.value;
					chunk.next = chunk1.next;
					continue;
				}

			} else if (chunk.value) {
				if (mode === 0) 
					{cmds.push(chunk.value, 2);
					}
				else {
					cmds.push(chunk.value);
				}
			}
			break;
		}
		
		parseCodeBlock();
	}


	if (level > 0) return cmds;

	return {
		code: cmds.join('\r\n'),
		sections: sections,
		helpers: helpers
	};
}
 
function compile(code, page, id, basePath) {
	var func, parsed = parse(code);
	
	parsed = (Razor.options.strict ? '"use strict";\r\n' : '') +
		_function_template.replace('@code',
		'// # sourceURL=' + id.replace(new RegExp( "\\\\", "g" ), "/") + '\r\n' + 'var __filename="'+id.replace(new RegExp( "\\\\", "g" ), "/")+'";\r\n' +
			parsed.helpers.join('\r\n') + '\r\n' +
			parsed.sections.join('\r\n') +
			parsed.code 
		);
	// console.log(parsed);

	func = new Function('bind', 'sections', 'undefined', parsed);
	
	return function execute(model, page1, cb) {
		if(!cb && typeof page1 === 'function') {
			return execute(model, null, page1);
		}
		
		var ctx = extend(new Razor.BasePage(), page, page1), sections = {};
		ctx.model = model;
		ctx.html.page = ctx;
		ctx.html.model = model;
	
		var result = func.apply(ctx, [bind, sections]);

		if(ctx.layout) {
			var render_layout = function(layout_view) {
				var layout_result = layout_view(null, {
						renderBody: function(){ return htmlString(result); },
						viewBag: ctx.viewBag,
						isSectionDefined: function(name) {
							return typeof sections[name] === 'function';
						},
						renderSection: function(name, required) {
							if(this.isSectionDefined(name)) {
								var temp = htmlString(sections[name]());
								return temp;
								
							} else if(required) {
								throw 'Section "' + name + '" not found.';
							}
						}
					}, cb);
				if(!cb) return layout_result;
			};
			
			var layout_view = Razor.view(ctx.layout, null, basePath, cb ? render_layout : undefined);
			if(!cb) {
				return render_layout(layout_view);
			}
		
		} else if(!cb) {
			return result;
		} else cb(result);
	};
}

var views = {}, etags = {};
function view(id, page, basePath, cb) {
	if(!cb && typeof basePath === 'function') {
		return view(id, undefined, page, basePath);
	}

	var key = '~/' + id,
		template = views[key],
		etag0 = etags[key],
		etag = Razor.getViewEtag(id, basePath);
	
	if (!template || etag !== etag0 || Razor.options.cacheDisabled) {
		var done = function(script){
				if (script) {
					template = views[key] = Razor.compile(script, page, id, basePath);
					etags[key] = etag;
				}
				if (cb) cb(template);
			};
		
		template = Razor.findView(id, basePath, cb ? done : null);
		if(!cb) done(template);
		
		return template;

	} else if (cb) {
		cb(template);
	} else return template;
}

Razor = {
	utils: {
		extend: extend, bind: bind, Cmd: Cmd,
		htmlString: htmlString, encode: encode,
	},
	options: {
		strict: true, onerror: function(){ }, cacheDisabled: false
	},
	view: view, 
    compile: compile, 
    parse: parse, 
    findView: null,
	BasePage: function(){
		if(!this.viewBag) {
			this.viewBag = {};
		}
		if(!this.html) {
			this.html = new HtmlHelper();
		}
	},
	HtmlHelper: HtmlHelper,
	render: function (id, markup, model, page, basePath, cb) {
		var result;
		compile(markup, null, id, basePath)(model, page, function(html) {
			result = html;
			if(cb) cb(result);
		});
		return result;
	},
	getViewEtag: null,
	views: views, etags: etags
};
var wrapper;

extend(Razor, {
    getViewFile: function (viewName, basePath) {
    if (!basePath)
      return Razor.getViewFile(viewName, process.cwd());
    
    if (!viewName.match(/\w+\.\w+$/i)) {
      viewName += '.js.html';
    }
      viewName = basePath + viewName;

    return viewName;
  },

  findView: function (viewName, basePath, cb) {
  
    var fs = require('fs'), file = Razor.getViewFile(viewName, basePath);
		if(cb){
        cb(fs.readFileSync(file).toString('utf-8'));	
		} else {
			return fs.readFileSync(file).toString('utf-8');
		}
  },
	
	getViewEtag: function(viewName, basePath){ 
  
    var fs = require('fs'), 
			file = Razor.getViewFile(viewName, basePath),
			stat = fs.statSync(file);
		return stat.mtime + '';
	},

  precompile: function(code, page, id, basePath) {
    if(!page) page = {}; 
    code = 'var page1 = ' + JSON.stringify(page) + 
      ', func = function(){ ' + Razor.parse(code) + ' }';
    if(!wrapper) wrapper = Razor.compile('', null, id, basePath);

    code = '(function(){ ' + code + ';\nreturn ' + wrapper + '; })()';
    code = code
      .replace(/(\W)extend(\W)/g, '$1Razor.utils.extend$2')
      .replace(/(\W)basePage(\W)/g, '$1Razor.utils.basePage$2');

    return code;
  }
});

module.Razor = module.exports = Razor; 
})(global, module);

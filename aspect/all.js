define(["mustache"], function(mustache) {

	var api = {};

	var tryCall = function(fun, defaultReturn) {
		var rs;
		try {
			rs = fun();
		} catch(e) {
			console.log(e);
		}
		if(rs === undefined || rs === null) {
			rs = defaultReturn;
		}
		return rs;
	}

	api.tryCall = tryCall;

	/**
	 * 得到属性
	 * @param {Object} obj
	 * @param {Object} attrNames "rs"、"rs.total"等
	 */
	api.getObjectAttr = function(obj, attrNames) {
		var attrs = attrNames.split(".");
		var rs = undefined;
		var i = 0;
		for(; i < attrs.length && obj; i++) {
			var k = attrs[i];
			obj = obj[k];
		}
		if(i == attrs.length) {
			rs = obj;
		}

		return rs;
	}

	api.lsave = function(key, obj) {
		tryCall(function() {
			window.localStorage.setItem(key, xsJson2String(obj));
		});
	};

	api.ldel = function(key) {
		tryCall(function() {
			window.localStorage.removeItem(key);
		});
	};

	api.lget = function(key, defaultValue) {
		return tryCall(function() {
			var v = window.localStorage.getItem(key);
			if(v) {
				v = xsParseJson(v);
			}
			return v;
		}, defaultValue);
	};

	/**
	 * 
	 * @param {Object} handle
	 * @param {Object} option 参数
	 * @param {Object} attrs 属性
	 * @param {Object} exceptAttrFuns 排除添加方法的属性名
	 * @param {Object} varPrefix 私有属性前缀
	 */
	api._optionInvoke = function(handle, option, attrs, exceptAttrFuns, varPrefix) {
		varPrefix = varPrefix === undefined ? api.defaultVarPrefix : varPrefix;
		exceptAttrFuns = exceptAttrFuns === undefined ? [] : exceptAttrFuns;
		exceptAttrFuns = api.array2Object(exceptAttrFuns);

		handle.privateVar = function(name, undefinedValue) {
			var val = handle[varPrefix + name];
			return val === undefined ? undefinedValue : val;
		};

		function regFun(attr) {
			handle[attr] = function(val) {
				handle[varPrefix + attr] = val;
				return this;
			};
		};

		//添加方法
		for(var i = 0; i < attrs.length; i++) {
			var attr = attrs[i];
			if(exceptAttrFuns[attr]) {
				continue;
			}
			regFun(attr);
		}

		if(!option || (typeof option != "object")) {
			return;
		}

		attrs = api.array2Object(attrs);
		for(var attr in option) {
			if(attrs[attr]) {
				handle[attr](option[attr]);
			}
		}
	};

	/**
	 * 把数组转换成对象，键名为元素，如:["tom","hallo"]变成{"tom":true,"hallo":true}
	 * defaultValue为对象的值，默认为true。
	 * @param {Object} array
	 * @param {Object} defaultValue
	 */
	api.array2Object = function(array, defaultValue) {
		if(defaultValue === undefined) {
			defaultValue = true;
		}
		var obj = {};
		if(array) {
			for(var i = 0; i < array.length; i++) {
				obj[array[i]] = defaultValue;
			}
		}
		return obj;
	};

	/**
	 * 模板处理
	 * engine:mustache
	 * path:模板路径,相对于当前js文件。
	 * selector:模板内部的选择器，可选
	 * data:渲染的数据,可选
	 * prependTo:可选
	 * appendTo:可选
	 * beforeTo:可选
	 * afterTo:可选
	 * onOk:function(result),result最终构建的结果,可选
	 * rerender:function(data),重新渲染
	 * done:function()
	 */
	api.tpl = function(option) {
		var handle = {};
		var lastTpl;
		var that = this;
		var index = -1;

		function doPlace(result) {
			function isCalled(name, full) {
				var place = handle.privateVar(name);
				if(place) {
					$(place)[full]($(result));
					return true;
				}
			}

			isCalled("prependTo", "prepend") ||
				isCalled("appendTo", "append") ||
				isCalled("beforeTo", "before") ||
				isCalled("afterTo", "after");
		}

		handle.rerender = function(data, onOk) {
			var selector = handle.privateVar("selector");

			var tpl = lastTpl;
			if(selector) {
				tpl = lastTpl.find(selector);
			}
			var result = mustache.render(tpl.prop('outerHTML'), data);
			index++;
			doPlace(result);
			var okListener = typeof onOk == "function" ? onOk : this.privateVar("onOk");
			if(typeof okListener == "function") {
				okListener.call(this, result, index);
			}
			return result;
		};

		handle.done = function() {
			that._xs_owner_.require(["text!" + this.privateVar("path")], function(tplStr) {
				lastTpl = $(tplStr);
				var data = handle.privateVar("data");
				if(data) {
					handle.rerender(data);
				}
			});
			return this;
		};

		api._optionInvoke(handle, option, ["engine", "path", "selector", "prependTo",
			"appendTo", "beforeTo", "afterTo", "data", "onOk"
		]);

		return handle;
	};

	return api;
});
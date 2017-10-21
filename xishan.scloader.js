/**
 * version:1.0.4.4-2017/10.19
 * **********************************************************************************************************
 * xishan
 * **********************************************************************************************************
 * 1.xishan-sc.json，必须在根目录，其格式为：
 * {
 *   properties:{//可在data内部的所有字符串中引用的变量,引用方式${name},（properties内部也有效，但是confUrl之前无效）
 * //properties内部可用的特殊变量
 * //格式:$<type>
 * //1)$<cphost>:使用当前页面的hostname和端口替换字符串中的hostname和端口
 * //2)$<chost>:使用当前页面的hostname替换字符串中的hostname
 * //3)$<chost-of[host1,host2,...]>:1.当前属性的hostname为of(startsWith)中的一个时才会执行步骤2;2.当页面的hostname为of(startsWith)中的一个时，则为chost,否则为cphost
 * //4)有函数：xsReplaceUrlProp：function(propType, url)
 * //
 *   },
 *  data:{
 * 	  confUrl:"",//本地有效
 * 	  hasGlobal:true,//本地有效。默认为true.是否含有静态资源服务器的全局配置，若有的则会获取，并合并（当前项目目录下的配置属性优先）。
 * 
 *    replaceTitle:Boolean//是否把页面的title替换为配置名称,默认为false。
 ******************************************************************************** 
 * //以下这些属性是默认的
 *    main:"main",//默认为"main"(模块名称，定义的回调函数为主函数),可以为function(模块名称也可以直接跟函数);
 *    beforeMain:function,//执行main前的函数
 *    afterMain:function,//执行main后的函数
 *    onGetRequireConf:function(conf,isDealt,typeName),//取得require的配置文件的回调，conf可能为null，如果函数返回一个对象、则使用返回值作为最终的require配置
 *                                            //isDealt表示是否经过了处理。默认为一个函数，当得到的配置为空时，则返回{paths:{"${main}":"./js/${currentFileNameWithoutSuffix}"}}
 * 											  //typeName表示当前的requireConf类型，为null表示默认.
 ******************************************************************************** 
 * 	  onChooseRequireConf:function(requireConf,moreRequireConfs),//返回一个名称，如果未找到，则使用默认的。
 *    pathPrefix:"",//在载入配置时的路径上添加路径前缀(加到数据库的path上)。
 *    selfData:{},//自定义的数据，在项目下的全局配置与资源服务器的全局配置进行合并时，里面的数据会被合并。
 *    currentRequireConf:{//当前的
 * 			typeName:"",
 * 			main:"main",
 * 			beforeMain:function,
 * 			afterMain:function,
 * 			onGetRequireConf,
 * 			requireConfigData:{},
 * 			requireConf:{}
 * 	  },
 *    requireConf:{//用于require相关的配置,这是默认的
 * 	       stringReplace:[{
 * 	       prefix:"",//配置中所有以它开头的字符串，该开头字符串都会被替换成with的内容
 *         with:"",
 *         host:"",//若不为空，则添加
 *         addPathFirst:false,//是否添加路径的第一个名称，默认为false。path=/FirstPathName/xxxxx,添加/FirstPathName,
 *         exceptPlugin:true//是否不包含插件前缀，默认为true。如css!static/main
 *       }],
 *      baseUrl:"",
 *       xsShim:{//用于添加到require配置文件的shim中,内部的值是数组(多个模块名称)或模块名称或路径，名称可以是"*"。
 * 	
 *      },
 *      xsPaths:{},//处理完xsShim依赖后，合并到paths中
 * 		urlArgs:"",//效果同requirejs
 * 		config:{},
 *      paths:{}//用于添加到require配置的paths中,内部的值是数组（多个路径）或路径,名称表示模块名称
 *    },
 *    moreRequireConfs:{//更多的用于require相关的配置
 * 		"typeName":{
 * 			main:"main",
 * 			beforeMain:function,
 * 			afterMain:function,
 * 			onGetRequireConf,
 * 			requireConf:{}
 * 		}
 * 	  }
 *  }
 * }
 * 2.全局require配置为:currentConf
 * 3.全局的${xishan-sc.json}.data为:xsSC(或scdata),且properties变成其属性。
 * 4.如果提供了window.testConf,则使用该配置而不从服务器获取require配置。
 * 5.对require的完善:(requireConf或指定路径的配置)
 *   1)*表示对xsPaths中的所有模块加上此依赖:*中的模块不能依赖xsPaths中的模块，但可以依赖paths中的模块.
 *   2)path1:path2:path3...表示给指定的模块加上依赖
 *    xsShim:{
 * 	      "*":[...],
 *        "path1:path2:path3":[],
 *        "path4":""
 *    }
 *  3)默认的main入口模块会被添加到xsPaths中
 *   
 * 6.require配置文件的paths中的值加"./"表示相对于当前页面的路径
 * 7.服务器端的配置文件的属性将会覆盖项目根目录的全局配置文件的属性
 * 8.xsSC(或scdata).appendUrlArgs:function(url)
 * 9.window.xsSCLoaderErr=function(e)
 * 10.***在define和require中的回调中或对象的_handle_：（改变了this）
 * 			1)可以使用this.require([deps],function),deps依赖中的地址支持"./"和"../",相对于当前的js文件。
 * 			2)getUrl(relativePath):获取相对于当前js文件的路径
 * 11.会把当前模块的this添加到每一个模块的_xs_owner_属性中
 * 12.requirejs的waitSeconds默认设置成20
 */
var startsWith, endsWith, xsParseJson, xsJson2String, scCurrentConf;
var randId;

/**
 * function(array,ele,compare):得到ele在array中的位置，若array为空或没有找到返回-1；compare(arrayEle,ele)可选函数，默认为==比较.
 */
var indexInArray;

/**
 * function(path,relative,isPathDir):相对于path，获取relative的绝对路径
 */
var getPathWithRelative;

/**
 * function(url,args):args例子"a=1&b=2"
 */
var appendArgs2Url;

/**
 * function(urlQuery,decode):decode表示是否进行decodeURIComponent解码，默认为true。
 * 如:queryString2ParamsMap("?a=1&b=2")返回{a:"1",b:"2"}
 */
var queryString2ParamsMap;

var xsSC, scdata;

//TODO _xishanSCLoad
function _xishanSCLoad() {

	getPathWithRelative = function(path, relative, isPathDir) {
		if(startsWith(relative, "/")) {
			return relative;
		}
		var stack = path.split("/");
		if(!isPathDir && stack.length > 0) {
			stack.pop();
		}

		var relatives = relative.split("/");
		for(var i = 0; i < relatives.length; i++) {
			var str = relatives[i];
			if(".." == str) {
				if(stack.length == 0) {
					throw new Error("no more upper path!");
				}
				stack.pop();
			} else if("." != str) {
				stack.push(str);
			}
		}
		if(stack.length == 0) {
			return "";
		}

		return stack.join("/");
	};

	function _indexInArray(array, ele, compare) {
		var index = -1;
		if(array) {
			for(var i = 0; i < array.length; i++) {
				if(compare) {
					if(compare(array[i], ele)) {
						index = i;
						break;
					}
				} else {
					if(array[i] == ele) {
						index = i;
						break;
					}
				}

			}
		}
		return index;
	}

	indexInArray = _indexInArray;

	function toParamsMap(argsStr, decode) {
		if(decode === undefined) {
			decode = true;
		}
		if(argsStr.length > 0 && argsStr.charAt(0) == "?") {
			argsStr = argsStr.substring(1);
		}
		var ret = {},
			seg = argsStr.split('&'),
			len = seg.length,
			i = 0,
			s;
		for(; i < len; i++) {
			if(!seg[i]) {
				continue;
			}
			s = seg[i].split('=');
			ret[s[0]] = decode ? decodeURIComponent(s[1]) : s[1];
		}
		return ret;
	}

	queryString2ParamsMap = toParamsMap;

	function _replaceUrlArgs(url, urlArgs) {

		function replaceUrlParams(myUrl, newParams) {
			for(var x in newParams) {
				var hasInMyUrlParams = false;
				for(var y in myUrl.params) {
					if(x.toLowerCase() == y.toLowerCase()) {
						myUrl.params[y] = newParams[x];
						hasInMyUrlParams = true;
						break;
					}
				}
				//原来没有的参数则追加
				if(!hasInMyUrlParams) {
					myUrl.params[x] = newParams[x];
				}
			}
			var _result = myUrl.protocol + "://" + myUrl.host + (myUrl.port ? ":" + myUrl.port : "") + myUrl.path + "?";

			for(var p in myUrl.params) {
				_result += (p + "=" + myUrl.params[p] + "&");
			}

			if(_result.substr(_result.length - 1) == "&") {
				_result = _result.substr(0, _result.length - 1);
			}

			if(myUrl.hash != "") {
				_result += "#" + myUrl.hash;
			}
			return _result;
		}

		var index = url.lastIndexOf("?");
		var hashIndex = url.lastIndexOf("#");
		if(hashIndex < 0) {
			hashIndex = url.length;
		}
		var oldParams = index < 0 ? {} : toParamsMap(url.substring(index + 1, hashIndex));
		var newParams = toParamsMap(urlArgs);
		for(var k in newParams) {
			oldParams[k] = newParams[k];
		}

		var path = index < 0 ? url.substring(0, hashIndex) : url.substring(0, index);

		var params = [];

		for(var k in oldParams) {
			params.push(k + "=" + encodeURIComponent(oldParams[k]));
		}
		params = params.join("&");
		var hash = "";
		if(hashIndex >= 0 && hashIndex < url.length) {
			hash = url.substring(hashIndex);
		}

		return path + (params ? "?" + params : "") + (hash ? hash : "");

	};

	appendArgs2Url = _replaceUrlArgs;

	var idCount = 1991;
	//生成一个随机的id，只保证在本页面是唯一的
	randId = function(suffix) {
		var id = Math.random() + "_" + new Date().getTime() + "_id_" + (idCount++);
		if(suffix !== undefined) {
			id += suffix;
		}
		id = "_" + id.substr(2);
		return id;
	};

	startsWith = function(str, starts) {
		if(!(typeof str == "string")) {
			return false;
		}
		return str.indexOf(starts) == 0;
	}

	endsWith = function(str, ends) {
		if(!(typeof str == "string")) {
			return false;
		}
		var index = str.indexOf(ends);
		if(index >= 0 && (str.length - ends.length == index)) {
			return true;
		} else {
			return false;
		}
	}

	function parseJson(str) {
		if(str === "" || str === null || str === undefined) {
			return null;
		}
		try {
			return eval("(" + str + ")");
		} catch(e) {
			try {
				return JSON.parse(str);
			} catch(e) {
				console.log(e);
				return null;
			}
		}
	}

	xsParseJson = parseJson;
	xsJson2String = function(obj) {
		return JSON.stringify(obj);
	};
	/**
	 * 若存在则以/开头。
	 */
	function getFirstPathName() {
		var path = location.pathname;
		var index = path.indexOf('/', 1);
		return index > 0 ? path.substring(0, index) : "";
	}

	//require的配置的paths以"./"开头的，替换成当前路径
	function replaceRequireConfPathsDot(paths) {
		for(var x in paths) {
			var arr = paths[x];
			for(var i = 0; i < arr.length; i++) {
				if(startsWith(arr[i], "./")) {
					var parent = location.pathname;
					if(!endsWith(parent, "/")) {
						var index = parent.lastIndexOf("/");
						if(index >= 0) {
							parent = parent.substring(0, index + 1);
						}
					}
					arr[i] = parent + arr[i].substr(2);
				}
			}
		}
	};

	//处理require配置文件
	function dealRequireConf(confData) {

		//合并paths
		function combinePaths(paths, toPaths) {
			if(!paths) {
				return;
			}
			var _paths = toPaths;
			for(var x in paths) {
				if(_paths[x] === undefined) {
					_paths[x] = paths[x];
				}
			}
		};

		//处理xsShim,
		function dealXsShim(xsShim) {

			var shim = confData.shim;
			var confPaths = confData.paths;
			var xsPaths = confData.xsPaths;

			function addDeps(path, appendDeps) {

				var deps = null;
				if(shim[path]) {
					if(shim[path].deps) {
						deps = shim[path].deps;
					} else if(shim[path] instanceof Array) {
						deps = shim[path];
					}
				}

				if(deps === null) {
					shim[path] = appendDeps;
				} else {
					for(var i = 0; i < appendDeps.length; i++) {
						var dep = appendDeps[i];
						if(deps.indexOf(dep) >= 0) {
							continue;
						}
						deps.push(dep);
					}
				}

			}

			//*中的模块要被所有xsPaths中的模块依赖，而*中的模块不能依赖xsPaths中的模块、但*中的模块可以依赖paths中的
			var starDeps = xsShim["*"] || [];
			delete xsShim["*"];
			var starDepsMap = {};
			for(var i = 0; i < starDeps.length; i++) {
				starDepsMap[starDeps[i]] = true;
			}

			for(var x in xsShim) {

				var appendDeps = xsShim[x];
				var paths = x.split(":");

				for(var i = 0; i < paths.length; i++) {
					var path = paths[i];
					if(starDepsMap[path]) { //*中的模块
						var deps = [];
						for(var k = 0; k < appendDeps.length; k++) {
							var dep = appendDeps[k];
							if(xsPaths[dep]) { //不能依赖xsPaths中的模块
								continue;
							}
							deps.push(dep);
						}
						addDeps(path, deps);
					} else {
						addDeps(path, appendDeps);
					}
				}

			}
			for(var y in xsPaths) {
				//遍历xsPaths中的模块，得到模块y,添加*中的依赖
				if(starDepsMap[y]) {
					continue; //排除*中的模块
				}
				addDeps(y, starDeps);
			}

			//把xsPaths合并到paths中，若paths已经存在则忽略

			for(var x in xsPaths) {
				if(confPaths[x]) {
					continue;
				}
				confPaths[x] = xsPaths[x];
			}

		};

		var requireConf = xsSC.currentRequireConf.requireConf;

		requireConf.xsShim = requireConf.xsShim || {};
		confData.paths = confData.paths || {};
		confData.xsPaths = confData.xsPaths || {};
		confData.shim = confData.shim || {};

		strValue2Arr(confData.paths);
		strValue2Arr(confData.xsPaths);
		strValue2Arr(confData.xsShim);

		strValue2Arr(requireConf.paths);
		strValue2Arr(requireConf.xsPaths);
		strValue2Arr(requireConf.xsShim);

		combinePaths(requireConf.paths, confData.paths);
		combinePaths(requireConf.xsPaths, confData.xsPaths);

		justCombineArray(confData, "xsShim", requireConf);
		dealXsShim(requireConf.xsShim);

		justCombine(confData, "config", requireConf);

		confData.baseUrl = confData.baseUrl !== undefined ? confData.baseUrl : requireConf.baseUrl;
		confData.urlArgs = confData.urlArgs !== undefined ? confData.urlArgs : requireConf.urlArgs;
		var requireConfHandle = requireConf;
		if(requireConfHandle.stringReplace) {
			function checkReplace(stringReplace) {
				stringReplace.addPathFirst = stringReplace.addPathFirst === undefined ? false : stringReplace.addPathFirst;
				stringReplace.exceptPlugin = stringReplace.exceptPlugin === undefined ? true : stringReplace.exceptPlugin;

				var prefixWith = (stringReplace.addPathFirst ? getFirstPathName() : "") + stringReplace["with"];
				var prefix = stringReplace.prefix;

				function replacePrefix(obj) {
					if(!obj) {
						return obj;
					}
					if(obj instanceof Array) {
						for(var i = 0; i < obj.length; i++) {
							obj[i] = replacePrefix(obj[i]);
						}
					} else if(typeof obj == "string") {
						var pluginSIndex = stringReplace.exceptPlugin ? obj.indexOf('!') : -1;
						var str = pluginSIndex > 0 ? obj.substring(pluginSIndex + 1) : obj;
						if(str.indexOf(prefix) == 0) {
							obj = (pluginSIndex > 0 ? obj.substring(0, pluginSIndex + 1) : "") + (stringReplace.host ? stringReplace.host : "") + prefixWith + str.substr(prefix.length);
						}
					} else if(typeof obj == "object") {
						for(var x in obj) {
							obj[x] = replacePrefix(obj[x]);
						}
					}

					return obj;

				}
				confData = replacePrefix(confData);
			}
			var stringReplace = requireConfHandle.stringReplace;
			for(var i = 0; i < stringReplace.length; i++) {
				checkReplace(stringReplace[i]);
			}
		}
		return confData;
	}

	///////////////////////////
	////////替换url的host
	var _replaceProperties$TypeExp = new RegExp("\\$\\<([^\\{]*)\\>");

	window.xsReplaceUrlProp = function(propType, url) {
		var result = url;
		if(!propType) {
			return result;
		}

		function getHostName(url) {
			var rs = /http(s)?:\/\/([^\/]+)/.exec(url);
			var hostname = "";
			if(rs) {
				var rsHost = rs[2];
				if(rsHost.indexOf(":") > 0) {
					hostname = rsHost.substring(0, rsHost.indexOf(":"));
				} else {
					hostname = rsHost;
				}
			}
			return hostname;
		}

		function replaceHost(url, hasPort) {
			var rs = /http(s)?:\/\/([^\/]+)/.exec(url);
			if(rs) {
				var host;
				if(!hasPort) {
					var rsHost = rs[2];
					if(rsHost.indexOf(":") > 0) {
						host = location.hostname + ":" + rsHost.substr(rsHost.indexOf(":") + 1);
					} else {
						host = location.hostname;
					}
				} else {
					host = location.host;
				}
				url = url.substr(0, rs.index) + location.protocol +
					"//" + host + url.substr(rs.index + rs[0].length);
			}
			return url;
		}

		switch(propType) {
			case "cphost":
				result = replaceHost(result, true);
				break;
			case "chost":
				result = replaceHost(result, false);
				break;
			default:
				if(startsWith(propType, "chost-of")) {
					var hosts = propType.substring("chost-of".length + 1, propType.length - 1);
					hosts = hosts.split(",");
					var theHostName = getHostName(result);
					if(_indexInArray(hosts, theHostName, function(arrEle, ele) {
							return startsWith(ele, arrEle);
						}) >= 0) {
						if(_indexInArray(hosts, location.hostname, function(arrEle, ele) {
								return startsWith(ele, arrEle);
							}) >= 0) {
							result = replaceHost(result, false);
						} else {
							result = replaceHost(result, true);
						}
					}

				}
		}
		return result;
	};

	function replaceProperties$TypeExp(string, properties, property) {
		var str = string;
		var result = "";

		var types = [];

		while(true) {
			var rs = _replaceProperties$TypeExp.exec(str);
			if(!rs) {
				result += str;
				break;
			} else {
				var propType = rs[1];
				if(property !== undefined && property.propertyKey == propType) {
					throw new Error("replace $<>property error:propertyType=" + propType);
				} else if(property) {
					property.has = true;
				}
				result += str.substring(0, rs.index);

				switch(propType) {
					case "cphost":
						types.push(propType);
						break;
					case "chost":
						types.push(propType);
						break;
					default:

						if(startsWith(propType, "chost-of")) {
							types.push(propType);
						} else {
							throw "unknown:$<" + propType + ">";
						}
				}

				str = str.substr(rs.index + rs[0].length);
			}
		}

		for(var i = 0; i < types.length; i++) {
			var propType = types[i];
			result = xsReplaceUrlProp(propType, result);
		}

		return result;
	}
	////////替换url的host
	///////////////////////////

	var _replaceStringPropertiesExp = new RegExp("\\$\\{([^\\{]*)\\}");

	function replaceStringProperties(string, properties, property) {
		var str = string;
		var result = "";
		while(true) {
			var rs = _replaceStringPropertiesExp.exec(str);
			if(!rs) {
				result += str;
				break;
			} else {
				var propKey = rs[1];
				if(property !== undefined && property.propertyKey == propKey) {
					throw new Error("replace property error:propertyKey=" + propKey);
				} else if(property) {
					property.has = true;
				}
				result += str.substr(0, rs.index);
				result += properties[propKey];
				str = str.substr(rs.index + rs[0].length);
			}
		}
		return result;
	}

	function httpRequest(option) {

		if(!option) {
			option = {};
		}

		function prop(obj, varName, defaultVal) {
			if(obj[varName] === undefined) {
				return defaultVal;
			} else {
				return obj[varName];
			}
		}

		function putProp(obj, varName, toObj) {
			if(obj[varName]) {
				for(var x in obj[varName]) {
					var value = obj[varName][x];
					if(value === null || value === undefined) {
						continue;
					}
					toObj[x] = value;
				}
			}
		}

		var _url = prop(option, "url", ""),
			_method = prop(option, "method", "GET"),
			_params = {},
			_headers = {},
			_async = prop(option, "async", true),
			_multiPart = prop(option, "multiPart", false),
			_handleType = prop(option, "handleType", "json");
		_timeout = undefined;
		putProp(option, "params", _params);
		putProp(option, "headers", _headers);

		var okCallback = option.ok;
		var failCallback = option.fail;
		var uploadStartCallback = option.uploadStart;
		var uploadProgressCallback = option.uploadProgress;
		var uploadEndCallback = option.uploadEnd;

		var _beforeOpenHook = httpRequest._beforeOpenHook;
		var _onOkResponseHook = httpRequest._onOkResponseHook;
		var _onFailResponseHook = httpRequest._onFailResponseHook;

		function conn() {
			require(["text"], function(text) {
				var xhr = text.createXhr();
				_conn(xhr);
			});
		}

		function _conn(xhr) {
			var option = {
				url: _url,
				method: _method.toUpperCase(),
				params: _params,
				headers: _headers,
				handleType: _handleType,
				async: _async,
				multiPart: _multiPart,
				timeout: _timeout
			};
			_beforeOpenHook(option, function() {
				_connAfterOpenHook(option, xhr);
			});
		};

		function _doOnFailResponseHook(option, xhr, err, extraErr) {
			_onFailResponseHook(option, xhr, function(result) {
				if(result !== false && result !== undefined) {
					if(typeof okCallback == "function") {
						okCallback(result, xhr);
					}
					return;
				} else if(typeof failCallback == "function") {
					failCallback(err);
				} else {
					console.log(err);
				}
			}, extraErr);
		};

		function _connAfterOpenHook(option, xhr) {
			var body;
			if(option.multiPart) {
				var formData = new FormData();
				for(var x in option.params) {
					var value = option.params[x];
					if(value && value instanceof Array) {
						formData.append(x, xsJson2String(value));
					} else {
						formData.append(x, value);
					}

				}
				body = formData;
			} else {
				body = "";
				for(var x in option.params) {
					var value = option.params[x];
					if(value === null || value === undefined) {
						continue;
					}
					if(typeof value == "object") {
						value = xsJson2String(value);
					}
					body += "&" + encodeURIComponent(x) + "=" + encodeURIComponent(value);
				}
				if(!(option.method == "POST" || option.method == "PUT")) {
					if(option.url.lastIndexOf("?") < 0 && body.length > 0) {
						option.url += "?";
					}
					option.url += body;
					body = null;
				}
			}

			xhr.open(option.method, option.url, option.async);
			if((option.method == "POST" || option.method == "PUT") && !option.multiPart && !option.headers.hasOwnProperty("Content-Type")) {

				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');
			}
			for(var header in option.headers) {
				xhr.setRequestHeader(header, option.headers[header]);
			}

			if(typeof uploadStartCallback == "function") {
				xhr.upload.onloadstart = uploadStartCallback;
			}

			if(typeof uploadProgressCallback == "function") {
				xhr.upload.onprogress = uploadProgressCallback;
			}
			if(typeof uploadEndCallback == "function") {
				xhr.upload.onloadend = uploadEndCallback;
			}

			var timeoutTimer;
			var isTimeout = false;
			if(option.timeout) {
				timeoutTimer = setTimeout(function() {
					isTimeout = true;
					xhr.abort();
					clearTimeout(timeoutTimer);
				}, option.timeout);
			}

			xhr.onreadystatechange = function(evt) {
				var status, err;
				if(xhr.readyState === 4) {
					status = xhr.status || 0;
					if(status > 399 && status < 600 || !status) {
						var err = new Error(option.url + ' HTTP status: ' + status);
						err.xhr = xhr;
						_doOnFailResponseHook(option, xhr, err);
					} else {
						var result;
						if(option.handleType === "json") {
							try {
								result = parseJson(xhr.responseText);
							} catch(e) {
								_doOnFailResponseHook(option, xhr, new Error("parse-json-error:" + e), "parse-json-error");
								return;
							}
						} else if(option.handleType === "text") {
							result = xhr.responseText;
						}
						_onOkResponseHook(result, option, xhr, function(result) {
							if(typeof okCallback == "function") {
								okCallback(result, xhr);
							}
						});
					}

				} else {
					if(timeoutTimer && isTimeout) {
						var err = new Error(option.url + ' timeout status: ' + status);
						err.xhr = xhr;
						_doOnFailResponseHook(option, xhr, err);
					}
				}
			};
			xhr.send(body);

		};

		var requestObj = {
			multiPart: function(multiPart) {
				_multiPart = multiPart;
				return this;
			},
			uploadStart: function(uploadStart) {
				uploadStartCallback = uploadStart;
				return this;
			},
			uploadStart: function(uploadProgress) {
				uploadProgressCallback = uploadProgress;
				return this;
			},
			uploadEnd: function(uploadEnd) {
				uploadEndCallback = uploadEnd;
				return this;
			},
			url: function(urlStr) {
				_url = urlStr;
				return this;
			},
			method: function(methodStr) {
				_method = methodStr;
				return this;
			},
			timeout: function(timeout) {
				_timeout = timeout;
				return this;
			},
			async: function(isAsync) {
				_async = isAsync;
				return this;
			},
			params: function(paramsObj) {
				if(paramsObj) {
					for(var x in paramsObj) {
						var value = paramsObj[x];
						if(value === null || value === undefined) {
							continue;
						}
						_params[x] = value;
					}
				}
				return this;
			},
			headers: function(headersObj) {
				if(headersObj) {
					for(var x in headersObj) {
						_headers[x] = headersObj[x];
					}
				}
				return this;
			},
			handleType: function(_handleType) {
				return this.handleAs(_handleType);
			},
			handleAs: function(handleType) {
				if(handleType !== "json" && handleType !== "text") {
					throw "unknown handleType:" + handleType;
				}
				_handleType = handleType;
				return this;
			},
			ok: function(callback) {
				okCallback = callback;
				return this;
			},
			fail: function(callback) {
				failCallback = callback;
				return this;
			},
			done: function() {
				try {
					conn();
				} catch(e) {
					if(typeof failCallback == "function") {
						failCallback(e);
					} else {
						console.log(e);
					}
				}
			}
		};
		return requestObj;
	};
	/**
	 */
	httpRequest._beforeOpenHook = function(option, callback) {
		callback();
	};

	/**
	 * function(result,option,xhr,callback),callback(result)的result为最终的结果
	 */
	httpRequest._onOkResponseHook = function(result, option, xhr, callback) {
		callback(result);
	};
	/**
	 * function(option,xhr,callback,extraErrorType),callback(result)的result为false则不会处理后面的,如果为非undefined则作为成功的结果。
	 * extraErrorType=="parse-json-error"表示转换成json时出错
	 */
	httpRequest._onFailResponseHook = function(option, xhr, callback) {
		callback(undefined);
	};

	define("xshttp", [], function() {
		return httpRequest;
	});

	function doReplaceProperties$Type(properties) {

		if(!properties) {
			return;
		}

		//处理属性中的$<type>
		function replaceProperties$Type(obj, property) {
			for(var prop in obj) {
				obj[prop] = replaceProperties$TypeExp(obj[prop], obj, property);
			}
		}

		var property = {
			has: false
		};
		do {
			property.has = false;
			replaceProperties$Type(properties, property);
		} while (property.has);

	}

	/*
	 * 读取requirejs配置
	 */
	function loadRequireJsConf(scJson) {

		//提供默认的配置。
		scJson.data.onGetRequireConf = scJson.data.onGetRequireConf || function(conf, isDealt, typeName) {
			if(conf && conf.xsPaths && conf.xsPaths[xsSC.main]) {
				return;
			}
			if(!conf) {
				conf = {
					xsPaths: {}
				};
			} else if(!conf.xsPaths) {
				conf.xsPaths = {};
			}

			var index = location.pathname.lastIndexOf("/");
			var name = index >= 0 ? location.pathname.substr(index + 1) : "index.";
			index = name.lastIndexOf(".");
			name = index >= 0 ? name.substr(0, index) : name;
			if(name.length == 0) {
				name = "index";
			}
			conf.xsPaths[xsSC.main] = "./js/" + name;
			return conf;
		};

		function combineCurrentRequireConf(globalConf) {
			//合并moreRequireConfs与默认的，moreRequireConfs里的优先。
			var moreRequireConfs = globalConf.data.moreRequireConfs;
			requireConfStrValue2Arrs(globalConf.data.requireConf);
			for(var x in moreRequireConfs) {
				var rconf = moreRequireConfs[x];
				combineOnly(globalConf.data, rconf, ["main", "beforeMain", "afterMain", "onGetRequireConf"], true);
				rconf.requireConf = rconf.requireConf || {};
				requireConfStrValue2Arrs(rconf.requireConf);
				combineRequireConf(globalConf.data.requireConf, rconf.requireConf, true);
			}

			globalConf.data.currentRequireConf = globalConf.data.currentRequireConf || {};
			combineOnly(globalConf.data, globalConf.data.currentRequireConf, ["main", "beforeMain", "afterMain", "onGetRequireConf", "requireConf"], true);
		};
		combineCurrentRequireConf(scJson);
		xsSC = (function() {
			var data = scJson.data;
			var scTypeName = "";
			if(typeof data.onChooseRequireConf == "function") {
				scTypeName = data.onChooseRequireConf(data.requireConf, data.moreRequireConfs);
			}

			if(data.moreRequireConfs && data.moreRequireConfs[scTypeName]) {
				data.currentRequireConf = data.moreRequireConfs[scTypeName];
			} else {
				scTypeName = "";
			}
			var currentRequireConf = data.currentRequireConf;
			currentRequireConf.typeName = scTypeName;

			data.pathPrefix = typeof data.pathPrefix == "undefined" ? "" : data.pathPrefix;
			var properties = scJson.properties;
			if(!properties) {
				return data;
			}

			//处理属性引用
			function replaceProperties(obj, property) {
				if(!obj) {
					return obj;
				}
				if(obj instanceof Array) {
					for(var i = 0; i < obj.length; i++) {
						obj[i] = replaceProperties(obj[i], property);
					}
				} else if(typeof obj == "string") {
					obj = replaceStringProperties(obj, properties, property);
				} else if(typeof obj == "object") {
					if(property) {
						property.has = false;
					}
					for(var x in obj) {
						if(property) {
							if(typeof obj[x] !== "string") {
								throw new Error("property " + x + " only can be string!");
							}
							property.propertyKey = x;
						}
						obj[x] = replaceProperties(obj[x], property);
					}
				}

				return obj;

			}

			var property = {
				has: false
			};
			do {
				replaceProperties(properties, property);
			} while (property.has);

			return replaceProperties(data);
		})();
		xsSC.properties = scJson.properties;

		xsSC.appendUrlArgs = function(url) {
			var requireConf = xsSC.currentRequireConf.requireConf;

			var urlArgs = requireConf ? requireConf.urlArgs : null;
			var theUrl = null;
			if(theUrl !== null && theUrl !== undefined) {
				url = theUrl;
			} else if(urlArgs) {
				url = _replaceUrlArgs(url, urlArgs);
			}
			return url;
		};

		function doRequireJsConf(confData) {

			var currentRequireConf = xsSC.currentRequireConf;

			if(typeof currentRequireConf.onGetRequireConf == "function") {
				var rcTypeName = currentRequireConf.typeName;
				var _confData = currentRequireConf.onGetRequireConf(confData, false, rcTypeName);
				if(_confData !== undefined) {
					confData = _confData;
				}
			}
			confData = dealRequireConf(confData);
			replaceRequireConfPathsDot(confData.paths);
			if(typeof currentRequireConf.onGetRequireConf == "function") {
				var _confData = currentRequireConf.onGetRequireConf(confData, true);
				if(_confData !== undefined) {
					confData = _confData;
				}
			}

			scCurrentConf = confData;
			currentRequireConf.requireConfigData = confData;
			if(typeof currentRequireConf.beforeMain == "function") {
				currentRequireConf.beforeMain();
			}

			currentRequireConf.main = currentRequireConf.main || "main";
			if(typeof currentRequireConf.main == "function" || (typeof confData.paths[currentRequireConf.main] == "function")) {
				var mainNameForFunction = typeof currentRequireConf.main == "function" ? randId() : currentRequireConf.main;
				var mainFun = typeof currentRequireConf.main == "function" ? currentRequireConf.main : confData.paths[currentRequireConf.main];

				var deps = confData.shim[mainNameForFunction];

				define(mainNameForFunction, deps ? deps : [], function() {
					mainFun();
				});
				delete confData.paths[mainNameForFunction];
				currentRequireConf.main = mainNameForFunction;
			}

			var triggerId = randId();
			var triggerPath = getPathWithRelative(confData.paths[currentRequireConf.main][0], "./" + triggerId + ".js");
			require.config(confData);

			var deps = [currentRequireConf.main];
			deps._optionalUrl = triggerPath;

			require(deps, function() {
				if(typeof currentRequireConf.afterMain == "function") {
					currentRequireConf.afterMain();
				}
			});

		}
		scdata = xsSC;
		if((typeof testConf != "undefined") && testConf) {
			doRequireJsConf(testConf);
			return;
		}
		//载入配置
		if(xsSC.confUrl) {
			httpRequest().url(xsSC.confUrl + "Conf/loadConf") //+ "?path=" + encodeURI(location.pathname) + "&hp=" + encodeURI(location.protocol + "//" + location.host)
				.timeout(20000)
				.method("POST").params({
					pathPrefix: xsSC.pathPrefix
				}).ok(function(json) {
					if(json && json.code == 0) {
						var conf = json.rs;
						if(conf == null) {
							doRequireJsConf(null);
						} else {
							doRequireJsConf(parseJson(conf.data));
							if(xsSC.replaceTitle) {
								document.title = conf.name;
							}
						}
					} else {
						console.log("loadRequireJsConf failed:" + JSON.stringify(json));
						doRequireJsConf(null);
					}
				}).fail(function(err) {
					console.log(err);
				}).done();
		} else {
			doRequireJsConf(null);
		}

	};
	/////////////////////////////////
	//载入用户全局配置
	var url1 = '/xishan.sc.json';
	var url2 = (function() {
		return getFirstPathName() + url1;
	})();
	var scConfUrls = [];
	var scConfUrlsIndex = 0;
	scConfUrls.push(url2);
	scConfUrls.push(url1);

	//使得内部的字符串变成数组
	function strValue2Arr(obj) {
		if(!obj || (obj instanceof Array)) {
			return;
		}
		for(var x in obj) {
			if(typeof obj[x] == "string") {
				obj[x] = [obj[x]];
			}
		}
	}

	/**
	 * 载入项目根目录的全局配置
	 */
	function loadSelfGlobalConf() {
		httpRequest().url(scConfUrls[scConfUrlsIndex++])
			.timeout(20000)
			.method("GET").ok(function(scConf) {
				scConf.data.hasGlobal = scConf.data.hasGlobal === undefined ? true : scConf.data.hasGlobal;
				doReplaceProperties$Type(scConf.properties);
				scConf.data.confUrl = replaceStringProperties(scConf.data.confUrl, scConf.properties);
				loadGlobalConf(scConf);
			}).fail(function(err) {
				console.log(err);
				if(scConfUrlsIndex < scConfUrls.length) {
					loadSelfGlobalConf();
				}
			}).done();
	};
	loadSelfGlobalConf(); //TODO *****************入口************************

	//合并对象，onlyArray为需要合并的成员
	function combineOnly(fromSelf, current, onlyArray, isCurrentFirst) {
		if(!fromSelf || !current) {
			return;
		}
		var onlyMap = {};
		for(var i = 0; i < onlyArray.length; i++) {
			onlyMap[onlyArray[i]] = true;
		}
		for(var x in fromSelf) {
			if(!onlyMap[x] || isCurrentFirst && current[x]) {
				continue;
			}
			current[x] = fromSelf[x];
		}
	}

	function requireConfStrValue2Arrs() {
		for(var i = 0; i < arguments.length; i++) {
			var obj = arguments[i];
			strValue2Arr(obj.xsShim);
			strValue2Arr(obj.paths);
		}
	}

	//合并对象，varName为对象名称
	function justCombine(fromSelf, varName, current) {
		if(!fromSelf) {
			return;
		}
		if(fromSelf[varName] === undefined) {
			fromSelf[varName] = {};
		}
		fromSelf = fromSelf[varName];
		current[varName] = current[varName] || {};
		current = current[varName];
		for(var x in fromSelf) {
			current[x] = fromSelf[x];
		}
	}
	//合并对象（除了except中的成员），varName为对象名称
	function combineExcept(fromSelf, varName, current, except) {
		if(!fromSelf) {
			return;
		}
		if(fromSelf[varName] === undefined) {
			fromSelf[varName] = {};
		}
		fromSelf = fromSelf[varName];
		current[varName] = current[varName] || {};
		current = current[varName];
		var exceptMap = {};
		for(var i = 0; i < except.length; i++) {
			exceptMap[except[i]] = true;
		}
		for(var x in fromSelf) {
			if(exceptMap[x]) {
				continue;
			}
			current[x] = fromSelf[x];
		}
	}

	//合并内部数组到current。
	function justCombineInnerArray(fromSelf, varName, current) {
		if(!fromSelf) {
			return;
		}
		fromSelf = fromSelf[varName];
		current = current[varName];
		for(var x in fromSelf) {
			justCombineArray(fromSelf, x, current);
		}
	}

	//合并数组到current，varName为数组变量名
	function justCombineArray(fromSelf, varName, current) {
		if(!fromSelf) {
			return;
		}
		if(fromSelf[varName] === undefined) {
			fromSelf[varName] = [];
		}
		fromSelf = fromSelf[varName];
		current[varName] = current[varName] || [];
		current = current[varName];
		for(var i = 0; i < fromSelf.length; i++) {
			current.push(fromSelf[i]);
		}
	}

	/**
	 * selft中的属性添加到current中
	 * @param {Object} _selft
	 * @param {Object} current
	 */
	function combineRequireConf(_selft, current, isCurrentFirst) {
		if(!_selft) {
			return;
		}
		justCombineArray(_selft, "stringReplace", current);
		justCombineInnerArray(_selft, "xsShim", current);
		justCombineInnerArray(_selft, "paths", current);
		justCombineInnerArray(_selft, "config", current);
		combineOnly(_selft, current, ["baseUrl", "urlArgs"], isCurrentFirst);
	}

	//合并配置到current,self的会覆盖current的，并返回合并后的结果
	function combineGlobalConf(self, current) {
		if(!self) {
			return;
		}
		self.properties = self.properties || {};
		self.data = self.data || {};
		self.data.requireConf = self.data.requireConf || {};
		self.data.moreRequireConfs = self.data.moreRequireConfs || {};

		current.properties = current.properties || {};
		current.data = current.data || {};
		current.data.requireConf = current.data.requireConf || {};
		current.data.moreRequireConfs = current.data.moreRequireConfs || {};

		requireConfStrValue2Arrs(self.data.requireConf, current.data.requireConf);

		justCombine(self, "properties", current);
		////////
		combineExcept(self, "data", current, ["requireConf", "selfData", "moreRequireConfs"]);
		////////

		combineRequireConf(self.data.requireConf, current.data.requireConf, false);

		justCombine(self.data, "moreRequireConfs", current.data);
		justCombine(self.data, "selfData", current.data);
		///////

		return current;
	};

	//载入服务器端的全局配置
	function loadGlobalConf(selfGlobalConf) {

		if(!selfGlobalConf.data.hasGlobal) {
			loadRequireJsConf(selfGlobalConf);
			return;
		}
		httpRequest().url(selfGlobalConf.data.confUrl + "Conf/loadGlobalConf")
			.timeout(20000)
			.method("POST").ok(function(json) {
				if(json && json.code == 0) {
					if(json.rs) {
						var globalConf = parseJson(json.rs);
						doReplaceProperties$Type(globalConf.properties);
						selfGlobalConf = combineGlobalConf(globalConf, selfGlobalConf);
					}
				} else {
					console.log(json);
				}
				loadRequireJsConf(selfGlobalConf);
			}).fail(function(err) {
				console.log(err);
				loadRequireJsConf(selfGlobalConf);
			}).done();
	};

};

//TODO requirejs
////////////////////////////////////////////////////
/**
 * **********************************************************************************************************
 * requirejs
 * **********************************************************************************************************
 */

/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.3.2 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, https://github.com/requirejs/requirejs/blob/master/LICENSE
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function(global, setTimeout) {
	var req, s, head, baseElement, dataMain, src,
		interactiveScript, currentlyAddingScript, mainScript, subPath,
		version = '2.3.2',
		commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
		cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
		jsSuffixRegExp = /\.js$/,
		currDirRegExp = /^\.\//,
		op = Object.prototype,
		ostring = op.toString,
		hasOwn = op.hasOwnProperty,
		isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
		isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
		//PS3 indicates loaded and complete, but need to wait for complete
		//specifically. Sequence is 'loading', 'loaded', execution,
		// then 'complete'. The UA check is unfortunate, but not sure how
		//to feature test w/o causing perf issues.
		readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
		/^complete$/ : /^(complete|loaded)$/,
		defContextName = '_',
		//Oh the tragedy, detecting opera. See the usage of isOpera for reason.
		isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
		contexts = {},
		cfg = {},
		globalDefQueue = [],
		useInteractive = false;

	//Could match something like ')//comment', do not lose the prefix to comment.
	function commentReplace(match, singlePrefix) {
		return singlePrefix || '';
	}

	function isFunction(it) {
		return ostring.call(it) === '[object Function]';
	}

	function isArray(it) {
		return ostring.call(it) === '[object Array]';
	}

	/**
	 * Helper function for iterating over an array. If the func returns
	 * a true value, it will break out of the loop.
	 */
	function each(ary, func) {
		if(ary) {
			var i;
			for(i = 0; i < ary.length; i += 1) {
				if(ary[i] && func(ary[i], i, ary)) {
					break;
				}
			}
		}
	}

	/**
	 * Helper function for iterating over an array backwards. If the func
	 * returns a true value, it will break out of the loop.
	 */
	function eachReverse(ary, func) {
		if(ary) {
			var i;
			for(i = ary.length - 1; i > -1; i -= 1) {
				if(ary[i] && func(ary[i], i, ary)) {
					break;
				}
			}
		}
	}

	function hasProp(obj, prop) {
		return hasOwn.call(obj, prop);
	}

	function getOwn(obj, prop) {
		return hasProp(obj, prop) && obj[prop];
	}

	/**
	 * Cycles over properties in an object and calls a function for each
	 * property value. If the function returns a truthy value, then the
	 * iteration is stopped.
	 */
	function eachProp(obj, func) {
		var prop;
		for(prop in obj) {
			if(hasProp(obj, prop)) {
				if(func(obj[prop], prop)) {
					break;
				}
			}
		}
	}

	/**
	 * Simple function to mix in properties from source into target,
	 * but only if target does not already have a property of the same name.
	 */
	function mixin(target, source, force, deepStringMixin) {
		if(source) {
			eachProp(source, function(value, prop) {
				if(force || !hasProp(target, prop)) {
					if(deepStringMixin && typeof value === 'object' && value &&
						!isArray(value) && !isFunction(value) &&
						!(value instanceof RegExp)) {

						if(!target[prop]) {
							target[prop] = {};
						}
						mixin(target[prop], value, force, deepStringMixin);
					} else {
						target[prop] = value;
					}
				}
			});
		}
		return target;
	}

	//Similar to Function.prototype.bind, but the 'this' object is specified
	//first, since it is easier to read/figure out what 'this' will be.
	function bind(obj, fn) {
		return function() {
			return fn.apply(obj, arguments);
		};
	}

	function scripts() {
		return document.getElementsByTagName('script');
	}

	function defaultOnError(err) {
		throw err;
	}

	//Allow getting a global that is expressed in
	//dot notation, like 'a.b.c'.
	function getGlobal(value) {
		if(!value) {
			return value;
		}
		var g = global;
		each(value.split('.'), function(part) {
			g = g[part];
		});
		return g;
	}

	/**
	 * Constructs an error with a pointer to an URL with more information.
	 * @param {String} id the error ID that maps to an ID on a web page.
	 * @param {String} message human readable error.
	 * @param {Error} [err] the original error, if there is one.
	 *
	 * @returns {Error}
	 */
	function makeError(id, msg, err, requireModules) {
		var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
		e.requireType = id;
		e.requireModules = requireModules;
		if(err) {
			e.originalError = err;
		}
		return e;
	}

	if(typeof define !== 'undefined') {
		//If a define is already in play via another AMD loader,
		//do not overwrite.
		return;
	}

	if(typeof requirejs !== 'undefined') {
		if(isFunction(requirejs)) {
			//Do not overwrite an existing requirejs instance.
			return;
		}
		cfg = requirejs;
		requirejs = undefined;
	}

	//Allow for a require config object
	if(typeof require !== 'undefined' && !isFunction(require)) {
		//assume it is a config object.
		cfg = require;
		require = undefined;
	}

	function newContext(contextName) {
		var inCheckLoaded, Module, context, handlers,
			checkLoadedTimeoutId,
			config = {
				//Defaults. Do not set a default for map
				//config to speed up normalize(), which
				//will run faster if there is no default.
				waitSeconds: 20,
				baseUrl: './',
				paths: {},
				bundles: {},
				pkgs: {},
				shim: {},
				config: {}
			},
			registry = {},
			//registry of just enabled modules, to speed
			//cycle breaking code when lots of modules
			//are registered, but not activated.
			enabledRegistry = {},
			undefEvents = {},
			defQueue = [],
			defined = {},
			urlFetched = {},
			bundlesMap = {},
			requireCounter = 1,
			unnormalizedCounter = 1;

		/**
		 * Trims the . and .. from an array of path segments.
		 * It will keep a leading path segment if a .. will become
		 * the first path segment, to help with module name lookups,
		 * which act like paths, but can be remapped. But the end result,
		 * all paths that use this function should look normalized.
		 * NOTE: this method MODIFIES the input array.
		 * @param {Array} ary the array of path segments.
		 */
		function trimDots(ary) {
			var i, part;
			for(i = 0; i < ary.length; i++) {
				part = ary[i];
				if(part === '.') {
					ary.splice(i, 1);
					i -= 1;
				} else if(part === '..') {
					// If at the start, or previous value is still ..,
					// keep them so that when converted to a path it may
					// still work when converted to a path, even though
					// as an ID it is less than ideal. In larger point
					// releases, may be better to just kick out an error.
					if(i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
						continue;
					} else if(i > 0) {
						ary.splice(i - 1, 2);
						i -= 2;
					}
				}
			}
		}

		/**
		 * Given a relative module name, like ./something, normalize it to
		 * a real name that can be mapped to a path.
		 * @param {String} name the relative name
		 * @param {String} baseName a real name that the name arg is relative
		 * to.
		 * @param {Boolean} applyMap apply the map config to the value. Should
		 * only be done if this normalization is for a dependency ID.
		 * @returns {String} normalized name
		 */
		function normalize(name, baseName, applyMap) {
			var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
				foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
				baseParts = (baseName && req.toUrl(baseName, false).split('/')),
				map = config.map,
				starMap = map && map['*'];

			//Adjust any relative paths.
			if(name) {
				name = name.split('/');
				lastIndex = name.length - 1;

				// If wanting node ID compatibility, strip .js from end
				// of IDs. Have to do this here, and not in nameToUrl
				// because node allows either .js or non .js to map
				// to same file.
				if(config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
					name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
				}

				// Starts with a '.' so need the baseName
				if(name[0].charAt(0) === '.' && baseParts) {
					//Convert baseName to array, and lop off the last part,
					//so that . matches that 'directory' and not name of the baseName's
					//module. For instance, baseName of 'one/two/three', maps to
					//'one/two/three.js', but we want the directory, 'one/two' for
					//this normalization.
					normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
					name = normalizedBaseParts.concat(name);
				}

				trimDots(name);
				name = name.join('/');
			}

			//Apply map config if available.
			if(applyMap && map && (baseParts || starMap)) {
				nameParts = name.split('/');

				outerLoop: for(i = nameParts.length; i > 0; i -= 1) {
					nameSegment = nameParts.slice(0, i).join('/');

					if(baseParts) {
						//Find the longest baseName segment match in the config.
						//So, do joins on the biggest to smallest lengths of baseParts.
						for(j = baseParts.length; j > 0; j -= 1) {
							mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

							//baseName segment has config, find if it has one for
							//this name.
							if(mapValue) {
								mapValue = getOwn(mapValue, nameSegment);
								if(mapValue) {
									//Match, update name to the new value.
									foundMap = mapValue;
									foundI = i;
									break outerLoop;
								}
							}
						}
					}

					//Check for a star map match, but just hold on to it,
					//if there is a shorter segment match later in a matching
					//config, then favor over this star map.
					if(!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
						foundStarMap = getOwn(starMap, nameSegment);
						starI = i;
					}
				}

				if(!foundMap && foundStarMap) {
					foundMap = foundStarMap;
					foundI = starI;
				}

				if(foundMap) {
					nameParts.splice(0, foundI, foundMap);
					name = nameParts.join('/');
				}
			}

			// If the name points to a package's name, use
			// the package main instead.
			pkgMain = getOwn(config.pkgs, name);

			return pkgMain ? pkgMain : name;
		}

		function removeScript(name) {
			if(isBrowser) {
				each(scripts(), function(scriptNode) {
					if(scriptNode.getAttribute('data-requiremodule') === name &&
						scriptNode.getAttribute('data-requirecontext') === context.contextName) {
						scriptNode.parentNode.removeChild(scriptNode);
						return true;
					}
				});
			}
		}

		function hasPathFallback(id) {
			var pathConfig = getOwn(config.paths, id);
			if(pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
				//Pop off the first array value, since it failed, and
				//retry
				pathConfig.shift();
				context.require.undef(id);

				//Custom require that does not do map translation, since
				//ID is "absolute", already mapped/resolved.
				context.makeRequire(null, {
					skipMap: true
				})([id]);

				return true;
			}
		}

		//Turns a plugin!resource to [plugin, resource]
		//with the plugin being undefined if the name
		//did not have a plugin prefix.
		function splitPrefix(name) {
			var prefix,
				index = name ? name.indexOf('!') : -1;
			if(index > -1) {
				prefix = name.substring(0, index);
				name = name.substring(index + 1, name.length);
			}
			return [prefix, name];
		}

		/**
		 * Creates a module mapping that includes plugin prefix, module
		 * name, and path. If parentModuleMap is provided it will
		 * also normalize the name via require.normalize()
		 *
		 * @param {String} name the module name
		 * @param {String} [parentModuleMap] parent module map
		 * for the module name, used to resolve relative names.
		 * @param {Boolean} isNormalized: is the ID already normalized.
		 * This is true if this call is done for a define() module ID.
		 * @param {Boolean} applyMap: apply the map config to the ID.
		 * Should only be true if this map is for a dependency.
		 *
		 * @returns {Object}
		 */
		function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
			var url, pluginModule, suffix, nameParts,
				prefix = null,
				parentName = parentModuleMap ? parentModuleMap.name : null,
				originalName = name,
				isDefine = true,
				normalizedName = '';

			//If no name, then it means it is a require call, generate an
			//internal name.
			if(!name) {
				isDefine = false;
				name = '_@r' + (requireCounter += 1);
			}

			nameParts = splitPrefix(name);
			prefix = nameParts[0];
			name = nameParts[1];

			if(prefix) {
				prefix = normalize(prefix, parentName, applyMap);
				pluginModule = getOwn(defined, prefix);
			}

			//Account for relative paths if there is a base name.
			if(name) {
				if(prefix) {
					if(pluginModule && pluginModule.normalize) {
						//Plugin is loaded, use its normalize method.
						normalizedName = pluginModule.normalize(name, function(name) {
							return normalize(name, parentName, applyMap);
						});
					} else {
						// If nested plugin references, then do not try to
						// normalize, as it will not normalize correctly. This
						// places a restriction on resourceIds, and the longer
						// term solution is not to normalize until plugins are
						// loaded and all normalizations to allow for async
						// loading of a loader plugin. But for now, fixes the
						// common uses. Details in #1131
						normalizedName = name.indexOf('!') === -1 ?
							normalize(name, parentName, applyMap) :
							name;
					}
				} else {
					//A regular module.
					normalizedName = normalize(name, parentName, applyMap);

					//Normalized name may be a plugin ID due to map config
					//application in normalize. The map config values must
					//already be normalized, so do not need to redo that part.
					nameParts = splitPrefix(normalizedName);
					prefix = nameParts[0];
					normalizedName = nameParts[1];
					isNormalized = true;

					url = context.nameToUrl(normalizedName, ".js"); //TODO 加入了".js"
				}
			}

			//If the id is a plugin id that cannot be determined if it needs
			//normalization, stamp it with a unique ID so two matching relative
			//ids that may conflict can be separate.
			suffix = prefix && !pluginModule && !isNormalized ?
				'_unnormalized' + (unnormalizedCounter += 1) :
				'';

			return {
				prefix: prefix,
				name: normalizedName,
				parentMap: parentModuleMap,
				unnormalized: !!suffix,
				url: url,
				originalName: originalName,
				isDefine: isDefine,
				id: (prefix ?
					prefix + '!' + normalizedName :
					normalizedName) + suffix
			};
		}

		function getModule(depMap) {
			var id = depMap.id,
				mod = getOwn(registry, id);

			if(!mod) {
				mod = registry[id] = new context.Module(depMap);
			}

			return mod;
		}

		function on(depMap, name, fn) {
			var id = depMap.id,
				mod = getOwn(registry, id);

			if(hasProp(defined, id) &&
				(!mod || mod.defineEmitComplete)) {
				if(name === 'defined') {
					fn(defined[id]);
				}
			} else {
				mod = getModule(depMap);
				if(mod.error && name === 'error') {
					fn(mod.error);
				} else {
					mod.on(name, fn);
				}
			}
		}

		function onError(err, errback) {
			var ids = err.requireModules,
				notified = false;

			if(errback) {
				errback(err);
			} else {
				each(ids, function(id) {
					var mod = getOwn(registry, id);
					if(mod) {
						//Set error on module, so it skips timeout checks.
						mod.error = err;
						if(mod.events.error) {
							notified = true;
							mod.emit('error', err);
						}
					}
				});

				if(!notified) {
					req.onError(err);
				}
			}
		}

		/**
		 * Internal method to transfer globalQueue items to this context's
		 * defQueue.
		 */
		function takeGlobalQueue() {
			//Push all the globalDefQueue items into the context's defQueue
			if(globalDefQueue.length) {
				each(globalDefQueue, function(queueItem) {
					var id = queueItem[0];
					if(typeof id === 'string') {
						context.defQueueMap[id] = true;
					}
					defQueue.push(queueItem);
				});
				globalDefQueue = [];
			}
		}

		handlers = {
			'require': function(mod) {
				if(mod.require) {
					return mod.require;
				} else {
					return(mod.require = context.makeRequire(mod.map));
				}
			},
			'exports': function(mod) {
				mod.usingExports = true;
				if(mod.map.isDefine) {
					if(mod.exports) {
						return(defined[mod.map.id] = mod.exports);
					} else {
						return(mod.exports = defined[mod.map.id] = {});
					}
				}
			},
			'module': function(mod) {
				if(mod.module) {
					return mod.module;
				} else {
					return(mod.module = {
						id: mod.map.id,
						uri: mod.map.url,
						config: function() {
							return getOwn(config.config, mod.map.id) || {};
						},
						exports: mod.exports || (mod.exports = {})
					});
				}
			}
		};

		function cleanRegistry(id) {
			//Clean up machinery used for waiting modules.
			delete registry[id];
			delete enabledRegistry[id];
		}

		function breakCycle(mod, traced, processed) {
			var id = mod.map.id;

			if(mod.error) {
				mod.emit('error', mod.error);
			} else {
				traced[id] = true;
				each(mod.depMaps, function(depMap, i) {
					var depId = depMap.id,
						dep = getOwn(registry, depId);

					//Only force things that have not completed
					//being defined, so still in the registry,
					//and only if it has not been matched up
					//in the module already.
					if(dep && !mod.depMatched[i] && !processed[depId]) {
						if(getOwn(traced, depId)) {
							mod.defineDep(i, defined[depId]);
							mod.check(); //pass false?
						} else {
							breakCycle(dep, traced, processed);
						}
					}
				});
				processed[id] = true;
			}
		}

		function checkLoaded() {
			var err, usingPathFallback,
				waitInterval = config.waitSeconds * 1000,
				//It is possible to disable the wait interval by using waitSeconds of 0.
				expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
				noLoads = [],
				reqCalls = [],
				stillLoading = false,
				needCycleCheck = true;

			//Do not bother if this call was a result of a cycle break.
			if(inCheckLoaded) {
				return;
			}

			inCheckLoaded = true;

			//Figure out the state of all the modules.
			eachProp(enabledRegistry, function(mod) {
				var map = mod.map,
					modId = map.id;

				//Skip things that are not enabled or in error state.
				if(!mod.enabled) {
					return;
				}

				if(!map.isDefine) {
					reqCalls.push(mod);
				}

				if(!mod.error) {
					//If the module should be executed, and it has not
					//been inited and time is up, remember it.
					if(!mod.inited && expired) {
						if(hasPathFallback(modId)) {
							usingPathFallback = true;
							stillLoading = true;
						} else {
							noLoads.push(modId);
							removeScript(modId);
						}
					} else if(!mod.inited && mod.fetched && map.isDefine) {
						stillLoading = true;
						if(!map.prefix) {
							//No reason to keep looking for unfinished
							//loading. If the only stillLoading is a
							//plugin resource though, keep going,
							//because it may be that a plugin resource
							//is waiting on a non-plugin cycle.
							return(needCycleCheck = false);
						}
					}
				}
			});

			if(expired && noLoads.length) {
				//If wait time expired, throw error of unloaded modules.
				err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
				err.contextName = context.contextName;
				return onError(err);
			}

			//Not expired, check for a cycle.
			if(needCycleCheck) {
				each(reqCalls, function(mod) {
					breakCycle(mod, {}, {});
				});
			}

			//If still waiting on loads, and the waiting load is something
			//other than a plugin resource, or there are still outstanding
			//scripts, then just try back later.
			if((!expired || usingPathFallback) && stillLoading) {
				//Something is still waiting to load. Wait for it, but only
				//if a timeout is not already in effect.
				if((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
					checkLoadedTimeoutId = setTimeout(function() {
						checkLoadedTimeoutId = 0;
						checkLoaded();
					}, 50);
				}
			}

			inCheckLoaded = false;
		}

		Module = function(map) {
			this.events = getOwn(undefEvents, map.id) || {};
			this.map = map;
			this.shim = getOwn(config.shim, map.id);
			this.depExports = [];
			this.depMaps = [];
			this.depMatched = [];
			this.pluginMaps = {};
			this.depCount = 0;

			/* this.exports this.factory
			   this.depMaps = [],
			   this.enabled, this.fetched
			*/
		};

		Module.prototype = {
			init: function(depMaps, factory, errback, options) {
				options = options || {};

				//Do not do more inits if already done. Can happen if there
				//are multiple define calls for the same module. That is not
				//a normal, common case, but it is also not unexpected.
				if(this.inited) {
					return;
				}

				if(typeof factory == "function" || factory && typeof factory == "object") {
					//TODO 修改第三方，在define或require的回调中可以使用this.require([deps],function),deps依赖中的地址支持"./"和"../",相对于当前的js文件。
					//同时把当前模块的handle添加到每一个模块的_xs_owner_属性中
					var handle;
					var _factory = factory;
					if(typeof factory == "function" && factory._handle) {
						handle = factory._handle;
					} else {
						handle = {};

						for(var x in factory) {
							handle[x] = factory[x];
						}
						handle.moduleName = this.map.name;

						//console.log(context.nameToUrl(handle.moduleName));

						handle.jsUrl = depMaps && depMaps._optionalUrl ? depMaps._optionalUrl : this.map.url;
						handle.getUrl = function(relativePath) {
							return getPathWithRelative(this.jsUrl, relativePath, false);
						};
						handle.require = function(deps, callback) {
							var pluginPattern = /^([a-zA-Z0-9_]+)\!/;
							var url = this.jsUrl;
							var index = url.lastIndexOf('/');
							var urlPrefix = index >= 0 ? url.substr(0, index + 1) : "";
							//console.log(url+"-----"+urlPrefix);
							//console.log(callback);

							for(var i = 0; i < deps.length; i++) {
								var dep = deps[i];
								var prefix = "";
								if(pluginPattern.test(dep)) {
									var index = dep.indexOf("!");
									prefix = dep.substr(0, index + 1);
									dep = dep.substr(index + 1);
								}
								if(startsWith(dep, ".")) {
									dep = urlPrefix + dep;
								}
								deps[i] = prefix + dep;
							}
							if(typeof callback == "function") {
								callback._handle = handle;
								var _callback = callback;
								callback = function() {
									_callback.apply(handle, arguments);
								};
								callback._handle = handle;
							}
							context.require(deps, callback);
						}

					}
					if(typeof factory == "function") {
						factory = function() {
							//同时把当前模块的handle添加到每一个模块的_xs_owner_属性中
							for(var i = 0; i < arguments.length; i++) {
								var arg = arguments[i];
								if(arg && typeof arg == "object") {
									arg._xs_owner_ = handle;
								}
							}

							return _factory.apply(handle, arguments);
						};
					} else if(typeof factory == "object") {
						factory._handle_ = handle;
					}

				}

				this.factory = factory;

				if(errback) {
					//Register for errors on this module.
					this.on('error', errback);
				} else if(this.events.error) {
					//If no errback already, but there are error listeners
					//on this module, set up an errback to pass to the deps.
					errback = bind(this, function(err) {
						this.emit('error', err);
					});
				}

				//Do a copy of the dependency array, so that
				//source inputs are not modified. For example
				//"shim" deps are passed in here directly, and
				//doing a direct modification of the depMaps array
				//would affect that config.
				this.depMaps = depMaps && depMaps.slice(0);

				this.errback = errback;

				//Indicate this module has be initialized
				this.inited = true;

				this.ignore = options.ignore;

				//Could have option to init this module in enabled mode,
				//or could have been previously marked as enabled. However,
				//the dependencies are not known until init is called. So
				//if enabled previously, now trigger dependencies as enabled.
				if(options.enabled || this.enabled) {
					//Enable this module and dependencies.
					//Will call this.check()
					this.enable();
				} else {
					this.check();
				}
			},

			defineDep: function(i, depExports) {
				//Because of cycles, defined callback for a given
				//export can be called more than once.
				if(!this.depMatched[i]) {
					this.depMatched[i] = true;
					this.depCount -= 1;
					this.depExports[i] = depExports;
				}
			},

			fetch: function() {
				if(this.fetched) {
					return;
				}
				this.fetched = true;

				context.startTime = (new Date()).getTime();

				var map = this.map;

				//If the manager is for a plugin managed resource,
				//ask the plugin to load it now.
				if(this.shim) {
					context.makeRequire(this.map, {
						enableBuildCallback: true
					})(this.shim.deps || [], bind(this, function() {
						return map.prefix ? this.callPlugin() : this.load();
					}));
				} else {
					//Regular dependency.
					return map.prefix ? this.callPlugin() : this.load();
				}
			},

			load: function() {
				var url = this.map.url;

				//Regular dependency.
				if(!urlFetched[url]) {
					urlFetched[url] = true;
					context.load(this.map.id, url);
				}
			},

			/**
			 * Checks if the module is ready to define itself, and if so,
			 * define it.
			 */
			check: function() {
				if(!this.enabled || this.enabling) {
					return;
				}

				var err, cjsModule,
					id = this.map.id,
					depExports = this.depExports,
					exports = this.exports,
					factory = this.factory;

				if(!this.inited) {
					// Only fetch if not already in the defQueue.
					if(!hasProp(context.defQueueMap, id)) {
						this.fetch();
					}
				} else if(this.error) {
					this.emit('error', this.error);
				} else if(!this.defining) {
					//The factory could trigger another require call
					//that would result in checking this module to
					//define itself again. If already in the process
					//of doing that, skip this work.
					this.defining = true;

					if(this.depCount < 1 && !this.defined) {
						if(isFunction(factory)) {
							//If there is an error listener, favor passing
							//to that instead of throwing an error. However,
							//only do it for define()'d  modules. require
							//errbacks should not be called for failures in
							//their callbacks (#699). However if a global
							//onError is set, use that.
							if((this.events.error && this.map.isDefine) ||
								req.onError !== defaultOnError) {
								try {
									exports = context.execCb(id, factory, depExports, exports);
								} catch(e) {
									err = e;
								}
							} else {
								exports = context.execCb(id, factory, depExports, exports);
							}

							// Favor return value over exports. If node/cjs in play,
							// then will not have a return value anyway. Favor
							// module.exports assignment over exports object.
							if(this.map.isDefine && exports === undefined) {
								cjsModule = this.module;
								if(cjsModule) {
									exports = cjsModule.exports;
								} else if(this.usingExports) {
									//exports already set the defined value.
									exports = this.exports;
								}
							}

							if(err) {
								err.requireMap = this.map;
								err.requireModules = this.map.isDefine ? [this.map.id] : null;
								err.requireType = this.map.isDefine ? 'define' : 'require';
								return onError((this.error = err));
							}

						} else {
							//Just a literal value
							exports = factory;
						}

						this.exports = exports;

						if(this.map.isDefine && !this.ignore) {
							defined[id] = exports;

							if(req.onResourceLoad) {
								var resLoadMaps = [];
								each(this.depMaps, function(depMap) {
									resLoadMaps.push(depMap.normalizedMap || depMap);
								});
								req.onResourceLoad(context, this.map, resLoadMaps);
							}
						}

						//Clean up
						cleanRegistry(id);

						this.defined = true;
					}

					//Finished the define stage. Allow calling check again
					//to allow define notifications below in the case of a
					//cycle.
					this.defining = false;

					if(this.defined && !this.defineEmitted) {
						this.defineEmitted = true;
						this.emit('defined', this.exports);
						this.defineEmitComplete = true;
					}

				}
			},

			callPlugin: function() {
				var map = this.map,
					id = map.id,
					//Map already normalized the prefix.
					pluginMap = makeModuleMap(map.prefix);

				//Mark this as a dependency for this plugin, so it
				//can be traced for cycles.
				this.depMaps.push(pluginMap);

				on(pluginMap, 'defined', bind(this, function(plugin) {
					var load, normalizedMap, normalizedMod,
						bundleId = getOwn(bundlesMap, this.map.id),
						name = this.map.name,
						parentName = this.map.parentMap ? this.map.parentMap.name : null,
						localRequire = context.makeRequire(map.parentMap, {
							enableBuildCallback: true
						});

					//If current map is not normalized, wait for that
					//normalized name to load instead of continuing.
					if(this.map.unnormalized) {
						//Normalize the ID if the plugin allows it.
						if(plugin.normalize) {
							name = plugin.normalize(name, function(name) {
								return normalize(name, parentName, true);
							}) || '';
						}

						//prefix and name should already be normalized, no need
						//for applying map config again either.
						normalizedMap = makeModuleMap(map.prefix + '!' + name,
							this.map.parentMap);
						on(normalizedMap,
							'defined', bind(this, function(value) {
								this.map.normalizedMap = normalizedMap;
								this.init([], function() {
									return value;
								}, null, {
									enabled: true,
									ignore: true
								});
							}));

						normalizedMod = getOwn(registry, normalizedMap.id);
						if(normalizedMod) {
							//Mark this as a dependency for this plugin, so it
							//can be traced for cycles.
							this.depMaps.push(normalizedMap);

							if(this.events.error) {
								normalizedMod.on('error', bind(this, function(err) {
									this.emit('error', err);
								}));
							}
							normalizedMod.enable();
						}

						return;
					}

					//If a paths config, then just load that file instead to
					//resolve the plugin, as it is built into that paths layer.
					if(bundleId) {
						this.map.url = context.nameToUrl(bundleId);
						this.load();
						return;
					}

					load = bind(this, function(value) {
						this.init([], function() {
							return value;
						}, null, {
							enabled: true
						});
					});

					load.error = bind(this, function(err) {
						this.inited = true;
						this.error = err;
						err.requireModules = [id];

						//Remove temp unnormalized modules for this module,
						//since they will never be resolved otherwise now.
						eachProp(registry, function(mod) {
							if(mod.map.id.indexOf(id + '_unnormalized') === 0) {
								cleanRegistry(mod.map.id);
							}
						});

						onError(err);
					});

					//Allow plugins to load other code without having to know the
					//context or how to 'complete' the load.
					load.fromText = bind(this, function(text, textAlt) {
						/*jslint evil: true */
						var moduleName = map.name,
							moduleMap = makeModuleMap(moduleName),
							hasInteractive = useInteractive;

						//As of 2.1.0, support just passing the text, to reinforce
						//fromText only being called once per resource. Still
						//support old style of passing moduleName but discard
						//that moduleName in favor of the internal ref.
						if(textAlt) {
							text = textAlt;
						}

						//Turn off interactive script matching for IE for any define
						//calls in the text, then turn it back on at the end.
						if(hasInteractive) {
							useInteractive = false;
						}

						//Prime the system by creating a module instance for
						//it.
						getModule(moduleMap);

						//Transfer any config to this other module.
						if(hasProp(config.config, id)) {
							config.config[moduleName] = config.config[id];
						}

						try {
							req.exec(text);
						} catch(e) {
							return onError(makeError('fromtexteval',
								'fromText eval for ' + id +
								' failed: ' + e,
								e, [id]));
						}

						if(hasInteractive) {
							useInteractive = true;
						}

						//Mark this as a dependency for the plugin
						//resource
						this.depMaps.push(moduleMap);

						//Support anonymous modules.
						context.completeLoad(moduleName);

						//Bind the value of that module to the value for this
						//resource ID.
						localRequire([moduleName], load);
					});

					//Use parentName here since the plugin's name is not reliable,
					//could be some weird string with no path that actually wants to
					//reference the parentName's path.
					plugin.load(map.name, localRequire, load, config);
				}));

				context.enable(pluginMap, this);
				this.pluginMaps[pluginMap.id] = pluginMap;
			},

			enable: function() {
				enabledRegistry[this.map.id] = this;
				this.enabled = true;

				//Set flag mentioning that the module is enabling,
				//so that immediate calls to the defined callbacks
				//for dependencies do not trigger inadvertent load
				//with the depCount still being zero.
				this.enabling = true;

				//Enable each dependency
				each(this.depMaps, bind(this, function(depMap, i) {
					var id, mod, handler;

					if(typeof depMap === 'string') {
						//Dependency needs to be converted to a depMap
						//and wired up to this module.
						depMap = makeModuleMap(depMap,
							(this.map.isDefine ? this.map : this.map.parentMap),
							false, !this.skipMap);
						this.depMaps[i] = depMap;

						handler = getOwn(handlers, depMap.id);

						if(handler) {
							this.depExports[i] = handler(this);
							return;
						}

						this.depCount += 1;

						on(depMap, 'defined', bind(this, function(depExports) {
							if(this.undefed) {
								return;
							}
							this.defineDep(i, depExports);
							this.check();
						}));

						if(this.errback) {
							on(depMap, 'error', bind(this, this.errback));
						} else if(this.events.error) {
							// No direct errback on this module, but something
							// else is listening for errors, so be sure to
							// propagate the error correctly.
							on(depMap, 'error', bind(this, function(err) {
								this.emit('error', err);
							}));
						}
					}

					id = depMap.id;
					mod = registry[id];

					//Skip special modules like 'require', 'exports', 'module'
					//Also, don't call enable if it is already enabled,
					//important in circular dependency cases.
					if(!hasProp(handlers, id) && mod && !mod.enabled) {
						context.enable(depMap, this);
					}
				}));

				//Enable each plugin that is used in
				//a dependency
				eachProp(this.pluginMaps, bind(this, function(pluginMap) {
					var mod = getOwn(registry, pluginMap.id);
					if(mod && !mod.enabled) {
						context.enable(pluginMap, this);
					}
				}));

				this.enabling = false;

				this.check();
			},

			on: function(name, cb) {
				var cbs = this.events[name];
				if(!cbs) {
					cbs = this.events[name] = [];
				}
				cbs.push(cb);
			},

			emit: function(name, evt) {
				each(this.events[name], function(cb) {
					cb(evt);
				});
				if(name === 'error') {
					//Now that the error handler was triggered, remove
					//the listeners, since this broken Module instance
					//can stay around for a while in the registry.
					delete this.events[name];
				}
			}
		};

		function callGetModule(args) {
			//Skip modules already defined.
			if(!hasProp(defined, args[0])) {
				var obj = getModule(makeModuleMap(args[0], null, true));
				if(args._optionalUrl) {
					obj.map.url = args._optionalUrl;
				}
				obj.init(args[1], args[2]);
			}
		}

		function removeListener(node, func, name, ieName) {
			//Favor detachEvent because of IE9
			//issue, see attachEvent/addEventListener comment elsewhere
			//in this file.
			if(node.detachEvent && !isOpera) {
				//Probably IE. If not it will throw an error, which will be
				//useful to know.
				if(ieName) {
					node.detachEvent(ieName, func);
				}
			} else {
				node.removeEventListener(name, func, false);
			}
		}

		/**
		 * Given an event from a script node, get the requirejs info from it,
		 * and then removes the event listeners on the node.
		 * @param {Event} evt
		 * @returns {Object}
		 */
		function getScriptData(evt) {
			//Using currentTarget instead of target for Firefox 2.0's sake. Not
			//all old browsers will be supported, but this one was easy enough
			//to support and still makes sense.
			var node = evt.currentTarget || evt.srcElement;

			//Remove the listeners once here.
			removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
			removeListener(node, context.onScriptError, 'error');

			return {
				node: node,
				id: node && node.getAttribute('data-requiremodule')
			};
		}

		function intakeDefines() {
			var args;

			//Any defined modules in the global queue, intake them now.
			takeGlobalQueue();

			//Make sure any remaining defQueue items get properly processed.
			while(defQueue.length) {
				args = defQueue.shift();
				if(args[0] === null) {
					return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' +
						args[args.length - 1]));
				} else {
					//args are id, deps, factory. Should be normalized by the
					//define() function.
					callGetModule(args);
				}
			}
			context.defQueueMap = {};
		}

		context = {
			config: config,
			contextName: contextName,
			registry: registry,
			defined: defined,
			urlFetched: urlFetched,
			defQueue: defQueue,
			defQueueMap: {},
			Module: Module,
			makeModuleMap: makeModuleMap,
			nextTick: req.nextTick,
			onError: onError,

			/**
			 * Set a configuration for the context.
			 * @param {Object} cfg config object to integrate.
			 */
			configure: function(cfg) {
				//Make sure the baseUrl ends in a slash.
				if(cfg.baseUrl) {
					if(cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
						cfg.baseUrl += '/';
					}
				}

				// Convert old style urlArgs string to a function.
				if(typeof cfg.urlArgs === 'string') {
					var urlArgs = cfg.urlArgs;
					cfg.urlArgs = function(id, url) {
						return(url.indexOf('?') === -1 ? '?' : '&') + urlArgs;
					};
				}

				//Save off the paths since they require special processing,
				//they are additive.
				var shim = config.shim,
					objs = {
						paths: true,
						bundles: true,
						config: true,
						map: true
					};

				eachProp(cfg, function(value, prop) {
					if(objs[prop]) {
						if(!config[prop]) {
							config[prop] = {};
						}
						mixin(config[prop], value, true, true);
					} else {
						config[prop] = value;
					}
				});

				//Reverse map the bundles
				if(cfg.bundles) {
					eachProp(cfg.bundles, function(value, prop) {
						each(value, function(v) {
							if(v !== prop) {
								bundlesMap[v] = prop;
							}
						});
					});
				}

				//Merge shim
				if(cfg.shim) {
					eachProp(cfg.shim, function(value, id) {
						//Normalize the structure
						if(isArray(value)) {
							value = {
								deps: value
							};
						}
						if((value.exports || value.init) && !value.exportsFn) {
							value.exportsFn = context.makeShimExports(value);
						}
						shim[id] = value;
					});
					config.shim = shim;
				}

				//Adjust packages if necessary.
				if(cfg.packages) {
					each(cfg.packages, function(pkgObj) {
						var location, name;

						pkgObj = typeof pkgObj === 'string' ? {
							name: pkgObj
						} : pkgObj;

						name = pkgObj.name;
						location = pkgObj.location;
						if(location) {
							config.paths[name] = pkgObj.location;
						}

						//Save pointer to main module ID for pkg name.
						//Remove leading dot in main, so main paths are normalized,
						//and remove any trailing .js, since different package
						//envs have different conventions: some use a module name,
						//some use a file name.
						config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
							.replace(currDirRegExp, '')
							.replace(jsSuffixRegExp, '');
					});
				}

				//If there are any "waiting to execute" modules in the registry,
				//update the maps for them, since their info, like URLs to load,
				//may have changed.
				eachProp(registry, function(mod, id) {
					//If module already has init called, since it is too
					//late to modify them, and ignore unnormalized ones
					//since they are transient.
					if(!mod.inited && !mod.map.unnormalized) {
						mod.map = makeModuleMap(id, null, true);
					}
				});

				//If a deps array or a config callback is specified, then call
				//require with those args. This is useful when require is defined as a
				//config object before require.js is loaded.
				if(cfg.deps || cfg.callback) {
					context.require(cfg.deps || [], cfg.callback);
				}
			},

			makeShimExports: function(value) {
				function fn() {
					var ret;
					if(value.init) {
						ret = value.init.apply(global, arguments);
					}
					return ret || (value.exports && getGlobal(value.exports));
				}
				return fn;
			},

			makeRequire: function(relMap, options) {
				options = options || {};

				function localRequire(deps, callback, errback) {
					var id, map, requireMod;

					if(options.enableBuildCallback && callback && isFunction(callback)) {
						callback.__requireJsBuild = true;
					}

					if(typeof deps === 'string') {
						if(isFunction(callback)) {
							//Invalid call
							return onError(makeError('requireargs', 'Invalid require call'), errback);
						}

						//If require|exports|module are requested, get the
						//value for them from the special handlers. Caveat:
						//this only works while module is being defined.
						if(relMap && hasProp(handlers, deps)) {
							return handlers[deps](registry[relMap.id]);
						}

						//Synchronous access to one module. If require.get is
						//available (as in the Node adapter), prefer that.
						if(req.get) {
							return req.get(context, deps, relMap, localRequire);
						}

						//Normalize module name, if it contains . or ..
						map = makeModuleMap(deps, relMap, false, true);
						id = map.id;

						if(!hasProp(defined, id)) {
							return onError(makeError('notloaded', 'Module name "' +
								id +
								'" has not been loaded yet for context: ' +
								contextName +
								(relMap ? '' : '. Use require([])')));
						}
						return defined[id];
					}

					//Grab defines waiting in the global queue.
					intakeDefines();

					//Mark all the dependencies as needing to be loaded.
					context.nextTick(function() {
						//Some defines could have been added since the
						//require call, collect them.
						intakeDefines();

						requireMod = getModule(makeModuleMap(null, relMap));

						//Store if map config should be applied to this require
						//call for dependencies.
						requireMod.skipMap = options.skipMap;

						requireMod.init(deps, callback, errback, {
							enabled: true
						});

						checkLoaded();
					});

					return localRequire;
				}

				mixin(localRequire, {
					isBrowser: isBrowser,

					/**
					 * Converts a module name + .extension into an URL path.
					 * *Requires* the use of a module name. It does not support using
					 * plain URLs like nameToUrl.
					 */
					toUrl: function(moduleNamePlusExt, addBaseUrl) { //TODO 修改第三方库的部分:addBaseUrl。
						var ext,
							index = moduleNamePlusExt.lastIndexOf('.'),
							segment = moduleNamePlusExt.split('/')[0],
							isRelative = segment === '.' || segment === '..';

						//Have a file extension alias, and it is not the
						//dots from a relative path.
						if(index !== -1 && (!isRelative || index > 1)) {
							ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
							moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
						}

						return context.nameToUrl(normalize(moduleNamePlusExt,
							relMap && relMap.id, true), ext, true, addBaseUrl);
					},

					defined: function(id) {
						return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
					},

					specified: function(id) {
						id = makeModuleMap(id, relMap, false, true).id;
						return hasProp(defined, id) || hasProp(registry, id);
					}
				});

				//Only allow undef on top level require calls
				if(!relMap) {
					localRequire.undef = function(id) {
						//Bind any waiting define() calls to this context,
						//fix for #408
						takeGlobalQueue();

						var map = makeModuleMap(id, relMap, true),
							mod = getOwn(registry, id);

						mod.undefed = true;
						removeScript(id);

						delete defined[id];
						delete urlFetched[map.url];
						delete undefEvents[id];

						//Clean queued defines too. Go backwards
						//in array so that the splices do not
						//mess up the iteration.
						eachReverse(defQueue, function(args, i) {
							if(args[0] === id) {
								defQueue.splice(i, 1);
							}
						});
						delete context.defQueueMap[id];

						if(mod) {
							//Hold on to listeners in case the
							//module will be attempted to be reloaded
							//using a different config.
							if(mod.events.defined) {
								undefEvents[id] = mod.events;
							}

							cleanRegistry(id);
						}
					};
				}

				return localRequire;
			},

			/**
			 * Called to enable a module if it is still in the registry
			 * awaiting enablement. A second arg, parent, the parent module,
			 * is passed in for context, when this method is overridden by
			 * the optimizer. Not shown here to keep code compact.
			 */
			enable: function(depMap) {
				var mod = getOwn(registry, depMap.id);
				if(mod) {
					getModule(depMap).enable();
				}
			},

			/**
			 * Internal method used by environment adapters to complete a load event.
			 * A load event could be a script load or just a load pass from a synchronous
			 * load call.
			 * @param {String} moduleName the name of the module to potentially complete.
			 */
			completeLoad: function(moduleName) {
				var found, args, mod,
					shim = getOwn(config.shim, moduleName) || {},
					shExports = shim.exports;

				takeGlobalQueue();

				while(defQueue.length) {
					args = defQueue.shift();
					if(args[0] === null) {
						args[0] = moduleName;
						//If already found an anonymous module and bound it
						//to this name, then this is some other anon module
						//waiting for its completeLoad to fire.
						if(found) {
							break;
						}
						found = true;
					} else if(args[0] === moduleName) {
						//Found matching define call for this script!
						found = true;
					}

					callGetModule(args);
				}
				context.defQueueMap = {};

				//Do this after the cycle of callGetModule in case the result
				//of those calls/init calls changes the registry.
				mod = getOwn(registry, moduleName);

				if(!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
					if(config.enforceDefine && (!shExports || !getGlobal(shExports))) {
						if(hasPathFallback(moduleName)) {
							return;
						} else {
							return onError(makeError('nodefine',
								'No define call for ' + moduleName,
								null, [moduleName]));
						}
					} else {
						//A script that does not call define(), so just simulate
						//the call for it.
						callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
					}
				}

				checkLoaded();
			},

			/**
			 * Converts a module name to a file path. Supports cases where
			 * moduleName may actually be just an URL.
			 * Note that it **does not** call normalize on the moduleName,
			 * it is assumed to have already been normalized. This is an
			 * internal API, not a public one. Use toUrl for the public API.
			 */
			nameToUrl: function(moduleName, ext, skipExt, addBaseUrl) { //TODO 修改第三方库的部分:addBaseUrl。
				var paths, syms, i, parentModule, url,
					parentPath, bundleId,
					pkgMain = getOwn(config.pkgs, moduleName);

				if(pkgMain) {
					moduleName = pkgMain;
				}

				bundleId = getOwn(bundlesMap, moduleName);

				if(bundleId) {
					return context.nameToUrl(bundleId, ext, skipExt);
				}

				//If a colon is in the URL, it indicates a protocol is used and it is just
				//an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
				//or ends with .js, then assume the user meant to use an url and not a module id.
				//The slash is important for protocol-less URLs as well as full paths.
				if(req.jsExtRegExp.test(moduleName)) {
					//Just a plain path, not module name lookup, so just return it.
					//Add extension if it is included. This is a bit wonky, only non-.js things pass
					//an extension, this method probably needs to be reworked.
					url = moduleName + (ext || '');
				} else {
					//A module that needs to be converted to a path.
					paths = config.paths;

					syms = moduleName.split('/');
					//For each module name segment, see if there is a path
					//registered for it. Start with most specific name
					//and work up from it.
					for(i = syms.length; i > 0; i -= 1) {
						parentModule = syms.slice(0, i).join('/');

						parentPath = getOwn(paths, parentModule);
						if(parentPath) {
							//If an array, it means there are a few choices,
							//Choose the one that is desired
							if(isArray(parentPath)) {
								parentPath = parentPath[0];
							}
							syms.splice(0, i, parentPath);
							break;
						}
					}

					//Join the path parts together, then figure out if baseUrl is needed.
					url = syms.join('/');
					url += (ext || (/^data\:|^blob\:|\?/.test(url) || skipExt ? '' : '.js'));
					url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) || addBaseUrl === false ? '' : config.baseUrl) + url;
				}

				//TODO 用于xsSC.appendUrlArgs
				var theUrl = config.urlArgs && !/^blob\:/.test(url) ?
					url + config.urlArgs(moduleName, url) : url;
				//				if((typeof xsSC !== "undefined") && (typeof xsSC.appendUrlArgs == "function")) {
				//					theUrl = xsSC.appendUrlArgs(theUrl);
				//				}
				return theUrl;
			},

			//Delegates to req.load. Broken out as a separate function to
			//allow overriding in the optimizer.
			load: function(id, url) {
				req.load(context, id, url);
			},

			/**
			 * Executes a module callback function. Broken out as a separate function
			 * solely to allow the build system to sequence the files in the built
			 * layer in the right sequence.
			 *
			 * @private
			 */
			execCb: function(name, callback, args, exports) {
				return callback.apply(exports, args);
			},

			/**
			 * callback for script loads, used to check status of loading.
			 *
			 * @param {Event} evt the event from the browser for the script
			 * that was loaded.
			 */
			onScriptLoad: function(evt) {
				//Using currentTarget instead of target for Firefox 2.0's sake. Not
				//all old browsers will be supported, but this one was easy enough
				//to support and still makes sense.
				if(evt.type === 'load' ||
					(readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
					//Reset interactive script so a script node is not held onto for
					//to long.
					interactiveScript = null;

					//Pull out the name of the module and the context.
					var data = getScriptData(evt);
					context.completeLoad(data.id);
				}
			},

			/**
			 * Callback for script errors.
			 */
			onScriptError: function(evt) {
				var data = getScriptData(evt);
				if(!hasPathFallback(data.id)) {
					var parents = [];
					eachProp(registry, function(value, key) {
						if(key.indexOf('_@r') !== 0) {
							each(value.depMaps, function(depMap) {
								if(depMap.id === data.id) {
									parents.push(key);
									return true;
								}
							});
						}
					});
					return onError(makeError('scripterror', 'Script error for "' + data.id +
						(parents.length ?
							'", needed by: ' + parents.join(', ') :
							'"'), evt, [data.id]));
				}
			}
		};

		context.require = context.makeRequire();
		return context;
	}

	/**
	 * Main entry point.
	 *
	 * If the only argument to require is a string, then the module that
	 * is represented by that string is fetched for the appropriate context.
	 *
	 * If the first argument is an array, then it will be treated as an array
	 * of dependency string names to fetch. An optional function callback can
	 * be specified to execute when all of those dependencies are available.
	 *
	 * Make a local req variable to help Caja compliance (it assumes things
	 * on a require that are not standardized), and to give a short
	 * name for minification/local scope use.
	 */
	req = requirejs = function(deps, callback, errback, optional) {

		//Find the right context, use default
		var context, config,
			contextName = defContextName;

		// Determine if have config object in the call.
		if(!isArray(deps) && typeof deps !== 'string') {
			// deps is a config object
			config = deps;
			if(isArray(callback)) {
				// Adjust args if there are dependencies
				deps = callback;
				callback = errback;
				errback = optional;
			} else {
				deps = [];
			}
		}

		if(config && config.context) {
			contextName = config.context;
		}

		context = getOwn(contexts, contextName);
		if(!context) {
			context = contexts[contextName] = req.s.newContext(contextName);
		}

		if(config) {
			context.configure(config);
		}

		return context.require(deps, callback, errback);
	};

	/**
	 * Support require.config() to make it easier to cooperate with other
	 * AMD loaders on globally agreed names.
	 */
	req.config = function(config) {
		return req(config);
	};

	/**
	 * Execute something after the current tick
	 * of the event loop. Override for other envs
	 * that have a better solution than setTimeout.
	 * @param  {Function} fn function to execute later.
	 */
	req.nextTick = typeof setTimeout !== 'undefined' ? function(fn) {
		setTimeout(fn, 4);
	} : function(fn) {
		fn();
	};

	/**
	 * Export require as a global, but only if it does not already exist.
	 */
	if(!require) {
		require = req;
	}

	req.version = version;

	//Used to filter out dependencies that are already paths.
	req.jsExtRegExp = /^\/|:|\?|\.js$/;
	req.isBrowser = isBrowser;
	s = req.s = {
		contexts: contexts,
		newContext: newContext
	};

	//Create default context.
	req({});

	//Exports some context-sensitive methods on global require.
	each([
		'toUrl',
		'undef',
		'defined',
		'specified'
	], function(prop) {
		//Reference from contexts instead of early binding to default context,
		//so that during builds, the latest instance of the default context
		//with its config gets used.
		req[prop] = function() {
			var ctx = contexts[defContextName];
			return ctx.require[prop].apply(ctx, arguments);
		};
	});

	if(isBrowser) {
		head = s.head = document.getElementsByTagName('head')[0];
		//If BASE tag is in play, using appendChild is a problem for IE6.
		//When that browser dies, this can be removed. Details in this jQuery bug:
		//http://dev.jquery.com/ticket/2709
		baseElement = document.getElementsByTagName('base')[0];
		if(baseElement) {
			head = s.head = baseElement.parentNode;
		}
	}

	/**
	 * Any errors that require explicitly generates will be passed to this
	 * function. Intercept/override it if you want custom error handling.
	 * @param {Error} err the error object.
	 */
	req.onError = defaultOnError;

	/**
	 * Creates the node for the load command. Only used in browser envs.
	 */
	req.createNode = function(config, moduleName, url) {
		var node = config.xhtml ?
			document.createElementNS(location.protocol + '://www.w3.org/1999/xhtml', 'html:script') : //TODO protocol
			document.createElement('script');
		node.type = config.scriptType || 'text/javascript';
		node.charset = 'utf-8';
		node.async = true;
		return node;
	};

	/**
	 * Does the request to load a module for the browser case.
	 * Make this a separate function to allow other environments
	 * to override it.
	 *
	 * @param {Object} context the require context to find state.
	 * @param {String} moduleName the name of the module.
	 * @param {Object} url the URL to the module.
	 */
	req.load = function(context, moduleName, url) {
		var config = (context && context.config) || {},
			node;
		if(isBrowser) {
			//In the browser so use a script tag
			node = req.createNode(config, moduleName, url);

			node.setAttribute('data-requirecontext', context.contextName);
			node.setAttribute('data-requiremodule', moduleName);

			//Set up load listener. Test attachEvent first because IE9 has
			//a subtle issue in its addEventListener and script onload firings
			//that do not match the behavior of all other browsers with
			//addEventListener support, which fire the onload event for a
			//script right after the script execution. See:
			//https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
			//UNFORTUNATELY Opera implements attachEvent but does not follow the script
			//script execution mode.
			if(node.attachEvent &&
				//Check if node.attachEvent is artificially added by custom script or
				//natively supported by browser
				//read https://github.com/requirejs/requirejs/issues/187
				//if we can NOT find [native code] then it must NOT natively supported.
				//in IE8, node.attachEvent does not have toString()
				//Note the test for "[native code" with no closing brace, see:
				//https://github.com/requirejs/requirejs/issues/273
				!(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
				!isOpera) {
				//Probably IE. IE (at least 6-8) do not fire
				//script onload right after executing the script, so
				//we cannot tie the anonymous define call to a name.
				//However, IE reports the script as being in 'interactive'
				//readyState at the time of the define call.
				useInteractive = true;

				node.attachEvent('onreadystatechange', context.onScriptLoad);
				//It would be great to add an error handler here to catch
				//404s in IE9+. However, onreadystatechange will fire before
				//the error handler, so that does not help. If addEventListener
				//is used, then IE will fire error before load, but we cannot
				//use that pathway given the connect.microsoft.com issue
				//mentioned above about not doing the 'script execute,
				//then fire the script load event listener before execute
				//next script' that other browsers do.
				//Best hope: IE10 fixes the issues,
				//and then destroys all installs of IE 6-9.
				//node.attachEvent('onerror', context.onScriptError);
			} else {
				node.addEventListener('load', context.onScriptLoad, false);
				node.addEventListener('error', context.onScriptError, false);
			}
			node.src = url;

			//Calling onNodeCreated after all properties on the node have been
			//set, but before it is placed in the DOM.
			if(config.onNodeCreated) {
				config.onNodeCreated(node, config, moduleName, url);
			}

			//For some cache cases in IE 6-8, the script executes before the end
			//of the appendChild execution, so to tie an anonymous define
			//call to the module name (which is stored on the node), hold on
			//to a reference to this node, but clear after the DOM insertion.
			currentlyAddingScript = node;
			if(baseElement) {
				head.insertBefore(node, baseElement);
			} else {
				head.appendChild(node);
			}
			currentlyAddingScript = null;

			return node;
		} else if(isWebWorker) {
			try {
				//In a web worker, use importScripts. This is not a very
				//efficient use of importScripts, importScripts will block until
				//its script is downloaded and evaluated. However, if web workers
				//are in play, the expectation is that a build has been done so
				//that only one script needs to be loaded anyway. This may need
				//to be reevaluated if other use cases become common.

				// Post a task to the event loop to work around a bug in WebKit
				// where the worker gets garbage-collected after calling
				// importScripts(): https://webkit.org/b/153317
				setTimeout(function() {}, 0);
				importScripts(url);

				//Account for anonymous modules
				context.completeLoad(moduleName);
			} catch(e) {
				context.onError(makeError('importscripts',
					'importScripts failed for ' +
					moduleName + ' at ' + url,
					e, [moduleName]));
			}
		}
	};

	function getInteractiveScript() {
		if(interactiveScript && interactiveScript.readyState === 'interactive') {
			return interactiveScript;
		}

		eachReverse(scripts(), function(script) {
			if(script.readyState === 'interactive') {
				return(interactiveScript = script);
			}
		});
		return interactiveScript;
	}

	//Look for a data-main script attribute, which could also adjust the baseUrl.
	if(isBrowser && !cfg.skipDataMain) {
		//Figure out baseUrl. Get it from the script tag with require.js in it.
		eachReverse(scripts(), function(script) {
			//Set the 'head' where we can append children by
			//using the script's parent.
			if(!head) {
				head = script.parentNode;
			}

			//Look for a data-main attribute to set main script for the page
			//to load. If it is there, the path to data main becomes the
			//baseUrl, if it is not already set.
			dataMain = script.getAttribute('data-main');
			if(dataMain) {
				//Preserve dataMain in case it is a path (i.e. contains '?')
				mainScript = dataMain;

				//Set final baseUrl if there is not already an explicit one,
				//but only do so if the data-main value is not a loader plugin
				//module ID.
				if(!cfg.baseUrl && mainScript.indexOf('!') === -1) {
					//Pull off the directory of data-main for use as the
					//baseUrl.
					src = mainScript.split('/');
					mainScript = src.pop();
					subPath = src.length ? src.join('/') + '/' : './';

					cfg.baseUrl = subPath;
				}

				//Strip off any trailing .js since mainScript is now
				//like a module name.
				mainScript = mainScript.replace(jsSuffixRegExp, '');

				//If mainScript is still a path, fall back to dataMain
				if(req.jsExtRegExp.test(mainScript)) {
					mainScript = dataMain;
				}

				//Put the data-main script in the files to load.
				cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

				return true;
			}
		});
	}

	/**
	 * The function that handles definitions of modules. Differs from
	 * require() in that a string for the module should be the first argument,
	 * and the function to execute after dependencies are loaded should
	 * return a value to define the module corresponding to the first argument's
	 * name.
	 */
	define = function(name, deps, callback, _optionalUrl) {
		var node, context;

		//Allow for anonymous modules
		if(typeof name !== 'string') {
			//Adjust args appropriately
			callback = deps;
			deps = name;
			name = null;
		}

		//This module may not have dependencies
		if(!isArray(deps)) {
			callback = deps;
			deps = null;
		}

		//If no name, and callback is a function, then figure out if it a
		//CommonJS thing with dependencies.
		if(!deps && isFunction(callback)) {
			deps = [];
			//Remove comments from the callback string,
			//look for require calls, and pull them into the dependencies,
			//but only if there are function args.
			if(callback.length) {
				callback
					.toString()
					.replace(commentRegExp, commentReplace)
					.replace(cjsRequireRegExp, function(match, dep) {
						deps.push(dep);
					});

				//May be a CommonJS thing even without require calls, but still
				//could use exports, and module. Avoid doing exports and module
				//work though if it just needs require.
				//REQUIRES the function to expect the CommonJS variables in the
				//order listed below.
				deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
			}
		}

		//If in IE 6-8 and hit an anonymous define() call, do the interactive
		//work.
		if(useInteractive) {
			node = currentlyAddingScript || getInteractiveScript();
			if(node) {
				if(!name) {
					name = node.getAttribute('data-requiremodule');
				}
				context = contexts[node.getAttribute('data-requirecontext')];
			}
		}

		//Always save off evaluating the def call until the script onload handler.
		//This allows multiple modules to be in a file without prematurely
		//tracing dependencies, and allows for anonymous module support,
		//where the module name is not known until the script onload event
		//occurs. If no context, use the global queue, and get it processed
		//in the onscript load callback.
		var as = [name, deps, callback];
		as._optionalUrl = _optionalUrl;
		if(context) {
			context.defQueue.push(as);
			context.defQueueMap[name] = true;
		} else {
			globalDefQueue.push(as);
		}
	};

	define.amd = {
		jQuery: true
	};

	/**
	 * Executes the text. Normally just uses eval, but can be modified
	 * to use a better, environment-specific call. Only used for transpiling
	 * loader plugins, not for plain JS modules.
	 * @param {String} text the text to execute/evaluate.
	 */
	req.exec = function(text) {
		/*jslint evil: true */
		return eval(text);
	};

	//Set up with config info.
	req(cfg);
}(this, (typeof setTimeout === 'undefined' ? undefined : setTimeout)));

/**
 * **********************************************************************************************************
 * require text.js
 * **********************************************************************************************************
 */
/**
 * @license text 2.0.15 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/text/LICENSE
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define("text", ['module'], function(module) {
	'use strict';

	var text, fs, Cc, Ci, xpcIsWindows,
		progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
		xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
		bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
		hasLocation = typeof location !== 'undefined' && location.href,
		defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
		defaultHostName = hasLocation && location.hostname,
		defaultPort = hasLocation && (location.port || undefined),
		buildMap = {},
		masterConfig = (module.config && module.config()) || {};

	function useDefault(value, defaultValue) {
		return value === undefined || value === '' ? defaultValue : value;
	}

	//Allow for default ports for http and https.
	function isSamePort(protocol1, port1, protocol2, port2) {
		if(port1 === port2) {
			return true;
		} else if(protocol1 === protocol2) {
			if(protocol1 === 'http') {
				return useDefault(port1, '80') === useDefault(port2, '80');
			} else if(protocol1 === 'https') {
				return useDefault(port1, '443') === useDefault(port2, '443');
			}
		}
		return false;
	}

	text = {
		version: '2.0.15',

		strip: function(content) {
			//Strips <?xml ...?> declarations so that external SVG and XML
			//documents can be added to a document without worry. Also, if the string
			//is an HTML document, only the part inside the body tag is returned.
			if(content) {
				content = content.replace(xmlRegExp, "");
				var matches = content.match(bodyRegExp);
				if(matches) {
					content = matches[1];
				}
			} else {
				content = "";
			}
			return content;
		},

		jsEscape: function(content) {
			return content.replace(/(['\\])/g, '\\$1')
				.replace(/[\f]/g, "\\f")
				.replace(/[\b]/g, "\\b")
				.replace(/[\n]/g, "\\n")
				.replace(/[\t]/g, "\\t")
				.replace(/[\r]/g, "\\r")
				.replace(/[\u2028]/g, "\\u2028")
				.replace(/[\u2029]/g, "\\u2029");
		},

		createXhr: masterConfig.createXhr || function() {
			//Would love to dump the ActiveX crap in here. Need IE 6 to die first.
			var xhr, i, progId;
			if(typeof XMLHttpRequest !== "undefined") {
				return new XMLHttpRequest();
			} else if(typeof ActiveXObject !== "undefined") {
				for(i = 0; i < 3; i += 1) {
					progId = progIds[i];
					try {
						xhr = new ActiveXObject(progId);
					} catch(e) {}

					if(xhr) {
						progIds = [progId]; // so faster next time
						break;
					}
				}
			}

			return xhr;
		},

		/**
		 * Parses a resource name into its component parts. Resource names
		 * look like: module/name.ext!strip, where the !strip part is
		 * optional.
		 * @param {String} name the resource name
		 * @returns {Object} with properties "moduleName", "ext" and "strip"
		 * where strip is a boolean.
		 */
		parseName: function(name) {
			var modName, ext, temp,
				strip = false,
				index = name.lastIndexOf("."),
				isRelative = name.indexOf('./') === 0 ||
				name.indexOf('../') === 0;

			if(index !== -1 && (!isRelative || index > 1)) {
				modName = name.substring(0, index);
				ext = name.substring(index + 1);
			} else {
				modName = name;
			}

			temp = ext || modName;
			index = temp.indexOf("!");
			if(index !== -1) {
				//Pull off the strip arg.
				strip = temp.substring(index + 1) === "strip";
				temp = temp.substring(0, index);
				if(ext) {
					ext = temp;
				} else {
					modName = temp;
				}
			}

			return {
				moduleName: modName,
				ext: ext,
				strip: strip
			};
		},

		xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

		/**
		 * Is an URL on another domain. Only works for browser use, returns
		 * false in non-browser environments. Only used to know if an
		 * optimized .js version of a text resource should be loaded
		 * instead.
		 * @param {String} url
		 * @returns Boolean
		 */
		useXhr: function(url, protocol, hostname, port) {
			var uProtocol, uHostName, uPort,
				match = text.xdRegExp.exec(url);
			if(!match) {
				return true;
			}
			uProtocol = match[2];
			uHostName = match[3];

			uHostName = uHostName.split(':');
			uPort = uHostName[1];
			uHostName = uHostName[0];

			return(!uProtocol || uProtocol === protocol) &&
				(!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
				((!uPort && !uHostName) || isSamePort(uProtocol, uPort, protocol, port));
		},

		finishLoad: function(name, strip, content, onLoad) {
			content = strip ? text.strip(content) : content;
			if(masterConfig.isBuild) {
				buildMap[name] = content;
			}
			onLoad(content);
		},

		load: function(name, req, onLoad, config) {
			//Name has format: some.module.filext!strip
			//The strip part is optional.
			//if strip is present, then that means only get the string contents
			//inside a body tag in an HTML string. For XML/SVG content it means
			//removing the <?xml ...?> declarations so the content can be inserted
			//into the current doc without problems.

			// Do not bother with the work if a build and text will
			// not be inlined.
			if(config && config.isBuild && !config.inlineText) {
				onLoad();
				return;
			}

			masterConfig.isBuild = config && config.isBuild;

			var parsed = text.parseName(name),
				nonStripName = parsed.moduleName +
				(parsed.ext ? '.' + parsed.ext : ''),
				url = req.toUrl(nonStripName),
				useXhr = (masterConfig.useXhr) ||
				text.useXhr;

			// Do not load if it is an empty: url
			if(url.indexOf('empty:') === 0) {
				onLoad();
				return;
			}

			//TODO 修改第三方库：直接网络请求
			//Load the text. Use XHR if possible and in a browser.
			//	if(!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
			text.get(url, function(content) {
				text.finishLoad(name, parsed.strip, content, onLoad);
			}, function(err) {
				if(onLoad.error) {
					onLoad.error(err);
				}
			});
			//			} else {
			//				//Need to fetch the resource across domains. Assume
			//				//the resource has been optimized into a JS module. Fetch
			//				//by the module name + extension, but do not include the
			//				//!strip part to avoid file system issues.
			//				req([nonStripName], function(content) {
			//					text.finishLoad(parsed.moduleName + '.' + parsed.ext,
			//						parsed.strip, content, onLoad);
			//				});
			//			}
		},

		write: function(pluginName, moduleName, write, config) {
			if(buildMap.hasOwnProperty(moduleName)) {
				var content = text.jsEscape(buildMap[moduleName]);
				write.asModule(pluginName + "!" + moduleName,
					"define(function () { return '" +
					content +
					"';});\n");
			}
		},

		writeFile: function(pluginName, moduleName, req, write, config) {
			var parsed = text.parseName(moduleName),
				extPart = parsed.ext ? '.' + parsed.ext : '',
				nonStripName = parsed.moduleName + extPart,
				//Use a '.js' file name so that it indicates it is a
				//script that can be loaded across domains.
				//fileName = req.toUrl(parsed.moduleName + extPart) + '.js';
				fileName = req.toUrl(parsed.moduleName + extPart + ".js"); //TODO 修改

			//Leverage own load() method to load plugin value, but only
			//write out values that do not have the strip argument,
			//to avoid any potential issues with ! in file names.
			text.load(nonStripName, req, function(value) {
				//Use own write() method to construct full module value.
				//But need to create shell that translates writeFile's
				//write() to the right interface.
				var textWrite = function(contents) {
					return write(fileName, contents);
				};
				textWrite.asModule = function(moduleName, contents) {
					return write.asModule(moduleName, fileName, contents);
				};

				text.write(pluginName, nonStripName, textWrite, config);
			}, config);
		}
	};

	if(masterConfig.env === 'node' || (!masterConfig.env &&
			typeof process !== "undefined" &&
			process.versions &&
			!!process.versions.node &&
			!process.versions['node-webkit'] &&
			!process.versions['atom-shell'])) {
		//Using special require.nodeRequire, something added by r.js.
		fs = require.nodeRequire('fs');

		text.get = function(url, callback, errback) {
			try {
				var file = fs.readFileSync(url, 'utf8');
				//Remove BOM (Byte Mark Order) from utf8 files if it is there.
				if(file[0] === '\uFEFF') {
					file = file.substring(1);
				}
				callback(file);
			} catch(e) {
				if(errback) {
					errback(e);
				}
			}
		};
	} else if(masterConfig.env === 'xhr' || (!masterConfig.env &&
			text.createXhr())) {
		text.get = function(url, callback, errback, headers) {
			var xhr = text.createXhr(),
				header;
			xhr.open('GET', url, true);

			//Allow plugins direct access to xhr headers
			if(headers) {
				for(header in headers) {
					if(headers.hasOwnProperty(header)) {
						xhr.setRequestHeader(header.toLowerCase(), headers[header]);
					}
				}
			}

			//Allow overrides specified in config
			if(masterConfig.onXhr) {
				masterConfig.onXhr(xhr, url);
			}

			xhr.onreadystatechange = function(evt) {
				var status, err;
				//Do not explicitly handle errors, those should be
				//visible via console output in the browser.
				if(xhr.readyState === 4) {
					status = xhr.status || 0;
					if(status > 399 && status < 600) {
						//An http 4xx or 5xx error. Signal an error.
						err = new Error(url + ' HTTP status: ' + status);
						err.xhr = xhr;
						if(errback) {
							errback(err);
						}
					} else {
						callback(xhr.responseText);
					}

					if(masterConfig.onXhrComplete) {
						masterConfig.onXhrComplete(xhr, url);
					}
				}
			};
			xhr.send(null);
		};
	} else if(masterConfig.env === 'rhino' || (!masterConfig.env &&
			typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
		//Why Java, why is this so awkward?
		text.get = function(url, callback) {
			var stringBuffer, line,
				encoding = "utf-8",
				file = new java.io.File(url),
				lineSeparator = java.lang.System.getProperty("line.separator"),
				input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
				content = '';
			try {
				stringBuffer = new java.lang.StringBuffer();
				line = input.readLine();

				// Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
				// http://www.unicode.org/faq/utf_bom.html

				// Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
				// http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
				if(line && line.length() && line.charAt(0) === 0xfeff) {
					// Eat the BOM, since we've already found the encoding on this file,
					// and we plan to concatenating this buffer with others; the BOM should
					// only appear at the top of a file.
					line = line.substring(1);
				}

				if(line !== null) {
					stringBuffer.append(line);
				}

				while((line = input.readLine()) !== null) {
					stringBuffer.append(lineSeparator);
					stringBuffer.append(line);
				}
				//Make sure we return a JavaScript string and not a Java string.
				content = String(stringBuffer.toString()); //String
			} finally {
				input.close();
			}
			callback(content);
		};
	} else if(masterConfig.env === 'xpconnect' || (!masterConfig.env &&
			typeof Components !== 'undefined' && Components.classes &&
			Components.interfaces)) {
		//Avert your gaze!
		Cc = Components.classes;
		Ci = Components.interfaces;
		Components.utils['import']('resource://gre/modules/FileUtils.jsm');
		xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

		text.get = function(url, callback) {
			var inStream, convertStream, fileObj,
				readData = {};

			if(xpcIsWindows) {
				url = url.replace(/\//g, '\\');
			}

			fileObj = new FileUtils.File(url);

			//XPCOM, you so crazy
			try {
				inStream = Cc['@mozilla.org/network/file-input-stream;1']
					.createInstance(Ci.nsIFileInputStream);
				inStream.init(fileObj, 1, 0, false);

				convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
					.createInstance(Ci.nsIConverterInputStream);
				convertStream.init(inStream, "utf-8", inStream.available(),
					Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

				convertStream.readString(inStream.available(), readData);
				convertStream.close();
				inStream.close();
				callback(readData.value);
			} catch(e) {
				throw new Error((fileObj && fileObj.path || '') + ': ' + e);
			}
		};
	}
	return text;
});

/*
 * Require-CSS RequireJS css! loader plugin
 * 0.1.8
 * Guy Bedford 2014
 * MIT
 */

/*
 *
 * Usage:
 *  require(['css!./mycssFile']);
 *
 * Tested and working in (up to latest versions as of March 2013):
 * Android
 * iOS 6
 * IE 6 - 10
 * Chome 3 - 26
 * Firefox 3.5 - 19
 * Opera 10 - 12
 * 
 * browserling.com used for virtual testing environment
 *
 * Credit to B Cavalier & J Hann for the IE 6 - 9 method,
 * refined with help from Martin Cermak
 * 
 * Sources that helped along the way:
 * - https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent
 * - http://www.phpied.com/when-is-a-stylesheet-really-loaded/
 * - https://github.com/cujojs/curl/blob/master/src/curl/plugin/css.js
 *
 */

define("css", function() {
	//>>excludeStart('excludeRequireCss', pragmas.excludeRequireCss)
	if(typeof window == 'undefined')
		return {
			load: function(n, r, load) {
				load()
			}
		};

	var head = document.getElementsByTagName('head')[0];

	var engine = window.navigator.userAgent.match(/Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv\:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/) || 0;

	// use <style> @import load method (IE < 9, Firefox < 18)
	var useImportLoad = false;

	// set to false for explicit <link> load checking when onload doesn't work perfectly (webkit)
	var useOnload = true;

	// trident / msie
	if(engine[1] || engine[7])
		useImportLoad = parseInt(engine[1]) < 6 || parseInt(engine[7]) <= 9;
	// webkit
	else if(engine[2] || engine[8] || 'WebkitAppearance' in document.documentElement.style)
		useOnload = false;
	// gecko
	else if(engine[4])
		useImportLoad = parseInt(engine[4]) < 18;

	//>>excludeEnd('excludeRequireCss')
	//main api object
	var cssAPI = {};

	//>>excludeStart('excludeRequireCss', pragmas.excludeRequireCss)
	cssAPI.pluginBuilder = './css-builder';

	// <style> @import load method
	var curStyle, curSheet;
	var createStyle = function() {
		curStyle = document.createElement('style');
		head.appendChild(curStyle);
		curSheet = curStyle.styleSheet || curStyle.sheet;
	}
	var ieCnt = 0;
	var ieLoads = [];
	var ieCurCallback;

	var createIeLoad = function(url) {
		curSheet.addImport(url);
		curStyle.onload = function() {
			processIeLoad()
		};

		ieCnt++;
		if(ieCnt == 31) {
			createStyle();
			ieCnt = 0;
		}
	}
	var processIeLoad = function() {
		ieCurCallback();

		var nextLoad = ieLoads.shift();

		if(!nextLoad) {
			ieCurCallback = null;
			return;
		}

		ieCurCallback = nextLoad[1];
		createIeLoad(nextLoad[0]);
	}
	var importLoad = function(url, callback) {
		if(!curSheet || !curSheet.addImport)
			createStyle();

		if(curSheet && curSheet.addImport) {
			// old IE
			if(ieCurCallback) {
				ieLoads.push([url, callback]);
			} else {
				createIeLoad(url);
				ieCurCallback = callback;
			}
		} else {
			// old Firefox
			curStyle.textContent = '@import "' + url + '";';

			var loadInterval = setInterval(function() {
				try {
					curStyle.sheet.cssRules;
					clearInterval(loadInterval);
					callback();
				} catch(e) {}
			}, 10);
		}
	}

	// <link> load method
	var linkLoad = function(url, callback) {
		var link = document.createElement('link');
		link.type = 'text/css';
		link.rel = 'stylesheet';
		if(useOnload)
			link.onload = function() {
				link.onload = function() {};
				// for style dimensions queries, a short delay can still be necessary
				setTimeout(callback, 7);
			}
		else
			var loadInterval = setInterval(function() {
				for(var i = 0; i < document.styleSheets.length; i++) {
					var sheet = document.styleSheets[i];
					if(sheet.href == link.href) {
						clearInterval(loadInterval);
						return callback();
					}
				}
			}, 10);
		link.href = url;
		head.appendChild(link);
	}

	//>>excludeEnd('excludeRequireCss')
	//	cssAPI.normalize = function(name, normalize) {
	//		if(name.substr(name.length - 4, 4) == '.css')
	//			name = name.substr(0, name.length - 4);
	//
	//		return normalize(name);
	//	}
	//TODO 修改第三方库的部分:css。
	//>>excludeStart('excludeRequireCss', pragmas.excludeRequireCss)
	cssAPI.load = function(cssId, req, load, config) {
		if(cssId.indexOf(".css") != cssId.length - 4) {
			cssId += ".css";
		}
		(useImportLoad ? importLoad : linkLoad)(req.toUrl(cssId), load);

	}

	//>>excludeEnd('excludeRequireCss')
	return cssAPI;
});

/**
 * @license i18n 2.0.6 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/i18n/LICENSE
 */
/*jslint regexp: true */
/*global require: false, navigator: false, define: false */

/**
 * This plugin handles i18n! prefixed modules. It does the following:
 *
 * 1) A regular module can have a dependency on an i18n bundle, but the regular
 * module does not want to specify what locale to load. So it just specifies
 * the top-level bundle, like 'i18n!nls/colors'.
 *
 * This plugin will load the i18n bundle at nls/colors, see that it is a root/master
 * bundle since it does not have a locale in its name. It will then try to find
 * the best match locale available in that master bundle, then request all the
 * locale pieces for that best match locale. For instance, if the locale is 'en-us',
 * then the plugin will ask for the 'en-us', 'en' and 'root' bundles to be loaded
 * (but only if they are specified on the master bundle).
 *
 * Once all the bundles for the locale pieces load, then it mixes in all those
 * locale pieces into each other, then finally sets the context.defined value
 * for the nls/colors bundle to be that mixed in locale.
 *
 * 2) A regular module specifies a specific locale to load. For instance,
 * i18n!nls/fr-fr/colors. In this case, the plugin needs to load the master bundle
 * first, at nls/colors, then figure out what the best match locale is for fr-fr,
 * since maybe only fr or just root is defined for that locale. Once that best
 * fit is found, all of its locale pieces need to have their bundles loaded.
 *
 * Once all the bundles for the locale pieces load, then it mixes in all those
 * locale pieces into each other, then finally sets the context.defined value
 * for the nls/fr-fr/colors bundle to be that mixed in locale.
 */
(function() {
	'use strict';

	//regexp for reconstructing the master bundle name from parts of the regexp match
	//nlsRegExp.exec('foo/bar/baz/nls/en-ca/foo') gives:
	//['foo/bar/baz/nls/en-ca/foo', 'foo/bar/baz/nls/', '/', '/', 'en-ca', 'foo']
	//nlsRegExp.exec('foo/bar/baz/nls/foo') gives:
	//['foo/bar/baz/nls/foo', 'foo/bar/baz/nls/', '/', '/', 'foo', '']
	//so, if match[5] is blank, it means this is the top bundle definition.
	var nlsRegExp = /(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/;

	//Helper function to avoid repeating code. Lots of arguments in the
	//desire to stay functional and support RequireJS contexts without having
	//to know about the RequireJS contexts.
	function addPart(locale, master, needed, toLoad, prefix, suffix) {
		if(master[locale]) {
			needed.push(locale);
			if(master[locale] === true || master[locale] === 1) {
				toLoad.push(prefix + locale + '/' + suffix);
			}
		}
	}

	function addIfExists(req, locale, toLoad, prefix, suffix) {
		var fullName = prefix + locale + '/' + suffix;
		if(require._fileExists(req.toUrl(fullName + '.js'))) {
			toLoad.push(fullName);
		}
	}

	/**
	 * Simple function to mix in properties from source into target,
	 * but only if target does not already have a property of the same name.
	 * This is not robust in IE for transferring methods that match
	 * Object.prototype names, but the uses of mixin here seem unlikely to
	 * trigger a problem related to that.
	 */
	function mixin(target, source, force) {
		var prop;
		for(prop in source) {
			if(source.hasOwnProperty(prop) && (!target.hasOwnProperty(prop) || force)) {
				target[prop] = source[prop];
			} else if(typeof source[prop] === 'object') {
				if(!target[prop] && source[prop]) {
					target[prop] = {};
				}
				mixin(target[prop], source[prop], force);
			}
		}
	}

	define("i18n", ['module'], function(module) {
		var masterConfig = module.config ? module.config() : {};

		return {
			version: '2.0.6',
			/**
			 * Called when a dependency needs to be loaded.
			 */
			load: function(name, req, onLoad, config) {
				config = config || {};

				if(config.locale) {
					masterConfig.locale = config.locale;
				}

				var masterName,
					match = nlsRegExp.exec(name),
					prefix = match[1],
					locale = match[4],
					suffix = match[5],
					parts = locale.split('-'),
					toLoad = [],
					value = {},
					i, part, current = '';

				//If match[5] is blank, it means this is the top bundle definition,
				//so it does not have to be handled. Locale-specific requests
				//will have a match[4] value but no match[5]
				if(match[5]) {
					//locale-specific bundle
					prefix = match[1];
					masterName = prefix + suffix;
				} else {
					//Top-level bundle.
					masterName = name;
					suffix = match[4];
					locale = masterConfig.locale;
					if(!locale) {
						locale = masterConfig.locale =
							typeof navigator === 'undefined' ? 'root' :
							((navigator.languages && navigator.languages[0]) ||
								navigator.language ||
								navigator.userLanguage || 'root').toLowerCase();
					}
					parts = locale.split('-');
				}

				if(config.isBuild) {
					//Check for existence of all locale possible files and
					//require them if exist.
					toLoad.push(masterName);
					addIfExists(req, 'root', toLoad, prefix, suffix);
					for(i = 0; i < parts.length; i++) {
						part = parts[i];
						current += (current ? '-' : '') + part;
						addIfExists(req, current, toLoad, prefix, suffix);
					}

					req(toLoad, function() {
						onLoad();
					});
				} else {
					//First, fetch the master bundle, it knows what locales are available.
					req([masterName], function(master) {
						//Figure out the best fit
						var needed = [],
							part;

						//Always allow for root, then do the rest of the locale parts.
						addPart('root', master, needed, toLoad, prefix, suffix);
						for(i = 0; i < parts.length; i++) {
							part = parts[i];
							current += (current ? '-' : '') + part;
							addPart(current, master, needed, toLoad, prefix, suffix);
						}

						//Load all the parts missing.
						req(toLoad, function() {
							var i, partBundle, part;
							for(i = needed.length - 1; i > -1 && needed[i]; i--) {
								part = needed[i];
								partBundle = master[part];
								if(partBundle === true || partBundle === 1) {
									partBundle = req(prefix + part + '/' + suffix);
								}
								mixin(value, partBundle);
							}

							//All done, notify the loader.
							onLoad(value);
						});
					});
				}
			}
		};
	});
}());

/**
 * **********************************************************************************************************
 * xishan
 * **********************************************************************************************************
 */
//TODO xs

//ie9
try {
	if(Function.prototype.bind && console && typeof console.log == "object") {
		["log", "info", "warn", "error", "assert", "dir", "clear", "profile", "profileEnd"]
		.forEach(function(method) {
			console[method] = this.call(console[method], console);
		}, Function.prototype.bind);
	}
} catch(e) {
	try {
		window.console = {
			log: function() {}
		};
	} catch(e) {}
}

try {
	(function() {
		var isXsMsgDebug = false;
		var api = {};

		function isDebug(type) {
			return isXsMsgDebug;
		}

		api.linkedList = function() {
			return new LinkedList();
		};

		function LinkedList() {
			function newNode(element) {　　
				var node = {
					element: element,
					next: null,
					pre: null
				};
				return node;
			};
			var length = 0;
			var headNode = newNode(),
				lastNode = headNode;

			this.append = function(element) {　　
				var current = newNode(element);　　　　

				lastNode.next = current;
				current.pre = lastNode;
				lastNode = current;　　
				length++;
			};

			//在链表的任意位置插入元素
			this.insert = function(position, element) {　　
				if(position >= 0 && position <= length) {

					var node = newNode(element);
					var pNode = headNode;
					while(position--) {
						pNode = pNode.next;
					}

					if(pNode.next) {
						pNode.next.pre = node;
						node.next = pNode.next;
					}
					pNode.next = node;
					node.pre = pNode;　　　　
					length++;
					return true;　　
				} else {　　　　
					return false;　　
				}
			};

			this.elementAt = function(position) {
				return getElement(position);
			};

			function getElement(position, willRemove) {　　
				if(position >= 0 && position < length) {

					var pNode = headNode;
					while(position--) {
						pNode = pNode.next;
					}

					if(pNode.next) {
						var currentNode = pNode.next;
						if(willRemove) {
							var nextCurrentNode = currentNode.next;
							if(nextCurrentNode) {
								nextCurrentNode.pre = pNode;
								pNode.next = nextCurrentNode;
							} else {
								pNode.next = null;
								lastNode = pNode;
							}
							length--;
						}
						return currentNode.element;
					} else {
						return undefined;
					}　
				} else {　　　　
					return undefined;　　
				}
			};

			/**
			 * @param callback function 返回true表示移除
			 */
			this.eachForRemove = function(callback) {
				var pNode = headNode.next;
				while(pNode) {
					var currentNode = pNode;
					if(callback(currentNode)) {
						var nextCurrentNode = currentNode.next;
						if(nextCurrentNode) {
							nextCurrentNode.pre = pNode;
							pNode.next = nextCurrentNode;
						} else {
							pNode.next = null;
							lastNode = pNode;
						}
						length--;
						pNode = nextCurrentNode;
					} else {
						pNode = pNode.next;
					}
				}
			};

			//从链表中移除元素
			this.removeAt = function(position) {　　
				return getElement(position, true);
			};

			/**
			 * @param callback function(elem,index)
			 */
			this.pop = function(callback) {
				return this.removeAt(0)
			};

			/**
			 * 返回元素在链表中的位置
			 * @param element object|function(elem)
			 */
			this.indexOf = function(element) {　　
				var pNode = headNode.next;
				var index = 0;
				while(pNode) {
					if(typeof element == "function") {
						if(element(pNode.element)) {
							return index;
						}
					} else if(pNode.element === element) {
						return index;
					}
					index++;
					pNode = pNode.next;
				}
				return -1;
			};

			this.find = function(element) {
				var index = this.indexOf(element);
				return index >= 0 ? this.elementAt(index) : undefined;
			}

			//移除某个元素
			this.remove = function(element) {　　
				var index = this.indexOf(element);　　
				return this.removeAt(index);
			};

			//判断链表是否为空

			this.isEmpty = function() {　　
				return length === 0;
			};

			//返回链表的长度
			this.size = function() {
				return length;
			};

		};

		var randId = window.randId || (function() {
			var idCount = 1991;
			//生成一个随机的id，只保证在本页面是唯一的
			return function(suffix) {
				var id = Math.random() + "_" + new Date().getTime() + "_id_" + (idCount++);
				if(suffix !== undefined) {
					id += suffix;
				}
				id = "_" + id.substr(2);
				return id;
			};
		})();

		var xsParseJson = window.xsParseJson || function(str) {
			if(str === "" || str === null || str === undefined) {
				return null;
			}
			try {
				return eval("(" + str + ")");
			} catch(e) {
				try {
					return JSON.parse(str);
				} catch(e) {
					console.log(e);
					return null;
				}
			}
		};

		var xsJson2String = window.xsJson2String || function(obj) {
			return JSON.stringify(obj);
		};

		var postMessageBridge = (function() {
			var handle = {};
			var listeners = {};
			var activeListenerMyIds = {}; //inactiveUniqueId:[id]

			//callback:function(data,source,origin,type,optionData)
			//isActive为false表示被动者,被动者是根据cmd发送、且发给所有的，主动者根据id发送.
			handle.listen = function(cmd, callback, isActive) {
				var id = isActive ? randId() : cmd;
				var listener = {
					callback: callback,
					cmd: cmd,
					active: isActive
				};
				listeners[id] = listener;
				if(!isActive) {
					listener.uniqueId = randId();
				}
				return id;
			};

			handle.remove = function(id) {
				var listener = listeners[id];
				delete listeners[id];
				if(listener.active) {
					for(var x in activeListenerMyIds) {
						var as = activeListenerMyIds[x];
						var found = false;
						for(var k = 0; k < as.length; k++) {
							if(as[k] == id) {
								as.splice(k, 1);
								found = true;
								break;
							}
						}
						if(found) {
							break;
						}
					}
				}

			};
			handle.send = function(id, data, source, origin) {
				var listener = listeners[id];
				var optionData = {
					uniqueId: listener.uniqueId
				};
				_send(id, data, source, origin, "msg", optionData);
			};

			function _send(id, data, source, origin, type, optionData) {
				var listener = listeners[id];
				if(!listener) {
					return;
				}
				var msg = {
					data: data,
					cmd: listener.cmd,
					active: listener.active,
					optionData: optionData,
					uniqueId: listener.uniqueId
				};
				if(type) {
					msg.type = type;
				}
				if(isDebug("postMessageBridge")) {
					console.log("send from:" + location.href);
					console.log(msg);
				}
				source.postMessage(xsJson2String(msg), origin);
			};

			handle.sendConn = function(id, data, source, origin, conndata) {
				var optionData = {
					thatId: id,
					conndata: conndata
				};
				_send(id, data, source, origin, "conn", optionData);
			};

			handle.sendConned = function(id, data, source, origin, thatOptionData, conndata) {
				var listener = listeners[id];
				var optionData = {
					myId: thatOptionData.thatId,
					conndata: conndata
				};
				_send(id, data, source, origin, "conned", optionData);
			};

			handle.sendResponse = function(id, data, source, origin) {
				_send(id, data, source, origin, "response")
			};

			window.addEventListener('message', function(event) {
				//TODO 跨域origin控制 if(event.origin !== '') return;

				if(isDebug("postMessageBridge")) {
					console.log("receive from:" + event.origin + ",current:" + location.href);
					console.log(event.data);
				}

				var data = xsParseJson(event.data);
				if(!data) {
					return;
				}

				var cmd = data.cmd;
				var cmdData = data.data;
				var active = data.active;
				var type = data.type;
				var optionData = data.optionData;

				if(type == "conned") {
					var uniqueId = data.uniqueId;
					var myId = data.optionData.myId;
					var as = activeListenerMyIds[uniqueId];
					if(!as) {
						as = [];
						activeListenerMyIds[uniqueId] = as;
					}
					as.push(myId);
				}

				if(active) { //来自于主动者,则my:id==cmd
					var myId = cmd;
					try {
						var listener = listeners[myId];
						var callback = listener ? listener.callback : null;
						if(callback) {
							var source = event.source;
							var origin = event.origin;
							callback(cmdData, source, origin, type, optionData);
						}
					} catch(e) {
						console.log(e);
					}
				} else { //来自于被动者（后发消息者），则my:id要从activeListenerMyIds中取
					var ids = activeListenerMyIds[data.uniqueId];
					if(ids) {
						for(var i = 0; i < ids.length; i++) {
							var myId = ids[i];
							try {
								var listener = listeners[myId];
								var callback = listener ? listener.callback : null;
								if(callback) {
									var source = event.source;
									var origin = event.origin;
									callback(cmdData, source, origin, type, optionData);
								}
							} catch(e) {
								console.log(e);
							}
						}
					} else {
						if(isDebug("postMessageBridge")) {
							console.log("active handle for cmd '" + cmd + "' is null!");
						}
					}
				}

			}, false);

			handle.runAfter = function(time, callback) {
				setTimeout(callback, time);
			};

			return handle;
		})();

		function CommunicationUnit(cmd, source, origin, isActive, conndata) {
			var msgQueue = api.linkedList();
			var receiveCacheList = api.linkedList();

			var MAX_TRY = 100,
				SLEEP = 500;
			var RECEIVE_CACHE_TIME = 20 * SLEEP + MAX_TRY * SLEEP;
			var isChecking = false;
			var isConnected = false,
				connectCount = 0;

			/**
			 * 如果已经接收过,则返回true.
			 * @param {Object} msg
			 */
			function cacheReceive(msg) {
				var id = msg.id;
				var ele = receiveCacheList.find(function(element) {
					return element.id = id;
				});
				if(isDebug("CommunicationUnit")) {
					console.log("received before:");
					console.log(ele);
				}
				var cached = ele ? true : false;
				if(!cached) {
					receiveCacheList.append({
						id: id,
						time: new Date().getTime()
					});
				}

				var time = new Date().getTime();
				//移除超时的接收缓存
				receiveCacheList.eachForRemove(function(element) {
					var willRemove = time - element.time > RECEIVE_CACHE_TIME;
					return willRemove;
				});

				return cached;
			};

			var thiz = this;

			this.onConnectedListener = null;
			this.onReceiveListener = null;
			this.send = function(data) {
				var msg = {
					id: randId(),
					data: data
				};
				msgQueue.append(msg);
				sendTop();
			};

			this.send.release = function() {
				postMessageBridge.remove(handleId);
			};

			var handleId = postMessageBridge.listen(cmd, function(msg, _source, _origin, type, optionData) {
				if(type == "conn") { //发起连接
					source = _source;
					origin = _origin;
					isConnected = true;
					postMessageBridge.sendConned(handleId, { //确认连接
						conned: true
					}, source, origin, optionData, conndata);
					if(thiz.onConnectedListener) {
						thiz.onConnectedListener.call(thiz, optionData.conndata);
					}
					sendTop();
				} else if(type == "conned") { //已经连接
					isConnected = true;
					if(thiz.onConnectedListener) {
						thiz.onConnectedListener.call(thiz, optionData.conndata);
					}
					sendTop();
				} else if(type == "response") { //消息回复,移除消息
					msgQueue.remove(function(elem) {
						return elem.id = msg.id;
					});
					sendTop();
				} else { //收到消息

					//var receivedBefore = cacheReceive(msg);

					//if(!receivedBefore) { //防止重复接收
					if(thiz.onReceiveListener) {
						thiz.onReceiveListener.call(thiz, msg.data);
					}
					//}

					postMessageBridge.sendResponse(handleId, { //回应已经收到
						response: true,
						id: msg.id
					}, source, origin);

				}
			}, isActive);

			function sendTop() {
				if(isConnected) {
					var msg = msgQueue.pop();
					if(msg) {
						postMessageBridge.send(handleId, msg, source, origin);
						postMessageBridge.runAfter(SLEEP, init);
					}
				}
			}

			function init() {
				if(isConnected || connectCount > MAX_TRY) {
					return;
				}
				postMessageBridge.sendConn(handleId, {
					conn: true
				}, source, origin, conndata);
				connectCount++;
				postMessageBridge.runAfter(SLEEP, init);
			}
			if(source) {
				init();
			}

			this.setSource = function(_source) {
				source = _source;
				if(source) {
					init();
				}
			};
		}

		var handle = api;

		/**
		 * 
		 * @param {Object} winObjOrCallback
		 * @param {Object} cmd
		 * @param {Object} connectedCallback function(sender)
		 * @param {Object} receiveCallback function(data,sender)|function(sender,data)
		 * @param {Object} notActive
		 */
		function _connectWindow(winObjOrCallback, option, notActive) {
			option = option || {};
			var myOption = {
				cmd: option.cmd,
				listener: option.listener,
				connected: option.connected,
				conndata: option.conndata
			};
			if(myOption.cmd === undefined) {
				myOption.cmd = null;
			}
			if(myOption.listener === undefined) {
				myOption.listener = null;
			}
			if(myOption.connected === undefined) {
				myOption.connected = null;
			}
			if(myOption.conndata === undefined) {
				myOption.conndata = null;
			}

			option = myOption;

			var cmd = option.cmd;
			var connectedCallback = option.connected;
			var receiveCallback = option.listener;
			var conndata = option.conndata;

			var isActive = !notActive;
			//TODO 跨域origin
			var origin = "*";

			var unit;
			if(typeof winObjOrCallback == "function") {
				unit = new CommunicationUnit(cmd, null, origin, isActive, conndata);
			} else {
				unit = new CommunicationUnit(cmd, winObjOrCallback, origin, isActive, conndata);
			}

			if(connectedCallback) {
				unit.onConnectedListener = function(conndata) {
					try {
						connectedCallback(this.send, conndata);
					} catch(e) {
						console.log(e);
					}
				};
			}
			if(receiveCallback) {
				unit.onReceiveListener = function(data) {
					try {
						receiveCallback(data, this.send);
					} catch(e) {
						console.log(e);
					}
				};
			}
			if(typeof winObjOrCallback == "function") {
				winObjOrCallback(function(winObj) {
					unit.setSource(winObj);
				});
			}

			return unit.send;
		}

		function _connectIFrame(iframe, option) {
			var winObj;
			if(typeof iframe == "string") {
				//iframe = $(iframe)[0];
				winObj = function(callback) {
					$(iframe).on("load", function() {
						callback(this.contentWindow);
					});
				};
			} else {
				winObj = iframe.contentWindow;
			}
			return _connectWindow(winObj, option);

		};

		/**
		 * 用于连接iframe.
		 * @param {Object} iframe iframe或selector
		 * @param {Object} option
		 * @return 返回sender
		 */
		handle.connectIFrame = function(iframe, option) {
			return _connectIFrame(iframe, option);
		};

		/**
		 * 用于连接父页面.
		 * @param {Object} option
		 * @return 返回sender
		 */
		handle.connectParent = function(option) {
			return _connectWindow(window.parent, option);
		};

		/**
		 * 用于连接顶层页面.
		 * @param {Object} option
		 * @return 返回sender
		 */
		handle.connectTop = function(option) {
			return _connectWindow(window.top, option);
		};

		/**
		 * 用于连接打开者.
		 * @param {Object} option
		 * @return 返回sender
		 */
		handle.connectOpener = function(option) {

			return _connectWindow(window.opener, option);
		};

		/**
		 * 用于监听其他页面发送消息.
		 * @param {Object} option
		 * @return 返回一个sender
		 */
		handle.listenMessage = function(option) {
			return _connectWindow(null, option, true);
		};

		api.justConnectIFrame = function(src, cmd, connData) {
			var handle = {};

			var _listener;
			var sender, iframe;

			handle.listen = function(listener) {
				_listener = listener;
				return this;
			};

			handle.done = function() {
				this.release();
				iframe = $("<iframe>", {
					src: src,
					style: "display:none;"
				}).appendTo(document.body);

				sender = api.connectIFrame(iframe[0], {
					cmd: cmd,
					conndata: connData,
					listener: function(data, sender) {
						if(_listener) {
							_listener.call(handle, data, sender);
						}
					}
				});
				return this;

			};

			handle.send = function(data) {
				sender(data);
				return this;
			}

			handle.release = function() {
				if(iframe) {
					iframe.remove();
					sender.release();
				}
				iframe = null;
				sender = null;
				return this;
			};

			return handle;
		};
		api.debug = function(isDebug) {
			isXsMsgDebug = isDebug;
		};

		/**
		 * option参数
		 * cmd: 
		 * listener: function(data,sender)
		 * connected:function(sender,conndata)
		 * conndata:
		 */

		window.xsPageMessage = api;
		define("xsmsg", api);
	})();
} catch(e) {
	console.log(e);
}

try {
	if(typeof requirejsOnError == "function") {
		requirejs.onError = requirejsOnError;
	}
} catch(e) {

}
try {
	_xishanSCLoad();
} catch(e) {
	if(typeof xsSCLoaderErr == "function") {
		xsSCLoaderErr(e);
	}
}
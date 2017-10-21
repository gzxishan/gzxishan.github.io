define({
	load: function(name, req, onload, config) {
		var that = this._handle_;

		function replaceCode(txt, baseUrl) {
			var all = require('all');

			function replaceUrl(txt, baseUrl) {
				//内容替换
				var replaceReg = new RegExp('\\$url\\(([^\\)]+)\\)');
				var strs = [];
				while(true) {
					var rs = replaceReg.exec(txt);
					if(!rs) {
						strs.push(txt);
						break;
					} else {

						var value = rs[1];
						var url = getPathWithRelative(baseUrl, value);

						strs.push(txt.substring(0, rs.index));
						strs.push(url);
						txt = txt.substring(rs.index + rs[0].length);
					}
				}
				return strs.join('');
			}

			function replaceXs(txt, baseUrl) {
				//内容替换
				var replaceReg = new RegExp('\\$xs\\(([^\\)]+)\\)');
				var strs = [];
				while(true) {
					var rs = replaceReg.exec(txt);
					if(!rs) {
						strs.push(txt);
						break;
					} else {

						var xs = rs[1];
						strs.push(txt.substring(0, rs.index));
						strs.push(all.getObjectAttr(xsSC, xs));
						txt = txt.substring(rs.index + rs[0].length);
					}
				}
				return strs.join('');
			}
			txt = replaceXs(txt, baseUrl);
			txt = replaceUrl(txt, baseUrl);
			return txt;
		}

		function doReplace(txt, baseUrl) {
			txt = replaceCode(txt, baseUrl);
			var replaceArray = [];
			var handle = {};

			//内容替换
			var replaceReg = new RegExp('_url_="([^"\']+)"');
			var strs = [];
			while(true) {
				var rs = replaceReg.exec(txt);
				if(!rs) {
					strs.push(txt);
					break;
				} else {
					var id = randId();
					var value = rs[1];
					var type;
					if(startsWith(value, "html:")) {
						type = "html";
						value = value.substring(5);
					} else if(startsWith(value, "code:")) {
						type = "code";
						value = value.substring(5);
					} else {
						type = "text";
					}
					var url = getPathWithRelative(baseUrl, value);
					replaceArray.push({
						id: id,
						url: url,
						type: type
					});
					strs.push(txt.substring(0, rs.index));
					strs.push('id="' + id + '"');
					txt = txt.substring(rs.index + rs[0].length);
				}
			}
			handle.result = strs.join('');
			handle.replace = function() {
				function replaceContent(item) {
					that.require(["text!" + item.url], function(content) {
						if(item.type == "html") {
							$("#" + item.id).append(content);
						} else if(item.type == "code") {
							$("#" + item.id).text(content);
							hljs.highlightBlock($("#" + item.id)[0]);
						} else {
							$("#" + item.id).text(content);
						}
					});
				}

				for(var i = 0; i < replaceArray.length; i++) {
					replaceContent(replaceArray[i]);
				}
			};
			return handle;
		};

		that.require(["all"], function(all) {
			that.require(["text!" + req.toUrl(name)], function(data) {
				data = xsParseJson(data);
				if(data.sidesAutoOrder === undefined || data.sidesAutoOrder) {
					for(var i = 0; i < data.sides.length; i++) {
						data.sides[i].indexLabel = (i + 1) + ".";
					}
				}

				function hrefWithouHash(href) {
					href = href || location.href;
					if(href.lastIndexOf("#") >= 0) {
						href = href.substring(0, href.lastIndexOf("#"));
					}
					return href;
				}

				function saveLastPage(hrefKey) {
					if(hrefKey && !startsWith(hrefKey, "#")) {
						if(!(startsWith(hrefKey, "//") || startsWith(hrefKey, "http:") || startsWith(hrefKey, "https:"))) {
							if(startsWith(hrefKey, "/")) {
								hrefKey = location.protocol + "//" + location.host + hrefKey;
							} else {
								hrefKey = getPathWithRelative(location.href, hrefKey);
							}
						}
						hrefKey = hrefWithouHash(hrefKey);
						all.lsave(hrefKey, {
							lastHref: location.href
						});
					}
				};

				function getLastPage() {
					return all.lget(hrefWithouHash());
				};

				window._onBack_ = function() {
					history.back();
				};

				window._onLastPage_ = function() {
					var last = getLastPage();
					if(last) {
						location.href = last.lastHref;
					}
				};

				if(data._back === undefined) {
					data._back = function() {
						var as = [];
						as.push('<a style="cursor:pointer;display:inline;margin:0 5px;padding:5px 10px;" onclick="javascript:_onBack_();">返回</a>');
						as.push('<a style="cursor:pointer;display:inline;margin:0 5px;padding:5px 10px;" onclick="javascript:location.href=xsSC.properties.contextName+\'/\'">首页</a>');
						if(getLastPage()) {
							as.push('<a style="cursor:pointer;display:inline;margin:0 5px;padding:5px 10px;" onclick="javascript:_onLastPage_();">上一级</a>');

						}
						return '<li style="text-align:center;">' + as.join('') + '</li>';
					};
				}

				data._html = function() {
					if(this.html) {
						return replaceCode(this.html, req.toUrl(name));
					}
				};
				data._detail = function() {
					if(this.detail) {
						return '<a href="' +
							getPathWithRelative(req.toUrl(name), this.detail) + '">详情...</a>'
					}
				};
				data._url = function() {
					if(this.url) {
						var id = randId();
						var thatUrl = getPathWithRelative(req.toUrl(name), this.url);
						that.require(["text!" + thatUrl], function(txt) {
							var replaceHandle = doReplace(txt, thatUrl);
							$("#" + id).append($(replaceCode(replaceHandle.result, thatUrl)));
							replaceHandle.replace();
						});

						var div = $("<div>", {
							id: id,
							"class": "demo-page-content"
						});

						return div.prop("outerHTML");
					} else {
						return "";
					}
				};
				$(function() {
					$(document.body).addClass("left-sidebar");
					if(data.title) {
						document.title = data.title;
					}
					all.tpl({
						data: data,
						path: "./tpl/page.html",
						onOk: function(result) {

							var replaceHandle = doReplace(result, req.toUrl(name));

							$(document.body).append($(replaceCode(replaceHandle.result, req.toUrl(name))));
							hljs.initHighlightingOnLoad();
							replaceHandle.replace();

							setTimeout(function() {
								all.tryCall(function() {
									if(location.hash) {
										location.href = location.hash;
										$("a[href=" + location.hash + "]").addClass("active");
									}
								});
								all.tryCall(function() {
									$("a[href]").click(function() {
										if($(this).attr("data-preparing")) {
											alert($(this).attr("data-preparing"));
											return false;
										}
										var href = $(this).attr("href");
										saveLastPage(href);
									});
								});
								$(document.body).css("visibility", "visible");
								$("#nav").find("a").click(function() {
									$("#nav").find("a").removeClass("active");
									$(this).addClass("active");
								});
							}, 100);

							onload();
						}
					}).done();

				});

			});
		});
	}
})
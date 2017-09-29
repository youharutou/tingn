/**
 * jQuery Tingn plugin
 *
 * @author youharutou, 2016.05.18
 * 
 * Copyright (c) 2016 youharutou
 * 
 * Version:  1.0.0
 * 
 */

(function(window, $){
	'use strict';
	
	var originHTML, 
	    datas, 
	    field,  //保存每个解析出来的代码块的起始位置、结束位置、解析结果和编译结果
		key = ["a", "b", "c", "d", "e", "f"],  //编译for循环时key的取值
		innerFunctions = ["empty", "odd", "even"];  //内建函数列表
		
	
	//主编译器
	function mainCompiler(){
		var compileContent;  //编译内容
		var compileIndex;  //编译指针，标示当前编译的位置
		var forCount;  //记录for循环层级
		var forVariableName;  //保存每个for循环item变量的名称和层级[{name: "aa", level: 1}],编译到一个for就push这个for的信息，编译完后从末尾删除
		var jsContainer;  //最终编译出来的js命令
		var htmlContainer;  //最终编译出来的模板
		var fragment;  //编译前由指令分割的模板碎片
		var overlapFuntion = checkDataKeys();  //保存与datas的key发生重叠的内建函数名，编译if指令时会用到
		var loop = {};  //for循环内部的loop对象,以每层for的item的名称为key
		var objectIndex = [];  //保存Object对象for循环时的索引(0,1,2...,并不是key名称),以forCount为key
		var reg = /({%\s*.+?(?!{%)\s*%}|{{.+?}})/g;
		for(var i = 0, len = field.length; i < len; i++){
			compileContent = field[i].analysisResult;
			compileDirective();
		}
		
		//编译指令
		function compileDirective(){
			compileIndex = 0;
			forCount = 0;
			forVariableName = [];
			jsContainer = [];
			htmlContainer = [];
			fragment = splitString();
			var result;
			while((result = reg.exec(compileContent)) != null){  //查找一个个的指令，如{% for a in b %}、{% if a %}、{% endfor %}、{% endif %}、{{a}}等
				compileIndex++;
				var directive = result[0];
				switch(true){
					case /{%\s*if/.test(directive):
					    compileIfDirective(directive);  //编译if指令
						break;
					case /{%\s*for/.test(directive):
					    compileForDirective(directive);  //编译for指令
						break;
					case /endfor/.test(directive):
					    forCount--;
						forVariableName.pop();
					    var js = fragment[compileIndex] != '' ? ('htmlContainer.push("' + fragment[compileIndex].replace(/"/g, '\\"') + '");') : '';
					    jsContainer.push('}' + js);
						break;
					case /endif/.test(directive):
					    var js = fragment[compileIndex] != '' ? ('htmlContainer.push("' + fragment[compileIndex].replace(/"/g, '\\"') + '");') : '';
					    jsContainer.push('}' + js);
						break;
					case /elseif/.test(directive):
						compileIfDirective(directive, 1);
						break;
					case /else\s*%}/.test(directive):
						var js = fragment[compileIndex] != '' ? ('htmlContainer.push("' + fragment[compileIndex].replace(/"/g, '\\"') + '");') : '';
					    jsContainer.push('}else{' + js);
						break;
					default:
					    compileVariable(directive);  //编译变量
				}
			}
			executeDirective();  //编译完后执行
		}
		
		//以指令为分隔符分割html
		function splitString(){
			var arr = compileContent.split(/{%\s*.+?(?!{%)\s*%}/g);
			var tempArr = [];
			for(var i = 0, len = arr.length; i < len; i++){
				tempArr.push(arr[i]);
				if(/{{/.test(arr[i])){
					var tmp = arr[i].split(/{{.+?}}/g);
					tmp.unshift(tempArr.length - 1, 1);
					tempArr.splice.apply(tempArr, tmp);
				}
			}
			return tempArr;
		}
		
		//检查datas的key是否和内建函数名称重叠
		function checkDataKeys(){
			var arr = [];
			for(var i = 0, len = innerFunctions.length; i < len; i++){
				for(var key in datas){
					if(innerFunctions[i].search(key) != -1){
						arr.push(innerFunctions[i]);
						break;
					}
				}
			}
			return arr;
		}
		
		//编译if指令
		function compileIfDirective(directive){
			var creg = arguments.length > 1 ? /(^{%\s*elseif\s+|\s*%}$)/g : /(^{%\s*if\s+|\s*%}$)/g;
			directive = directive.replace(creg, "");
			var replaceLen = 0;
			var replaceInfo = [];  //保存替换变量的信息，包括在什么位置替换哪个字符串，用什么替换
			var matchingFunction = {};  //保存该if指令中使用到的内建函数名及其位置，用于在匹配变量名时判断变量名是否介于内建函数名之内
			var result;
			for(var i = 0, len = overlapFuntion.length; i < len; i++){
				var reg1 = new RegExp(overlapFuntion[i], "g");
				var res;
				while((res = reg1.exec(directive)) != null){
					matchingFunction[res.index] = overlapFuntion[i];
				}
			}
			for(var key in datas){  //这里只替换普通变量，因为for循环里面的item变量是不需要替换
				var reg2 = new RegExp(key, "g");
				while((result = reg2.exec(directive)) != null){
					var cdt = false;
					for(var name in matchingFunction){
						if((result.index - name) >= 0 && (result.index - name) <= (matchingFunction[name].length - result[0].length)){  //找到的变量名介于内建函数名之内时
							cdt = true;
							break;
						}
					}
					if(empty(matchingFunction) || !cdt){  //指令中没有使用内建函数，或者使用了内建函数但变量名没有介于函数名之间
						if(/\./.test(directive)){
							if(directive.charAt(result.index + key.length) == "."){  //找到的结果后一位是.，可以直接覆盖，如果这里外部传入了loo变量，则以外部优先，这里将覆盖loop
								var temp = [];
								temp.push(result.index);
								temp.push(key);
								temp.push('datas["' + key + '"]');
								replaceInfo.push(temp);
							}
							else {
								var character = directive.charAt(result.index - 1);
								if(character == "" || /[^\.\w]/.test(character)){  //看找到的结果前一位是否是\w或.，如果是则为二级属性应忽略，否则覆盖
									var temp = [];
									temp.push(result.index);
									temp.push(key);
									temp.push('datas["' + key + '"]');
									replaceInfo.push(temp);
								}
							}
						}
						else {  //如果没有.，则直接覆盖
							var temp = [];
							temp.push(result.index);
							temp.push(key);
							temp.push('datas["' + key + '"]');
							replaceInfo.push(temp);
						}
					}
				}
			}
			//对replaceInfo进行由小到大的排序
			replaceInfo.sort(function(a1, a2){
				return a1[0] - a2[0];
			});
			//对表达式directive进行变量名替换
			for(var i = 0, len = replaceInfo.length; i < len; i++){
				var part1 = directive.slice(0, replaceInfo[i][0] + replaceLen);
				var part2 = directive.slice(replaceInfo[i][0] + replaceLen + replaceInfo[i][1].length);
				directive = part1 + replaceInfo[i][2] + part2;
				replaceLen += replaceInfo[i][2].length - replaceInfo[i][1].length;
			}
			//对loop对象的处理
			if(/loop/.test(directive)){
				if(forCount == 0){
					throw new Error("变量 'loop' 未定义");
				}
				/*验证是否在外层for循环使用了内层for循环的loop对象*/
				var reg3 = /loop\[['"]\w+['"]\]/g;
				while((result = reg3.exec(directive)) != null){
					var exist = false;
					var loopKey = result[0].replace(/(^loop\[['"]|['"]\]$)/g, "");
					for(var i = 0, len = forVariableName.length; i < len; i++){
						if(forVariableName[i].name == loopKey){
							if(forVariableName[i].level > forCount || (forVariableName[i].level == forCount && loopKey != forVariableName[forVariableName.length - 1].name)){
								throw new Error("变量 '" + result[0] + "' 未定义");
							}
							exist = true;
							break;
						}
					}
					if(!exist){
						throw new Error("变量 '" + result[0] + "' 未定义");
					}
				}
				/*验证完毕*/
				directive = directive.replace(/loop(?!\[)/g, 'loop["' + forVariableName[forVariableName.length - 1].name + '"]');  //对后面没有紧跟'['的loop执行全局替换
			}
			var js = fragment[compileIndex] != '' ? ('htmlContainer.push("' + fragment[compileIndex].replace(/"/g, '\\"') + '");') : '';
			var cmd = arguments.length > 1 ? '}else if(' : 'if(';
			jsContainer.push(cmd + directive + '){' + js);
		}
		
		//编译for指令
		function compileForDirective(directive){
			directive = directive.replace(/(^{%\s*for\s+|\s*%}$)/g, "");
			var arr = directive.split(/\s+in\s+/);
			if(/\./.test(arr[1])){
				var tmp = arr[1].split(/\./g);
				tmp.unshift(1, 1);
				arr.splice.apply(arr, tmp);
			}
			var item = arr[0];
			var data = arr[1];
			var cmd = '';
			var notUseForVar = true;
			for(var i = 0, len = forVariableName.length; i < len; i++){
				if(forVariableName[i].name == data){
					notUseForVar = false;
				}
			}
			if(notUseForVar && !datas.hasOwnProperty(data)){
				throw new Error("变量 '" + data + "' 未定义");
			}
			if(datas.hasOwnProperty(data)){
				data = 'datas["' + data + '"]';
			}
			if(arr.length > 2){
				data = data + '.' + arr.slice(2).join(".");
			}
			cmd += 'if(!(' + data + ' instanceof Array)){objectIndex[' + forCount + '] = 0;}';
			cmd += 'for(var ' + key[forCount] + ' in ' + data + '){';
			cmd += 'var ' + item + ' = ' + data + '[' + key[forCount] + '];';
			cmd += 'loop["' + item + '"] = {};';
			cmd += 'loop["' + item + '"].index = (' + data + ' instanceof Array && "length" in ' + data + ') ? ' + key[forCount] + ' : objectIndex[' + forCount + '];';
			cmd += 'loop["' + item + '"].length = getLength(' + data + ');';
			cmd += 'loop["' + item + '"].first = (' + data + ' instanceof Array && "length" in ' + data + ') ? ' + key[forCount] + ' == 0 : objectIndex[' + forCount + '] == 0;';
			cmd += 'loop["' + item + '"].last = (' + data + ' instanceof Array && "length" in ' + data + ') ? ' + key[forCount] + ' == loop["' + item + '"].length - 1 : objectIndex[' + forCount + '] == loop["' + item + '"].length - 1;';
			cmd += 'if(!(' + data + ' instanceof Array)){objectIndex[' + forCount + ']++;}';
			cmd += fragment[compileIndex] != '' ? ('htmlContainer.push("' + fragment[compileIndex].replace(/"/g, '\\"') + '");') : '';
			jsContainer.push(cmd);
			forCount++;
			var varNameObj = {};
			varNameObj.name = item;
			varNameObj.level = forCount;
			forVariableName.push(varNameObj);
		}
		
		//编译变量(变量目前有三类，for的item变量、普通变量、还有loop对象)
		function compileVariable(directive){
			directive = directive.replace(/(^{{|}}$)/g, "");
			var variable = directive;
			var usefor = false;  //判断是否用到for循环里的item变量
			var cmd = '';
			if(/\./.test(directive)){
				variable = directive.split(/\./, 1)[0];
			}
			for(var i = 0, len = forVariableName.length; i < len; i++){
				if(forVariableName[i].name == variable){
					usefor = true;
				}
			}
			if(!usefor){
				if(/loop/.test(variable) && forCount > 0){  //处理loop对象，该变量是for循环内的loop对象，for循环外也可能有变量名为loop的变量
				    /*验证是否在外层for循环使用了内层for循环的loop对象*/
					if(/\[/.test(variable)){
						var exist = false;
						var loopKey = variable.replace(/(^loop\[['"]|['"]\]$)/g, "");
						for(var i = 0, len = forVariableName.length; i < len; i++){
							if(forVariableName[i].name == loopKey){
								if(forVariableName[i].level > forCount || (forVariableName[i].level == forCount && loopKey != forVariableName[forVariableName.length - 1].name)){
									throw new Error("变量 '" + variable + "' 未定义");
								}
								exist = true;
								break;
							}
						}
						if(!exist){
							throw new Error("变量 '" + variable + "' 未定义");
						}
					}
					/*验证完毕*/
					directive = directive.replace(/loop(?!\[)/g, 'loop["' + forVariableName[forVariableName.length - 1].name + '"]');
				}
				else {
					if(!datas.hasOwnProperty(variable)){
						throw new Error("变量 '" + variable + "' 未定义");
					}
					directive = directive.replace(variable, 'datas["' + variable + '"]');
				}
			}
			cmd += 'htmlContainer.push(' + directive + ');';
			cmd += fragment[compileIndex] != '' ? ('htmlContainer.push("' + fragment[compileIndex].replace(/"/g, '\\"') + '");') : '';
			jsContainer.push(cmd);
		}
		
		//执行指令
		function executeDirective(){
			eval(jsContainer.join(''));
			field[i].compileResult = htmlContainer.join('');
		}
	}
	
	//解析指令
	function analysis(html){
		if(/{ %/.test(html)){
			throw new Error("'{' 与 '%' 之间不能有空格");
		}
		if(/% }/.test(html)){
			throw new Error("'%' 与 '}' 之间不能有空格");
		}
		if(/{%\s*for\S/.test(html)){
			throw new Error("'for' 指令之后至少要有一个空格");
		}
		if(/{%\s*if\S/.test(html)){
			throw new Error("'if' 指令之后至少要有一个空格");
		}
		html = html.replace(/\n|\r/g, "");  //去除换行符和回车符
		//html = html.replace(/\s+(?={%)/g, "");  //以下3行去除行与行之间的空格
		//html = html.replace(/>\s+</g, "><");
		//html = html.replace(/%}\s+</g, "%}<");
		originHTML = html;  //把准备解析的html代码保存起来，以便最终编译执行后进行覆盖并返回
		findFirstDirective(html);  //解析指令或变量
	}
	
	//查找第一个指令(外围指令)
	function findFirstDirective(html){
		var reg = /({%\s*for|{%\s*if|{{.+?}})/g;
		var result = reg.exec(html);
		if(result != null){
			if(/for/.test(result[0])){  //如果找到第一个指令是for指令，则调用findForDirective解析for指令
				findForDirective(html);
			}
			else if(/if/.test(result[0])){
				findIfDirective(html);  //调用findIfDirective解析for指令
			}
			else {
				findVariable(result);  //调用findVariable解析变量
			}
			findFirstDirective(html);
		}
		//从html代码中解析for指令
		function findForDirective(forHtml){
			var reg = /({%\s*for|{%\s*endfor\s*%})/g;
			var forObject = {};
			var result;
			var forCount = 0;
			forObject.strIndex = [];
			while((result = reg.exec(forHtml)) != null){
				forCount == 0 && forObject.strIndex.push(result.index);
				/end/.test(result[0]) ? forCount-- : forCount++;
				if(forCount < 0){
					throw new Error("'for'指令缺失");
				}
				if(forCount == 0){
					var forecast = forHtml.slice(result.index, result.index + 16);  //这里查到了结束符的初始位置，但还不知道结束符有多长(一般最大是12左右)，这里为了保险起见从初始位置多加16，把这段取出后再匹配结束符然后求其长度
					var len = forecast.match(/{%\s*endfor\s*%}/)[0].length;
					forObject.strIndex.push(result.index + len);
					break;
				}
			}
			if(forCount != 0){
				throw new Error("'endfor'指令缺失");
			}
			if(forObject.strIndex.length > 0){
				forObject.analysisResult = forHtml.slice(forObject.strIndex[0], forObject.strIndex[1]);
				field.push(forObject);
				html = html.replace(forObject.analysisResult, "");  //删除找到的部分
			}
		}
		
		//从html代码中解析if指令
		function findIfDirective(ifHtml){
			var reg = /({%\s*if|{%\s*endif\s*%})/g;
			var ifObject = {};
			var result;
			var ifCount = 0;
			ifObject.strIndex = [];
			while((result = reg.exec(ifHtml)) != null){
				ifCount == 0 && ifObject.strIndex.push(result.index);
				/end/.test(result[0]) ? ifCount-- : ifCount++;
				if(ifCount < 0){
					throw new Error("'if'指令缺失");
				}
				if(ifCount == 0){
					var forecast = ifHtml.slice(result.index, result.index + 16);  //这里查到了结束符的初始位置，但还不知道结束符有多长(一般最大是12左右)，这里为了保险起见从初始位置多加16，把这段取出后再匹配结束符然后求其长度
					var len = forecast.match(/{%\s*endif\s*%}/)[0].length;
					ifObject.strIndex.push(result.index + len);
					break;
				}
			}
			if(ifCount != 0){
				throw new Error("'endif'指令缺失");
			}
			if(ifObject.strIndex.length > 0){
				ifObject.analysisResult = ifHtml.slice(ifObject.strIndex[0], ifObject.strIndex[1]);
				field.push(ifObject);
				html = html.replace(ifObject.analysisResult, "");  //删除找到的部分
			}
		}
		
		//从html代码中解析变量
		function findVariable(varHtml){
			var varObject = {};
			varObject.strIndex = [];
			varObject.strIndex.push(varHtml.index);
			varObject.strIndex.push(varHtml.index + varHtml[0].length);
			varObject.analysisResult = html.slice(varObject.strIndex[0], varObject.strIndex[1]);
			field.push(varObject);
			html = html.replace(varObject.analysisResult, "");  //删除找到的部分
		}
	}
	
	//生成最终模板
	function generateTemplate(){
		for(var i = 0, len = field.length; i < len; i++){
			originHTML = originHTML.replace(field[i].analysisResult, field[i].compileResult);
		}
		return originHTML;
	}
	
	//获取模板
	function getTemplate(url, settings, fn){
		$.ajax({
			url: url,
			type: settings.type
		}).done(function(html){
			analysis(html);
			if(field.length > 0){
				mainCompiler();
			}
			fn(generateTemplate());
		}).fail(function(jqXHR){
			var msg = typeof jqXHR.responseText === "undefined" ? "当前网络不可用" : "statusCode:" + jqXHR.status + ", responseText:" + jqXHR.responseText;
			alert(msg);
		});
	}
	
	//判断Array或Object是否为空
	function empty(obj){
		return (obj instanceof Array && "length" in obj) ? !obj.length : isEmpty(obj);
	}
	
	//判断Object是否为空
	function isEmpty(obj){
		var bln = true;
		for(var name in obj){
			bln = false;
			break;
		}
		return bln;
	}
	
	//获得数组或对象的长度
	function getLength(o){
		return (o instanceof Array && "length" in o) ? o.length : (function(){
			var len = 0;
			for(var k in o){
				len++;
			}
			return len;
		})();
	}
	
	//是否奇数
	function odd(value){
		return typeof value === "number" && value % 2 == 1;
	}
	
	//是否偶数
	function even(value){
		return typeof value === "number" && value % 2 == 0;
	}
	
	var Tingn = function(url, options, fn){  //使用回调函数，将应用页面的业务传入来处理
		var settings = {
			type: "post",
			data: {}
		};
		options && $.extend(settings, options);
		datas = settings.data;
		field = [];  //解析之前清空上次的内容
		getTemplate(url, settings, fn);
	};
	
	window.Tingn = Tingn;
	
})(window, jQuery);
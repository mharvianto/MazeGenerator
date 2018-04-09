/*!
 * Maze Generator
 * Author: Harvianto
 */
(function(){
	function PriorityQueue(option){
		option = option || {};
		var data = [],
			p = (n) => Math.floor((n-1)/2),
			l = (n) => n*2+1,
			r = (n) => (n+1)*2,
			swap = function(a,b){
				var c = data[a];
				data[a] = data[b];
				data[b] = c;
			},
			compare = option.compare || ((a,b) => a < b);
		return{get: (a) => (a == undefined?data:data[a]),
			push: function(){
				Array.from(arguments).forEach((a) => {
					n = data.push(a)-1;
					while(n > 0 && compare(data[n], data[p(n)])){
						swap(n, p(n));
						n = p(n);
					}
				});
				return data.length;
			},
			empty: () => data.length == 0,
			pop: function(){
				if(this.empty())return undefined;
				var a = 0, b = data[a], c = data.length;
				if(c == 1) data.pop();
				else{
					data[a] = data.pop();
					while((data[l(a)] && compare(data[l(a)], data[a])) || (data[r(a)] && compare(data[r(a)], data[a]))){
						if(data[r(a)] && compare(data[r(a)], data[l(a)])){
							swap(a, r(a));
							a = r(a);
						}else{
							swap(a, l(a));
							a = l(a);
						}
					}
				}
				return b;
			}
		}
	};
	function Queue(){
		var data = [];
		return {get: (a) => (a == undefined?data:data[a]),
			empty: () => data.length == 0,
			push: (a) => data.push(a),
			pop: () => data.shift(),
		}
	};
	function Stack(){
		var data = [];
		return {get: (a) => (a == undefined?data:data[a]),
			empty: () => data.length == 0,
			push: (a) => data.push(a),
			pop: () => data.pop(),
		}
	};
	var $ = (id) => document.getElementById(id),
		c = $('canvas'), 
		ctx = c.getContext('2d'),
		pause = false,
		interval,
		speed, 
		si = $('sizetxt'),
		al = $('algotxt'),
		sp = $('speedtxt'),
		rb = $('resetbtn'),
		pb = $('pausebtn'),
		Maze = function(){
			var w, // size rect
				n, // width
				m, // height 
				pq, 
				x, // current x position
				y, // current y position
				map, // map maze
				obj = {st:0}, // object maze
				visited, 
				qq,
				cycle = [], // list cycle
				distance, // dijkstra weight
				oldPos,
				moves,
				currMouse,
				opt = {compare:(a,b) => a.w < b.w},
				rand = () => Math.floor(Math.random()*10),
				draw = function(x, y, c){
					c = c || {}; 
					var l = c.width || w; 
					ctx.fillStyle = c.color; 
					ctx.fillRect(w*x + (w-l)/2, w*y+ (w-l)/2, l, l);
				},
				addMaze = function (x, y, fx, fy){
					fx = fx || x;
					fy = fy || y;
					if(map[x][y] == 0){
						map[x][y] = map[fx][fy] = 1;
						var moves = [], node;
						if(x-2 > 0) moves.push({w:rand(), x:x-2, y:y, fx:x-1, fy:y});
						if(y-2 > 0) moves.push({w:rand(), x:x, y:y-2, fx:x, fy:y-1});
						if(x+2 < n-1) moves.push({w:rand(), x:x+2, y:y, fx:x+1, fy:y});
						if(y+2 < m-1) moves.push({w:rand(), x:x, y:y+2, fx:x, fy:y+1});
						moves.sort((a, b)=>a.w<b.w);
						while(node = moves.pop()){
							if(pq.get().filter(({x,y})=>(x == node.x && y == node.y)).length < 1 && map[node.x][node.y] == 0) 
								pq.push({w:rand(), x:node.x, y:node.y, fx:node.fx, fy:node.fy});
						}
					}
				},
				drawMaze = function(node){
					ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
					pq.get().forEach(({x,y,fx,fy})=>{draw(x, y, {color:'red'}); draw(fx, fy, {color:'red'})});
					for (var i = n - 1; i >= 0; i--) {
						for (var j = m - 1; j >= 0; j--) {
							if(map[i][j] == 1) draw(i, j, {color:'white'});
						}
					}
					// (cycle && cycle.forEach(({x,y})=>{draw(x, y, {color:'red'});}));
					(cycle && cycle.forEach(({fx,fy})=>{draw(fx, fy, {color:'orange'})}));
					(node && draw(node.x, node.y, {color:'blue', width:w-Math.floor(w/5)}));
				},
				memset = function(n, m, v){
					var arr = [] 
					for (var i = n-1; i >= 0; i--) {
						arr[i] = [];
						for (var j = m-1; j >= 0; j--) {
							arr[i][j] = (v || 0);
						}
					}
					return arr;
				},
				fill = function(x, y){
					if(map[x][y] == 1 && visited[x][y] == 0){
						visited[x][y] = 1;
						var temp = [], node;
						if(x-2 > 0) temp.push({x:x-2, y:y});
						if(y-2 > 0) temp.push({x:x, y:y-2});
						if(x+2 < n-1) temp.push({x:x+2, y:y});
						if(y+2 < m-1) temp.push({x:x, y:y+2});
						while(node = temp.shift()){
							if(qq.filter(({x,y})=>(x == node.x && y == node.y)).length < 1) qq.push(node);
						}
						if(map[x-1][y] + map[x][y-1] + map[x+1][y] + map[x][y+1] == 1){
							var moves = [], hole;
							moves.push({w:rand(), x:x-2, y:y, fx:x-1, fy:y, d:'h'});
							moves.push({w:rand(), x:x+2, y:y, fx:x+1, fy:y, d:'h'});
							moves.push({w:rand(), x:x, y:y-2, fx:x, fy:y-1, d:'v'});
							moves.push({w:rand(), x:x, y:y+2, fx:x, fy:y+1, d:'v'});
							moves.sort((a, b)=>a.w<b.w);
							while(hole = moves.shift()){
								if(hole.x>0 && hole.y>0 && hole.x<n-1 && hole.y<m-1 && map[hole.fx][hole.fy] == 0 /*&&
									!((map[hole.fx-2] && map[hole.fx-2][hole.fy]) || map[hole.fx][hole.fy-2] || 
										(map[hole.fx+2] && map[hole.fx+2][hole.fy]) || map[hole.fx][hole.fy+2])*/){
									map[hole.fx][hole.fy] = 1;
									cycle.push({x:x, y:y, fx:hole.fx, fy:hole.fy});
									break;
								}
							}
						}
					}
				},
				mousePosition = function(e){
					var r = c.getBoundingClientRect();
					return {
						x: Math.floor((e.clientX - r.left)/w),
						y: Math.floor((e.clientY - r.top)/w)
					};
				}, 
				floodfill = function(){
					visited = memset(n, m);
					qq = [];
					qq.push({x:x, y:y});
					interval = setInterval(obj.floodfillstep, speed);
				},
				dijkstra = function(node){
					visited = memset(n, m);
					distance = memset(n, m, n*m+5);
					var qd = new PriorityQueue(opt), temp;
					qd.push({x:node.x, y:node.y, w:0});
					while(temp = qd.pop()){
						if(temp.x > 0 && temp.y > 0 && temp.x < n-1 && temp.y < m-1 && 
							map[temp.x][temp.y] == 1 && visited[temp.x][temp.y] == 0){
							visited[temp.x][temp.y] = 1;
							distance[temp.x][temp.y] = Math.min(distance[temp.x][temp.y], temp.w);
							qd.push({x:temp.x+1, y:temp.y, w:temp.w+1});
							qd.push({x:temp.x-1, y:temp.y, w:temp.w+1});
							qd.push({x:temp.x, y:temp.y+1, w:temp.w+1});
							qd.push({x:temp.x, y:temp.y-1, w:temp.w+1});
						}
					}
				},
				pathMove = function(node){
					var a = new PriorityQueue(opt),
						t, //temp
						b = [], 
						visited = memset(n, m);
					a.push({x:node.x, y:node.y, w:distance[node.x][node.y]});
					while(t = a.pop()){
						if(visited[t.x][t.y]==0){
							visited[t.x][t.y]=1;
							a.push({x:t.x+1, y:t.y, w:distance[t.x+1][t.y]});
							a.push({x:t.x-1, y:t.y, w:distance[t.x-1][t.y]});
							a.push({x:t.x, y:t.y+1, w:distance[t.x][t.y+1]});
							a.push({x:t.x, y:t.y-1, w:distance[t.x][t.y-1]});
							b.push({x:t.x, y:t.y});
							if (!t.w) break;
						}
					}
					return b;
				},
				drawPath = function(node, opt){
					opt = opt || {};
					var c = Math.floor(w/2), 
						b = opt.path || pathMove(node), 
						a;
					ctx.lineWidth = opt.width || Math.ceil(w/5);
					ctx.strokeStyle = opt.color || "red";
					ctx.beginPath();
					// ctx.moveTo(node.x*w+c, node.y*w+c);
					while(a = b.pop())
						ctx.lineTo(a.x*w+c, a.y*w+c);
					ctx.stroke();
				},
				mouseClick = function(e){
					var pos = mousePosition(e);
					if(pos.x > 0 && pos.y > 0 && pos.x < n-1 && pos.y < m-1 &&
						!(pos.x == x && pos.y == y) && map[pos.x][pos.y] == 1){
						if(obj.st == 2) clearInterval(interval);
						moves = pathMove(pos);
						interval = setInterval(obj.moveNode, speed);
					}
				},
				mouseMove = function(e){
					var pos = mousePosition(e);
					if(!oldPos || !(oldPos.x == pos.x && oldPos.y == pos.y)){
						drawMaze({x, y});
						if(pos.x > 0 && pos.y > 0 && pos.x < n-1 && pos.y < m-1 && 
							!(pos.x == x && pos.y == y) && map[pos.x][pos.y] == 1){
							drawPath(pos);
							draw(pos.x, pos.y, {color:'red', width:w-Math.floor(w/5)});
							currMouse = pos;
						}else currMouse = undefined;
						oldPos = pos;
					}
				},
				mouseListener = function(){
					dijkstra({x, y});
					drawMaze({x, y});
					c.addEventListener('mousemove', mouseMove, false);
					c.addEventListener('mousedown', mouseClick, false);
				};
			obj.moveNode = function(){
				if(pause)return;
				var t;
				if(moves && (t = moves.pop())){
					x = t.x;
					y = t.y;
					dijkstra({x, y});
					drawMaze({x, y});
					var a = moves.slice();
					a.push({x, y});
					drawPath(currMouse, {path:a, color:'green', width:Math.ceil(w/5)+2});
					if(currMouse && !(currMouse.x == x && currMouse.y == y)){
						drawPath(currMouse);
						draw(currMouse.x, currMouse.y, {color:'red', width:w-Math.floor(w/5)});
					}
				}else obj.stop();
			}
			obj.floodfillstep = function(){
				var step;
				if(pause)return;
				if(qq && (step = qq.pop())){
					fill(step.x, step.y);
					drawMaze(step);
				}else{
					clearInterval(interval);
					obj.st = 2;
					mouseListener();
				}
			}
			obj.renderView = function(){
				if(pause)return;
				if(pq && !pq.empty()){
					var node = pq.pop();
					addMaze(node.x, node.y, node.fx, node.fy);
					drawMaze(node);
				}else{
					clearInterval(interval);
					obj.st = 1;
					floodfill();
					// mouseListener();
				}
			};
			obj.start = function(){
				c.width = window.innerWidth;
				c.height = window.innerHeight-40;
				w = si.value;
				n = Math.floor(c.width/w);
				m = Math.floor(c.height/w);
				speed = sp.value || 1;
				pause = false;
				pb.value = 'Pause';
				pq = (al.value == 0 ? new Queue():(al.value == 1 ? new Stack() : new PriorityQueue(opt)));
				x = Math.floor(Math.random()*(n-2)/2)*2+1;
				y = Math.floor(Math.random()*(m-2)/2)*2+1;
				map = memset(n, m);
				cycle = [];
				obj.st = 0;
				c.removeEventListener('mousemove', mouseMove);
				c.removeEventListener('mousedown', mouseClick);
				addMaze(x, y);
				interval = setInterval(obj.renderView, speed);
			};
			obj.stop = function(){
				clearInterval(interval);
			}
			obj.start();
			return obj;
		};
	(window.maze || (window.maze = new Maze()));
	rb.addEventListener('click', function(){
		clearInterval(interval);
		maze.start();
	});
	window.onresize = function() {
	    rb.click();
	};
	pb.addEventListener('click', function(){
		pause = !pause;
		pb.value = pb.value == 'Pause' ? 'Play' : 'Pause';
	});
	sp.addEventListener('change', function(){
		speed = this.value;
		clearInterval(interval);
		switch(maze.st){
			case 0: interval = setInterval(maze.renderView, speed); break;
			case 1: interval = setInterval(maze.floodfillstep, speed); break;
			case 2: interval = setInterval(maze.moveNode, speed); break;
		}
	})
}());
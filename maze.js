/*!
 * Maze Generator
 * Author: Harvianto
 */
(function(){
	function PriorityQueue(options){
		options = options || {};
        let data = [],
            p = (n) => Math.floor((n - 1) / 2),
            l = (n) => n * 2 + 1,
            r = (n) => (n + 1) * 2,
            swap = function (a, b) {
                let c = data[a];
                data[a] = data[b];
                data[b] = c;
            },
            compare = options.compare || ((a, b) => a < b);
        return {
			get: (a) => data[a] || data,
			push: function(){
				Array.from(arguments).forEach((a) => {
					let n = data.push(a)-1;
					while(n > 0 && compare(data[n], data[p(n)])){
						swap(n, p(n));
						n = p(n);
					}
				});
				return data.length;
			},
			empty: () => !data.length,
			pop: function(){
				if(!this.empty()){
                    let a = 0, b = data[a], c = data.length;
                    if(c === 1) data.pop();
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
		}
	}
	function Queue(){
        let data = [];
        return {
			get: (a) => data[a] || data,
			empty: () => !data.length,
			push: (a) => data.push(a),
			pop: () => data.shift(),
		}
	}
	function Stack(){
        let data = [];
        return {
			get: (a) => data[a] || data,
			empty: () => !data.length,
			push: (a) => data.push(a),
			pop: () => data.pop(),
		}
	}
	let $ = (selector) => document.querySelector(selector),
		c = $('canvas'), 
		ctx = c.getContext('2d'),
		pause = false,
		interval,
		speed, 
		si = $('#sizetxt'),
		al = $('#algotxt'),
		sp = $('#speedtxt'),
		rb = $('#resetbtn'),
		pb = $('#pausebtn'),
		Maze = function(){
			let size, // size rect
				width, // width
				height, // height
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
				rand = () => Math.floor(Math.random() * 10),
				isBorder = (n) => n.x > 0 && n.y > 0 && n.x < width-1 && n.y < height-1,
				draw = function(node, options){
					options = options || {};
                    options.width = options.width || size;
                    ctx.fillStyle = options.color;
					ctx.fillRect(size * node.x + (size-options.width)/2, size * node.y + (size-options.width)/2,
						options.width, options.width);
				},
				addMaze = function (node){
					let n = {x:node.x, y:node.y, fx:(node.fx||node.x), fy:(node.fy||node.y)};
					if(!map[n.x][n.y]){
						map[n.x][n.y] = map[n.fx][n.fy] = 1;
						let moves = [], temp;
                        if(n.x-2 > 0) moves.push({w:rand(), x:n.x-2, y:n.y, fx:n.x-1, fy:n.y});
						if(n.y-2 > 0) moves.push({w:rand(), x:n.x, y:n.y-2, fx:n.x, fy:n.y-1});
						if(n.x+2 < width-1) moves.push({w:rand(), x:n.x+2, y:n.y, fx:n.x+1, fy:n.y});
						if(n.y+2 < height-1) moves.push({w:rand(), x:n.x, y:n.y+2, fx:n.x, fy:n.y+1});
						moves.sort((a, b) => a && b && a.w - b.w);
						while(temp = moves.pop()){
							if(pq.get().filter(({x,y})=>(x === temp.x && y === temp.y)).length < 1 && !map[temp.x][temp.y])
								pq.push({w:rand(), x:temp.x, y:temp.y, fx:temp.fx, fy:temp.fy});
						}
					}
				},
				drawMaze = function(node){
					ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
					pq.get().forEach(({x,y,fx,fy})=>{
						draw({x:x, y:y}, {color:'red'});
						draw({x:fx, y:fy}, {color:'red'})
					});
					for (let i = width - 1; i >= 0; i--) {
						for (let j = height - 1; j >= 0; j--) {
							if(map[i][j]) draw({x:i, y:j}, {color:'white'});
						}
					}
					// (cycle && cycle.forEach(({x,y})=>{draw({x, y}, {color:'red'});}));
					(cycle && cycle.forEach(({fx, fy}) => {draw({x:fx, y:fy}, {color: 'orange'})}));
					(node && draw(node, {color:'blue', width:size-Math.floor(size/5)}));
				},
				memset = function(n, m, v){
					let arr = [];
					for (let i = n-1; i >= 0; i--) {
						arr[i] = [];
						for (let j = m-1; j >= 0; j--) {
							arr[i][j] = (v || 0);
						}
					}
					return arr;
				},
				fill = function(node){
					let t = {x:node.x, y:node.y};
					if(map[t.x][t.y] && !visited[t.x][t.y]){
						visited[t.x][t.y] = 1;
						let temp = [], node;
						if(t.x-2 > 0) temp.push({x:t.x-2, y:t.y});
						if(t.y-2 > 0) temp.push({x:t.x, y:t.y-2});
						if(t.x+2 < width-1) temp.push({x:t.x+2, y:t.y});
						if(t.y+2 < height-1) temp.push({x:t.x, y:t.y+2});
						while(node = temp.shift()){
							if(qq.filter(({x,y})=>(x === node.x && y === node.y)).length < 1) qq.push(node);
						}
						if(map[t.x-1][t.y] + map[t.x][t.y-1] + map[t.x+1][t.y] + map[t.x][t.y+1] === 1){
							let moves = [], hole;
							moves.push({w:rand(), x:t.x-2, y:t.y, fx:t.x-1, fy:t.y});
							moves.push({w:rand(), x:t.x+2, y:t.y, fx:t.x+1, fy:t.y});
							moves.push({w:rand(), x:t.x, y:t.y-2, fx:t.x, fy:t.y-1});
							moves.push({w:rand(), x:t.x, y:t.y+2, fx:t.x, fy:t.y+1});
							moves.sort((a, b) => a && b && a.w - b.w);
							while(hole = moves.shift()){
								if(hole.x>0 && hole.y>0 && hole.x<width-1 && hole.y<height-1 && !map[hole.fx][hole.fy] /*&&
									!((map[hole.fx-2] && map[hole.fx-2][hole.fy]) || map[hole.fx][hole.fy-2] || 
										(map[hole.fx+2] && map[hole.fx+2][hole.fy]) || map[hole.fx][hole.fy+2])*/){
									map[hole.fx][hole.fy] = 1;
									cycle.push({x:t.x, y:t.y, fx:hole.fx, fy:hole.fy});
									break;
								}
							}
						}
					}
				},
				mousePosition = function(event){
					let rect = c.getBoundingClientRect();
					return {
						x: Math.floor((event.clientX - rect.left)/size),
						y: Math.floor((event.clientY - rect.top)/size)
					};
				},
				floodFill = function(){
					visited = memset(width, height);
					qq = [];
					qq.push({x, y});
					interval = setInterval(obj.floodFillStep, speed);
				},
				dijkstra = function(node){
					visited = memset(width, height);
					distance = memset(width, height, width*height+5);
					let qd = new PriorityQueue(opt), temp;
					qd.push({x:node.x, y:node.y, w:0});
					while(temp = qd.pop()){
						if(isBorder(temp) && map[temp.x][temp.y] && !visited[temp.x][temp.y]){
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
					let a = new PriorityQueue(opt),
						t, //temp
						b = [],
						visited = memset(width, height);
					a.push({x:node.x, y:node.y, w:distance[node.x][node.y]});
					while(t = a.pop()){
						if(!visited[t.x][t.y]){
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
					let c = Math.floor(size/2),
						b = opt.path || pathMove(node),
						a;
					ctx.lineWidth = opt.width || Math.ceil(size/5);
					ctx.strokeStyle = opt.color || "red";
					ctx.beginPath();
					// ctx.moveTo(node.x*w+c, node.y*w+c);
					while(a = b.pop())
						ctx.lineTo(a.x*size+c, a.y*size+c);
					ctx.stroke();
				},
				mouseClick = function(e){
					let pos = mousePosition(e);
					if(isBorder(pos) && !(pos.x === x && pos.y === y) && map[pos.x][pos.y]){
						if(obj.st === 2) clearInterval(interval);
						moves = pathMove(pos);
						interval = setInterval(obj.moveNode, speed);
					}
				},
				mouseMove = function(e){
					let pos = mousePosition(e);
					if(!oldPos || !(oldPos.x === pos.x && oldPos.y === pos.y)){
						drawMaze({x, y});
						if(isBorder(pos) && !(pos.x === x && pos.y === y) && map[pos.x][pos.y]){
							drawPath(pos);
							draw(pos, {color:'red', width:size-Math.floor(size/5)});
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
				let t;
                if(pause) return;
				if(moves && (t = moves.pop())){
					x = t.x;
					y = t.y;
					dijkstra({x, y});
					drawMaze({x, y});
					let a = moves.slice();
					a.push({x, y});
					drawPath(currMouse, {path:a, color:'green', width:Math.ceil(size/5)+2});
					if(currMouse && !(currMouse.x === x && currMouse.y === y)){
						drawPath(currMouse);
						draw(currMouse, {color:'red', width:size-Math.floor(size/5)});
					}
				}else obj.stop();
			};
			obj.floodFillStep = function(){
				let step;
				if(pause) return;
				if(qq && (step = qq.pop())){
					fill(step);
					drawMaze(step);
				}else{
                    obj.stop().st++;
					mouseListener();
				}
			};
			obj.renderView = function(){
				let node;
				if(pause) return;
				if(pq && (node = pq.pop())){
					addMaze(node);
					drawMaze(node);
				}else{
					obj.stop().st++;
					floodFill();
				}
			};
			obj.start = function(){
				c.width = window.innerWidth;
				c.height = window.innerHeight-40;
				size = si.value;
				width = Math.floor(c.width/size);
				height = Math.floor(c.height/size);
				speed = sp.value || 1;
				pause = false;
				pb.value = 'Pause';
				pq = (al.value === '0' ? new Queue():(al.value === '1' ? new Stack() : new PriorityQueue(opt)));
				x = Math.floor(Math.random()*(width-2)/2)*2+1;
				y = Math.floor(Math.random()*(height-2)/2)*2+1;
				map = memset(width, height);
				cycle = [];
				obj.st = 0;
				c.removeEventListener('mousemove', mouseMove);
				c.removeEventListener('mousedown', mouseClick);
				addMaze({x:x, y:y});
				interval = setInterval(obj.renderView, speed);
				return obj;
			};
			obj.stop = ()=>{clearInterval(interval);return obj};
			obj.start();
			return obj;
		};
	(window.maze || (window.maze = new Maze()));
	rb.addEventListener('click', function(){
		maze.stop().start();
	});
	window.onresize = function() {
	    rb.click();
	};
	pb.addEventListener('click', function(){
		pause = !pause;
		pb.value = pb.value === 'Pause' ? 'Play' : 'Pause';
	});
	sp.addEventListener('change', function(){
		speed = this.value;
		maze.stop();
		switch(maze.st){
			case 0: interval = setInterval(maze.renderView, speed); break;
			case 1: interval = setInterval(maze.floodFillStep, speed); break;
			case 2: interval = setInterval(maze.moveNode, speed); break;
		}
	})
}());
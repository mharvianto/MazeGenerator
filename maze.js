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
				pause = false, interval, speed, 
				si = $('sizetxt'),
				al = $('algotxt'),
				sp = $('speedtxt'),
				rb = $('resetbtn'),
				pb = $('pausebtn'),
				Maze = function(){
					var w, n, m, pq, x, y, map, obj={}, visited, qq,
						opt = {compare:(a,b) => a.w < b.w},
						rand = () => Math.floor(Math.random()*10),
						draw = (x, y, c) => {ctx.fillStyle = c; ctx.fillRect(w*x, w*y, w, w)},
						addMove = function (x, y, fx, fy){
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
							pq.get().forEach(({x,y,fx,fy})=>{draw(x, y, 'red');draw(fx, fy, 'red')});
							for (var i = n - 1; i >= 0; i--) {
								for (var j = m - 1; j >= 0; j--) {
									if(map[i][j] == 1) draw(i, j, 'white');
								}
							}
							draw(node.x, node.y, 'blue');
						},
						memset = function(n, m){
							var arr = [] 
							for (var i = n-1; i >= 0; i--) {
								arr[i] = [];
								for (var j = m-1; j >= 0; j--) {
									arr[i][j] = 0;
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
								if(map[x-1][y] + map[x][y-1] + map[x+1][y] + map[x][y+1] == 1 && rand() <= 2.5){
									var moves = [], hole;
									moves.push({w:rand(), x:x-2, y:y, fx:x-1, fy:y});
									moves.push({w:rand(), x:x+2, y:y, fx:x+1, fy:y});
									moves.push({w:rand(), x:x, y:y-2, fx:x, fy:y-1});
									moves.push({w:rand(), x:x, y:y+2, fx:x, fy:y+1});
									moves.sort((a, b)=>a.w<b.w);
									while(hole = moves.shift()){
										if(hole.x>0 && hole.y>0 && hole.x<n-1 && hole.y<m-1 && 
											map[hole.fx][hole.fy] == 0){
											map[hole.fx][hole.fy] = 1;
											break;
										}
									}
								}
							}
						},
						floodfillstep = function(){
							var step;
							if(pause)return;
							if(step = qq.pop()){
								fill(step.x, step.y);
								drawMaze(step);
							}else clearInterval(interval);
						},
						floodfill = function(){
							visited = memset(n, m);
							qq = [];
							qq.push({x:x, y:y});
							interval = setInterval(floodfillstep, speed);
						},
						renderView = function(){
							if(pause)return;
							if(!pq.empty()){
								var node = pq.pop();
								addMove(node.x, node.y, node.fx, node.fy);
								drawMaze(node);
							}else{
								clearInterval(interval);
								floodfill();
							}
						};
					obj.start = function(){
						c.width = window.innerWidth-10;
						c.height = window.innerHeight-50;
						w = si.value;
						n = Math.floor(c.width/w);
						m = Math.floor(c.height/w);
						speed = sp.value || 1;
						pause = false;
						pb.value = 'Pause';
						pq = (al.value == 0? new Queue():(al.value == 1? new Stack(): new PriorityQueue(opt)));
						x = Math.floor(Math.random()*(n-2)/2)*2+1;
						y = Math.floor(Math.random()*(m-2)/2)*2+1;
						map = memset(n, m);
						addMove(x, y);
						//renderView();
						interval = setInterval(renderView, speed);
					};
					obj.start();
					return obj;
				},
				maze = new Maze();
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
				interval = setInterval(maze.renderView, speed);
			})
		}());
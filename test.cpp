#include<iostream>
#include<queue>
#include<vector>
#include<ctime>
#define pi pair<int,int>
#define pp pair<int,pi >
#define PQ priority_queue<pp, vector<pp >, Comp>
#define N 10
#define px first.first
#define py first.second
using namespace std;

class Comp{
public:
	bool operator()(const pp a, const pp b){
		return a.first > b.first;
	}
};

int min(const int a, const int b){
	return a<b?a:b;
}

void print_map(int map[N][N], int visited[N][N]){
	int i,j;
	for(i=0;i<N;i++){
		for(j=0;j<N;j++){
			printf("%c", map[i][j]?'*':'_');
		}
		printf(" ");
		for(j=0;j<N;j++){
			printf("%c", (!visited[i][j])?'*':'_');
		}
		printf("\n");
	}
}

void pq_push(int map[N][N], int result[N][N], int visited[N][N], int x, int y, PQ *pq, int w){
	if(x >= 0 && x < N && y >= 0 && y < N && map[x][y] == 0 && visited[x][y] == 0){
		result[x][y] = min(result[x][y], w);
		pq->push(pp(result[x][y],pi(x, y)));
		visited[x][y] = 1;
	}
}

void add_move(int map[N][N], int result[N][N], int visited[N][N], int x, int y, PQ *pq, int w){
	result[x][y] = w;
	pq_push(map, result, visited, x-1, y, pq, w+1);
	pq_push(map, result, visited, x+1, y, pq, w+1);
	pq_push(map, result, visited, x, y-1, pq, w+1);
	pq_push(map, result, visited, x, y+1, pq, w+1);
}

void dijkstra(int map[N][N], int result[N][N], int visited[N][N], int x, int y){
	PQ pq;
	//int step=0;
	visited[x][y] = 1;
	add_move(map, result, visited, x, y, &pq, 0);
	while(!pq.empty()){
		//step++;
		pp p = pq.top();
		//printf("%d, x=%d, y=%d\n", p.first, p.second.first, p.second.second);
		add_move(map, result, visited, p.second.first, p.second.second, &pq, p.first);
		pq.pop();
	}
	//printf("step = %d\n", step);
}

void pq_push1(int map[N][N], int visited[N][N], int x, int y, PQ *pq){
	if(x >= 0 && x < N && y >= 0 && y < N && map[x][y] == 0 && visited[x][y] == 0){
		pq->push(pp(1,pi(x, y)));
	}
}

void add_neighbor(int map[N][N], int visited[N][N], int x, int y, PQ *pq){
	PQ pq1;
	pq1.push(pp(rand()%5, pi(x-1, y)));
	pq1.push(pp(rand()%5, pi(x+1, y)));
	pq1.push(pp(rand()%5, pi(x, y-1)));
	pq1.push(pp(rand()%5, pi(x, y+1)));
	while(!pq1.empty()){
		pp a = pq1.top();
		pq_push1(map, visited, a.second.first, a.second.second, pq);
		pq1.pop();
	}
}

void prim(int map[N][N], int visited[N][N], int x, int y){
	PQ pq;
	int step = 0;
	visited[x][y] = 1;
	add_neighbor(map, visited, x, y, &pq);
	while(!pq.empty()){
		pp p = pq.top();
		step++;
		int sum = visited[p.second.first-1][p.second.second] + visited[p.second.first+1][p.second.second] +
			visited[p.second.first][p.second.second-1] + visited[p.second.first][p.second.second+1];
		// printf("m=%d, v=%d, w=%d, x=%d, y=%d, sum=%d\n",map[p.second.first][p.second.second], 
		// 	visited[p.second.first][p.second.second], p.first, p.second.first, p.second.second, sum);
		if(!visited[p.second.first][p.second.second] && sum < 2){
			visited[p.second.first][p.second.second] = 1;
			add_neighbor(map, visited, p.second.first, p.second.second, &pq);
		}else map[p.second.first][p.second.second] = 1;
		// print_map(map, visited);
		pq.pop();
	}
	printf("step = %d\n", step);
}

int main(){
	srand(time(0));
	int map[N][N] = {
		1,1,1,1,1,1,1,1,1,1,
		1,0,0,0,0,0,0,0,0,1,
		1,0,0,0,0,0,0,0,0,1,
		1,0,0,0,0,0,0,0,0,1,
		1,0,0,0,0,0,0,0,0,1,
		1,0,0,0,0,0,0,0,0,1,
		1,0,0,0,0,0,0,0,0,1,
		1,0,0,0,0,0,0,0,0,1,
		1,0,0,0,0,0,0,0,0,1,
		1,1,1,1,1,1,1,1,1,1
	}, result[N][N], visited[N][N], i, j, x=1, y=1;
	for(i=0;i<N;i++){
		for(j=0;j<N;j++){
			visited[i][j] = 0;
		}
	}
	prim(map, visited, x, y);
	print_map(map, visited);
	for(i=0;i<N;i++){
		for(j=0;j<N;j++){
			result[i][j] = 99;
			visited[i][j] = 0;
		}
	}
	dijkstra(map, result, visited, x, y);
	for(i=0;i<N;i++){
		for(j=0;j<N;j++){
			if(result[i][j] == 99) printf("  ,");
			else printf("%2d,", result[i][j]);
		}
		printf("\n");
	}
	return 0;
}
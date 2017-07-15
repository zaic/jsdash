module Solution {
    const FIELD_HEIGHT : number = 22;
    const FIELD_WIDTH : number = 40;

    enum Direction {Left, Up, Right, Down}
    const MOVEMENT: Array<[number, number]> = [[0, -1], [-1, 0], [0, 1], [1, 0]];
    export const OUTPUT = "lurd";

    class Subj {
        public static CHAR: string;

        public row: number;
        public col: number;

        constructor(row: number, col: number) {
            this.row = row;
            this.col = col;
        }
    }

    interface Fallable {
        shouldFall: boolean;
    }

    class Player extends Subj {
        public static CHAR: string = 'A';

        constructor(row: number, col: number) {
            super(row, col);
        }
    }

    class Diamon extends Subj implements Fallable {
        public static CHAR: string = '*';

        public shouldFall: boolean = false;
    }

    class Fly extends Subj {
        public static CHAR: string = '-|/\\';

        public dir: Direction;

        constructor(row: number, col: number, dir: Direction) {
            super(row, col);
            this.dir = dir;
        }

        public doTurn(screen: Array<string>) {
            let points = new Array(4);
            for (let i = 0; i < 4; i++)
                points[i] = this.point.step(i);
            let neighbors = points.map(p=>this.world.get(p));
            let locked = true;
            for (let neighbor of neighbors)
            {
                if (!neighbor)
                    locked = false;
                else if (neighbor === this.world.player)
                    return this.explode();
            }
            if (locked)
                return this.explode();
            let left = ccw(this.dir);
            if (!neighbors[left])
            {
                this.move(points[left]);
                this.dir = left;
            }
            else if (!neighbors[this.dir])
                this.move(points[this.dir]);
            else
                this.dir = cw(this.dir);
        }
    }

    export class Field {
        private screen: Array<string>;
        private player: Player;
        private diamonds: Array<Subj> = [];
        private flies: Array<Fly> = [];

        private dist: Array<Array<number>>;
        private from: Array<Array<Direction>>;

        constructor(screen: Array<string>) {
            this.screen = screen;
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    if (screen[row][col] == Player.CHAR) {
                        this.player = new Player(row, col);

                    } else if (screen[row][col] == Diamon.CHAR) {
                        this.diamonds.push(new Subj(row, col));

                    } else if (Fly.CHAR.includes(screen[row][col])) { //!todo: optimize using frame id
                        this.flies.push(new Fly(row, col, Direction.Up));
                    }
                }
            }
        }

        public doTurn(): Field {
            let screen: Array<Array<string>> = [];
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                screen.push([]);
                for (let col = 0; col < FIELD_WIDTH; ++col)
                    screen[row].push(this.screen[row][col]);
            }

            for (let fly of this.flies) {
                
            }

            let field = new Field(screen.map(s => s.join('')));
            // flies change their directions
            return field;
        }

        public debugCompare(other: Field): boolean {
            for (var row = 0; row < FIELD_HEIGHT; ++row)
                for (var col = 0; col < FIELD_WIDTH; ++col) {
                    //if (this.screen[row][col])
                    if (this.screen[row][col] != other.screen[row][col])
                        return false;
                }
            return true;
        }

        private canGo(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
            let to = this.screen[toRow][toCol];
            let fr = this.screen[fromRow][fromCol];
            if (to == 'O' || to == '+' || to == '#')
                return false;
                /*
            if (fromRow == this.player.row && fromCol == this.player.col) {
                if (to == '-' || to == '\\' || to == '/' || to == '|')
                    return false;
            }
            */
            return true;
        }

        private bfs(): [number, number, number] {
            this.dist = [];
            this.from = [];
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                this.dist.push([]);
                this.from.push([]);
                for (let col = 0; col < FIELD_WIDTH; ++col)
                    this.dist[row].push(1000);
            }

            let que: Array<[number, number]> = [[this.player.row, this.player.col]];
            this.dist[this.player.row][this.player.col] = 0;
            let front = 0;

            while (front < que.length) {
                let [row, col] = que[front++];
                let dist = this.dist[row][col];
                for (let dir = 0; dir < 4; ++dir) {
                    let [nrow, ncol] = [row + MOVEMENT[dir][0], col + MOVEMENT[dir][1]];
                    let ndist = dist + 1;
                    if (ndist < this.dist[nrow][ncol] && this.canGo(row, col, nrow, ncol)) {
                        this.dist[nrow][ncol] = ndist;
                        this.from[nrow][ncol] = dir;
                        que.push([nrow, ncol]);
                        if (this.screen[nrow][ncol] == '*')
                            return [ndist, nrow, ncol];
                    }
                }
            }
            return [100, 0, 0];
        }

        private getPath(row: number, col: number): Direction {
            let ans: Direction = Direction.Right;
            while (row != this.player.row || col != this.player.col) {
                ans = this.from[row][col];
                [row, col] = [row - MOVEMENT[ans][0], col - MOVEMENT[ans][1]];
            }
            return ans;
        }

        public getTurn(): Direction {
            let [, row, col] = this.bfs();
            return this.getPath(row, col);
        }
    };
}



declare var exports: any;
exports.play = function*(screen) {
    while (true) {
        let field = new Solution.Field(screen);
        console.log(field);

        let turn = field.getTurn();
        yield Solution.OUTPUT[turn];

        /*
        let x = field.player.col;
        let y = field.player.row;
        let moves = '';
        if (' :*'.includes(screen[y-1][x]))
            moves += 'u';
        if (' :*'.includes(screen[y+1][x]))
            moves += 'd';
        if (' :*'.includes(screen[y][x+1])
            || screen[y][x+1]=='O' && screen[y][x+2]==' ')
        {
            moves += 'r';
        }
        if (' :*'.includes(screen[y][x-1])
            || screen[y][x-1]=='O' && screen[y][x-2]==' ')
        {
            moves += 'l';
        }
        yield moves[Math.floor(Math.random()*moves.length)];
        */
    }
};

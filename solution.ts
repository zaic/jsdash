module Solution {
    const FIELD_HEIGHT : number = 22;
    const FIELD_WIDTH : number = 40;

    enum Direction {Up, Right, Down, Left}
    const MOVEMENT: Array<[number, number]> = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    export const OUTPUT = "urdl";

    //!todo: optimize directions
    function GetDirectionCW(dir: Direction): Direction {
        switch (dir) {
            case Direction.Down : return Direction.Left ;
            case Direction.Left : return Direction.Up   ;
            case Direction.Up   : return Direction.Right;
            case Direction.Right: return Direction.Down ;
        }
    }
    function GetDirectionCCW(dir: Direction): Direction {
        return GetDirectionCW(GetDirectionCW(GetDirectionCW(dir)));
    }

    class Point {
        public row: number;
        public col: number;
        
        constructor(row: number, col: number) {
            this.row = row;
            this.col = col;
        }

        public step(dir: Direction): Point {
            return new Point(this.row + MOVEMENT[dir][0], this.col + MOVEMENT[dir][1]);
        }
        public left(): Point {
            return this.step(Direction.Left);
        }
        public right(): Point {
            return this.step(Direction.Right);
        }
        public up(): Point {
            return this.step(Direction.Up);
        }
        public down(): Point {
            return this.step(Direction.Down);
        }
    }

    abstract class Subj {
        public static CHAR: string;

        public row: number;
        public col: number;
        public lastTurnedFrame: number = -1;

        protected world: World;

        constructor(row: number, col: number, world: World) {
            this.row = row;
            this.col = col;
            this.world = world;
        }

        public doTurn() {
            this.lastTurnedFrame = this.world.frame;
        }

        public point(): Point {
            return new Point(this.row, this.col);
        }

        public abstract clone(world: World): Subj;

        protected move(dir: Direction) {
            const [nrow, ncol] = [this.row + MOVEMENT[dir][0], this.col + MOVEMENT[dir][1]];
            this.world.field[nrow][ncol] = this;
            this.world.field[this.row][this.col] = null;
            [this.row, this.col] = [nrow, ncol];
        }
        protected moveToPoint(point: Point) {
            const [nrow, ncol] = [point.row, point.col];
            this.world.field[nrow][ncol] = this;
            this.world.field[this.row][this.col] = null;
            [this.row, this.col] = [nrow, ncol];
        }

        public abstract isRounded(): boolean;
        public abstract isConsumable(): boolean;

        public hit() {}

        public walkInto(): boolean { return false; }
    }

    class Brick extends Subj {
        public static CHAR: string = '+';

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public clone(world: World): Brick {
            return new Brick(this.row, this.col, world);
        }

        public isRounded(): boolean {
            return true;
        }

        public isConsumable(): boolean {
            return true;
        }
    }

    class Dirt extends Subj {
        public static CHAR: string = ':';

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public clone(world: World): Dirt {
            return new Dirt(this.row, this.col, world);
        }

        public isRounded(): boolean {
            return false;
        }

        public isConsumable(): boolean {
            return true;
        }

        public walkInto(): boolean { return true; }
    }

    abstract class Fallable extends Subj {
        protected isFalling: boolean = false;

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public doTurn() {
            super.doTurn();

            let target: Subj = this.world.get(this.row + MOVEMENT[Direction.Down][0], this.col + MOVEMENT[Direction.Down][1]);
            if (target && target.isRounded()) {
                if (this.roll(this.point().left()) || this.roll(this.point().right()))
                    return;

            }
            if (target && this.isFalling) {
                target.hit();
                this.isFalling = false;

            } else if (!target) {
                this.isFalling = true;
                this.moveToPoint(this.point().down());
            }
        }

        private roll(to: Point): boolean {
            let under = to.down();
            if (this.world.get(to.row, to.col) || this.world.get(under.row, under.col))
                return false;
            this.isFalling = true;
            this.moveToPoint(to);
            return true;
        }

        public isRounded(): boolean {
            return !this.isFalling;
        }

        public isConsumable(): boolean {
            return true;
        }
    }
    
    class Stone extends Fallable {
        public static CHAR: string = 'O';

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public clone(world: World): Stone {
            let stone = new Stone(this.row, this.col, world);
            stone.isFalling = this.isFalling;
            return stone;
        }

        public walk_into(dir: Direction) {
            if (this.isFalling || dir === Direction.Up || dir === Direction.Down)
                return false;
            let to = this.point().step(dir);
            if (!this.world.get(to.row, to.col)) {
                this.moveToPoint(to);
                return true;
            }
            return false;
        }
    }

    class Player extends Subj {
        public static CHAR: string = 'A';

        public alive: boolean = true;

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public clone(world: World): Player {
            return new Player(this.row, this.col, world);
        }

        public isRounded(): boolean {
            return false;
        }

        public isConsumable(): boolean {
            return true;
        }

        public hit() {
            this.alive = false;
        }
    }

    class EdgeWall extends Subj {
        public static CHAR: string = '#';

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public clone(world: World): EdgeWall {
            return new EdgeWall(this.row, this.col, world);
        }

        public isRounded(): boolean {
            return false;
        }

        public isConsumable(): boolean {
            return false;
        }
    }

    class Diamond extends Fallable {
        public static CHAR: string = '*';

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public clone(world: World): Diamond {
            let diamond = new Diamond(this.row, this.col, world);
            diamond.isFalling = this.isFalling;
            return diamond;
        }
    }

    class Fly extends Subj {
        public static CHAR: string = '-|/\\';

        public dir: Direction;

        constructor(row: number, col: number, world: World, dir: Direction) {
            super(row, col, world);
            this.dir = dir;
        }

        public clone(world: World): Fly {
            return new Fly(this.row, this.col, world, this.dir);
        }

        public doTurn() { //!todo: convert field from string to objects
            super.doTurn();

            let neighbors: Array<Subj> = [0, 1, 2, 3].map(p => this.world.get(
                this.row + MOVEMENT[p][0],
                this.col + MOVEMENT[p][1]
            ));

            let locked = true;
            for (let neighbor of neighbors)
            {
                if (!neighbor)
                    locked = false;
                else if (neighbor instanceof Player)
                    return this.explode();
            }
            if (locked)
                return this.explode();
                
            let left = GetDirectionCCW(this.dir);
            if (!neighbors[left]) {
                this.move(left);
                this.dir = left;

            } else if (!neighbors[this.dir]) {
                this.move(this.dir);

            } else {
                this.dir = GetDirectionCW(this.dir);
            }
        }

        private explode() {
            /*
            this.alive = false;
            let [rowFrom, rowTo] = [this.row - 1, this.row + 1];
            let [colFrom, colTo] = [this.col - 1, this.col + 1];
            for (let row = rowFrom; row <= rowTo; ++row) {
                for (let col = colFrom; col <= colTo; ++col) {
                    let point = new Point(x, y);
                    let target = this.world.get(point);
                    if (target)
                    {
                        if (!target.is_consumable())
                            continue;
                        if (target!==this)
                            target.hit();
                    }
                    this.world.set(point, new Explosion(this.world));
                }
            }
            this.world.butterfly_killed();
            */
        }

        public isRounded(): boolean {
            return false;
        }

        public isConsumable(): boolean {
            return true;
        }

        public hit() {
            this.explode();
        }

        public walk_into(dir: Direction) {
            //this.world.diamond_collected();
            return true;
        }
    }

    export class World {
        public field: Array<Array<Subj>>;

        public frame: number = 0;

        constructor(initializer: (World|Array<string>)) {
            this.field = [];
            if (initializer instanceof World)
                this.initFromField(initializer);
            else
                this.initFromScreen(initializer);
        }

        private initFromScreen(screen: Array<string>) {
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                let convertedRow: Array<Subj> = [];
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    let subj: Subj = null;

                    if (screen[row][col] === Player.CHAR) {
                        subj = new Player(row, col, this);

                    } else if (screen[row][col] === EdgeWall.CHAR) {
                        subj = new EdgeWall(row, col, this);

                    } else if (screen[row][col] === Stone.CHAR) {
                        subj = new Stone(row, col, this);

                    } else if (screen[row][col] === Brick.CHAR) {
                        subj = new Brick(row, col, this);

                    } else if (screen[row][col] === Dirt.CHAR) {
                        subj = new Dirt(row, col, this);

                    } else if (screen[row][col] === Diamond.CHAR) {
                        subj = new Diamond(row, col, this);

                    } else if (Fly.CHAR.includes(screen[row][col])) { //!todo: optimize using frame id
                        subj = new Fly(row, col, this, Direction.Up);

                    } else if (screen[row][col] === ' ') {
                        // nothing to do, empty cell

                    } else {
                        console.assert(false, "Unknow cell type", screen[row][col], "at", row, ",", col);
                    }

                    convertedRow.push(subj);
                }
                this.field.push(convertedRow);
            }
        }

        private initFromField(other: World) {
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                let convertedRow: Array<Subj> = [];
                for (let col = 0; col < FIELD_WIDTH; ++col)
                    convertedRow.push(other.field[row][col].clone(this));
                this.field.push(convertedRow);
            }
            this.frame = other.frame;
        }

        public doTurn() {
            ++this.frame;
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    let subj = this.field[row][col];
                    if (subj && subj.lastTurnedFrame < this.frame)
                        subj.doTurn();
                }
            }
        }

        public get(row: number, col: number): Subj {
            return this.field[row][col];
        }

        private compareSubjs(left: Subj, right: Subj): boolean {
            if (left instanceof Player || right instanceof Player) {
                if (!(left instanceof Player && right instanceof Player))
                    return false;

            } else if (left instanceof Fly || right instanceof Fly) {
                if (!(left instanceof Fly && right instanceof Fly))
                    return false;

            } else if (left instanceof Stone || right instanceof Stone) {
                if (!(left instanceof Stone && right instanceof Stone))
                    return false;

            } else if (left instanceof Diamond || right instanceof Diamond) {
                if (!(left instanceof Diamond && right instanceof Diamond))
                    return false;

            } else if (left instanceof Dirt || right instanceof Dirt) {
                if (!(left instanceof Dirt && right instanceof Dirt))
                    return false;
            }
            return true;
        }

        public compareWorlds(other: World): boolean {
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    let m = this.field[row][col];
                    let o = other.field[row][col];
                    console.assert(this.compareSubjs(m, o), "fail at", row, ",", col);
                }
            }
            return true;
        }
    }

    export class Field {
        private screen: Array<string>;
        private player: Player;
        private Diamondds: Array<Subj> = [];
        private flies: Array<Fly> = [];

        private dist: Array<Array<number>>;
        private from: Array<Array<Direction>>;

        constructor(screen: Array<string>) {
            this.screen = screen;
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    if (screen[row][col] == Player.CHAR) {
                        this.player = new Player(row, col, null);

                    } else if (screen[row][col] == Diamond.CHAR) {
                        this.Diamondds.push(new Diamond(row, col, null));

                    } else if (Fly.CHAR.includes(screen[row][col])) { //!todo: optimize using frame id
                        this.flies.push(new Fly(row, col, null, Direction.Up));
                    }
                }
            }
        }

        private canGo(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
            let to = this.screen[toRow][toCol];
            let fr = this.screen[fromRow][fromCol];
            if (to == 'O' || to == '+' || to == '#')
                return false;
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
    var lastWorld: Solution.World;
    while (true) {
        /*
        let field = new Solution.Field(screen);
        console.log(field);
        let turn = field.getTurn();
        yield Solution.OUTPUT[turn];
        */

        let world = new Solution.World(screen);

        if (lastWorld)
            console.warn("compare", world.compareWorlds(lastWorld));
        else
            lastWorld = world;

        lastWorld.doTurn();
        yield 't';

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

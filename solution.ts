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

        public distTo(other: Point): number {
            return Math.abs(this.row - other.row) + Math.abs(this.col - other.col);
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
            return this.moveToPoint(new Point(nrow, ncol));
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

        public walkInto(dir: Direction): boolean { return false; }
    }

    class Babah extends Subj {
        public stage: number = 0;

        constructor(row: number, col: number, world: World) {
            super(row, col, world);
        }

        public clone(world: World): Babah {
            let babah = new Babah(this.row, this.col, world);
            babah.stage = this.stage;
            return babah;
        }

        public doTurn() {
            super.doTurn();
            ++this.stage;
            if (this.stage > 3)
                this.world.set(this.row, this.col, new Diamond(this.row, this.col, this.world));
        }

        public isRounded(): boolean {
            return false;
        }

        public isConsumable(): boolean {
            return false;
        }
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

        public walkInto(dir: Direction) {
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
        public turnDirection: Direction = null;

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
            this.alive;
            this.world.playerKilled();
        }

        public doTurn() {
            super.doTurn();
            if (this.turnDirection === null)
                return;
            let to = this.point().step(this.turnDirection);
            let target = this.world.get(to.row, to.col);
            if (!target || target.walkInto(this.turnDirection))
                this.moveToPoint(to);
            this.turnDirection = null;
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


        public walkInto(dir: Direction) {
            this.world.diamondEated();
            return true;
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
            //console.assert(false, "explode", this.row, this.col);
            // this.alive = false;
            let [rowFrom, rowTo] = [this.row - 1, this.row + 1];
            let [colFrom, colTo] = [this.col - 1, this.col + 1];
            for (let row = rowFrom; row <= rowTo; ++row) {
                for (let col = colFrom; col <= colTo; ++col) {
                    let target = this.world.get(row, col);
                    if (target) {
                        if (!target.isConsumable())
                            continue;
                        if (target !== this)
                            target.hit();
                    }
                    //console.warn("reset", row, col);
                    let bah = new Babah(row, col, this.world);
                    this.world.set(row, col, bah);
                    bah.lastTurnedFrame = this.world.frame;
                }
            }
            this.world.flyKilled();
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
    }

    class Score {
        public killedFlies: number = 0;
        public eatedDiamonds: number = 0;
        public lastEatedDiamond: number = 0;
        public nearestDiamonDist: number = 0;
        public isAlive: boolean = true;

        private cachedScore: number = 0;
        public updateScore(): number {
            this.cachedScore = 0;
            //this.cachedScore += this.killedFlies * 1000000;
            this.cachedScore += this.eatedDiamonds * 500;
            this.cachedScore -= this.nearestDiamonDist;
            this.cachedScore -= this.lastEatedDiamond;
            return this.cachedScore + 1000;
        }

        public clone(): Score {
            let score = new Score();
            score.killedFlies = this.killedFlies;
            score.eatedDiamonds = this.eatedDiamonds;
            score.lastEatedDiamond = this.lastEatedDiamond;
            score.isAlive = this.isAlive;
            return score;
        }

        public isBetter(other: Score): boolean {
            if (this.isAlive != other.isAlive)
                return this.isAlive;
            if (this.killedFlies != other.killedFlies)
                return this.killedFlies > other.killedFlies;
            return this.cachedScore > other.cachedScore;
        }
    }

    export class World {
        public field: Array<Array<Subj>>;
        public frame: number = 0;
        private playerTurn: Direction = null;
        public player: Player = null;

        private isOriginaWorld = false;
        private diamonds: Array<Diamond> = [];

        public initialTurn: Direction = null;
        private score: Score = new Score();

        public isBetter(other: World): boolean {
            return this.score.isBetter(other.score);
        }

        constructor(initializer: (World|Array<string>)) {
            this.field = [];
            if (initializer instanceof World)
                this.initFromField(initializer);
            else
                this.initFromScreen(initializer);
        }

        private initInternalData() {
            this.diamonds = [];
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    let subj = this.field[row][col];
                    if (subj instanceof Diamond) {
                        const dist = this.player.point().distTo(subj.point());
                        if (dist > Hujak.hujakDeepSize)
                            this.diamonds.push(subj);
                    }
                }
            }
            this.score.nearestDiamonDist = 100500;
        }

        private updateScoreData() {
            if (!this.player)
                return ;
            this.score.nearestDiamonDist = 100500;
            for (let diamond of this.diamonds) {
                const dist = this.player.point().distTo(diamond.point());
                if (dist < this.score.nearestDiamonDist)
                    this.score.nearestDiamonDist = dist;
            }
            this.score.updateScore();
        }

        private initFromScreen(screen: Array<string>) {
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                let convertedRow: Array<Subj> = [];
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    let subj: Subj = null;

                    if (screen[row][col] === Player.CHAR) {
                        this.player = new Player(row, col, this);
                        subj = this.player;

                    } else if (screen[row][col] === EdgeWall.CHAR) {
                        subj = new EdgeWall(row, col, this);

                    } else if (screen[row][col] === Stone.CHAR) {
                        subj = new Stone(row, col, this);

                    } else if (screen[row][col] === Brick.CHAR) {
                        subj = new Brick(row, col, this);

                    } else if (screen[row][col] === Dirt.CHAR) {
                        subj = new Dirt(row, col, this);

                    } else if (screen[row][col] === Diamond.CHAR) {
                        let diamond = new Diamond(row, col, this);
                        subj = diamond;

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
            this.isOriginaWorld = true;
            this.initInternalData();
        }

        private initFromField(other: World) {
            for (let row = -Hujak.hujakDeepSize; row <= FIELD_HEIGHT + Hujak.hujakDeepSize; ++row)
                this.field[row] = [];
            const rowFr = Math.max(other.player.row - Hujak.hujakDeepSize, 0);
            const rowTo = Math.min(other.player.row + Hujak.hujakDeepSize, FIELD_HEIGHT - 1); // inclusive
            for (let row = rowFr; row <= rowTo; ++row) {
                const offset = Hujak.hujakDeepSize - Math.abs(row - other.player.row);
                const colFr = Math.max(other.player.col - offset, 0);
                const colTo = Math.min(other.player.col + offset, FIELD_WIDTH - 1);
                for (let col = colFr; col <= colTo; ++col) {
                    const osubj = other.field[row][col];
                    if (osubj) {
                        const csubj = osubj.clone(this);
                        this.field[row][col] = csubj;
                    }
                }
            }
            this.player = this.field[other.player.row][other.player.col] as Player; // infa 146%
            this.frame = other.frame;
            this.diamonds = other.diamonds; // initial diamonds list
            
            this.initialTurn = other.initialTurn;
            this.score = other.score.clone();
        }

        public setPlayerTurn(dir: Direction) {
            if (this.player)
                this.player.turnDirection = this.playerTurn = dir;
        }

        public doTurn(): boolean {
            return this.isOriginaWorld ? this.doFullTurn() : this.doFastTurn();
        }

        private doFastTurn(): boolean {
            ++this.frame;
            let playerMoved = false;
            const rowFr = Math.max(this.player.row - Hujak.hujakDeepSize, 0);
            const rowTo = Math.min(this.player.row + Hujak.hujakDeepSize, FIELD_HEIGHT - 1); // inclusive
            for (let row = rowFr; row <= rowTo; ++row) {
                const offset = Hujak.hujakDeepSize - Math.abs(row - this.player.row);
                const colFr = Math.max(this.player.col - offset, 0);
                const colTo = Math.min(this.player.col + offset, FIELD_WIDTH - 1);
                for (let col = colFr; col <= colTo; ++col) {
                    let subj = this.field[row][col];
                    if (subj instanceof Player && subj.lastTurnedFrame < this.frame) {
                        subj.turnDirection = this.playerTurn;
                        const prevPosition = subj.point();
                        subj.doTurn();
                        const currPosition = subj.point();
                        if (prevPosition.row != currPosition.row || prevPosition.col != currPosition.col)
                            playerMoved = true;

                    } else if (subj && subj.lastTurnedFrame < this.frame) {
                        subj.doTurn();
                    }
                }
            }
            this.updateScoreData();
            return playerMoved;
        }

        private doFullTurn(): boolean {
            ++this.frame;
            let playerMoved = false;
            for (let row = 0; row < FIELD_HEIGHT; ++row) {
                for (let col = 0; col < FIELD_WIDTH; ++col) {
                    let subj = this.field[row][col];
                    if (subj instanceof Player && subj.lastTurnedFrame < this.frame) {
                        subj.turnDirection = this.playerTurn;
                        const prevPosition = subj.point();
                        subj.doTurn();
                        const currPosition = subj.point();
                        if (prevPosition.row != currPosition.row || prevPosition.col != currPosition.col)
                            playerMoved = true;

                    } else if (subj && subj.lastTurnedFrame < this.frame) {
                        subj.doTurn();
                    }
                }
            }
            this.initInternalData();
            return playerMoved;
        }

        public get(row: number, col: number): Subj {
            return this.field[row][col];
        }

        public set(row: number, col: number, subj: Subj) {
            this.field[row][col] = subj;
        }

        private compareSubjs(left: Subj, right: Subj): boolean {
            const classTypes: Array<Function> = [Player, Fly, Stone, Dirt, Brick];
            for (const classType of classTypes) {
                const ltCondition = left  instanceof classType;
                const rtCondition = right instanceof classType
                if (ltCondition || rtCondition)
                    if (!(ltCondition && rtCondition))
                        return false;
            }

            let ld = left instanceof Diamond || left instanceof Babah;
            let rd = right instanceof Diamond || right instanceof Babah;
            if (ld || rd) {
                if (!(ld && rd))
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

        public debugGetScore(): number {
            return this.score.updateScore();
        }



        public flyKilled() {
            this.score.killedFlies++;
        }

        public diamondEated() {
            this.score.eatedDiamonds++;
            this.score.lastEatedDiamond = this.frame;
        }

        public playerKilled() {
            this.score.isAlive = false;
        }
    }

    export class Hujak {
        public static hujakDeepSize = 8;

        private static deepSize: number = 8;
        private static bestSize: number = 100;

        public hujak(start: World): Direction {
            let prev: Array<World> = [start];
            let best: World = start;
            for (let iter = 0; iter < Hujak.deepSize; ++iter) {
                let next: Array<World> = [];
                for (let world of prev) {
                    for (let dir of [Direction.Up, Direction.Right, Direction.Down, Direction.Left]) {
                        let cloned = new World(world);
                        if (cloned.initialTurn === null)
                            cloned.initialTurn = dir;
                        cloned.setPlayerTurn(dir);
                        if (cloned.doTurn()) {
                            if (cloned.isBetter(best))
                                best = cloned;
                            next.push(cloned);
                        }
                        //console.warn("!!!", cloned.player.point());
                    }
                }
                //console.warn("iteration", iter, next.length, "                     ");
                prev = next.sort((best: World, curr: World) => best.isBetter(curr) ? -1 : 1).slice(0, Hujak.bestSize);
                if (prev.length === 0)
                    break;
                //console.warn("best score is", prev[0].debugGetScore(), "              ");
            }

            //const best = prev.reduce((best: World, curr: World) => best.getScore() > curr.getScore() ? best : curr);
            //console.warn("best", best.debugGetScore(), "                   ");
            return best.initialTurn;
        }
    }
}

declare var exports: any;
exports.play = function*(screen) {
    var homjak: Solution.World;
    while (true) {
        let world = new Solution.World(screen);

        if (homjak)
            console.warn("compare", world.compareWorlds(homjak));
        else
            homjak = world;

        let hujak = new Solution.Hujak();
        let escheHomjak = hujak.hujak(homjak);
        homjak.setPlayerTurn(escheHomjak);
        homjak.doTurn();
        yield Solution.OUTPUT[escheHomjak];
    }
};

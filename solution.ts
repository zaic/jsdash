module Solution {
    const FIELD_SIZE : number = 40;

    enum Direction {Left, Up, Right, Down}

    class Subj {
        public row: number;
        public col: number;

        constructor(row: number, col: number) {
            this.row = row;
            this.col = col;
        }
    }

    export class Player extends Subj {
        constructor(row: number, col: number) {
            super(row, col);
        }
    }

    export class Field {
        public player: Player;

        constructor(screen: Array<string>) {
            for (let row = 0; row < FIELD_SIZE; ++row) {
                for (let col = 0; col < FIELD_SIZE; ++col) {
                    if (screen[row][col] == 'A') {
                        this.player = new Player(row, col);
                        break;
                    }
                }
                if (this.player)
                    break;
            }
        }
    };
}



declare var exports: any;
exports.play = function*(screen) {
    while (true) {
        let field = new Solution.Field(screen);
        console.log(field);

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
    }
};

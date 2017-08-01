import Direction = Solution.Direction;
import MOVEMENT = Solution.MOVEMENT;

namespace Geometry {
    export class Point {
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
}


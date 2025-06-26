export class CircularBuffer {
    private buffer: number[];
    private maxSize: number;
    private head: number;
    private tail: number;
    private full: boolean;

    constructor(capacity: number) {
        this.buffer = new Array(capacity);
        this.maxSize = capacity;
        this.head = 0;
        this.tail = 0;
        this.full = false;
    }

    push(item: number): void {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.maxSize;
        if (this.full) {
            this.tail = (this.tail + 1) % this.maxSize;  // Move tail when overwriting
        } else if (this.head === this.tail) {
            this.full = true;  // Mark as full when head catches up to tail
        }
    }

    pop(): number | null {
        if (this.empty()) {
            return null;
        }
        const output = this.buffer[this.tail];
        this.tail = (this.tail + 1) % this.maxSize;
        this.full = false;
        return output;
    }

    empty(): boolean {
        return (!this.full && (this.head === this.tail));
    }

    isFull(): boolean {
        return this.full;
    }

    size(): number {
        if (this.full) return this.maxSize;
        if (this.head >= this.tail) return this.head - this.tail;
        return this.maxSize + this.head - this.tail;
    }

    capacity(): number {
        return this.maxSize;
    }

    clear(): void {
        this.head = 0;
        this.tail = 0;
        this.full = false;
    }

    // Iterator support using JavaScript's Symbol.iterator
    *[Symbol.iterator](): Iterator<number> {
        if (this.empty()) {
            return;
        }

        let position = this.tail;
        let count = 0;
        const size = this.size();

        while (count < size) {
            yield this.buffer[position];
            position = (position + 1) % this.maxSize;
            count++;
        }
    }

    // Additional helper methods for easier usage
    toArray(): number[] {
        return Array.from(this);
    }

    peek(): number | null {
        if (this.empty()) {
            return null;
        }
        return this.buffer[this.tail];
    }
}

const MovementDirection = { Up: "up", Right: "right", Down: "down", Left: "left" };

const SIZE = 6;

class Step {
    constructor(carId, direction, row, col) {
        this.carId = carId;
        this.direction = direction;
        this.row = row;
        this.col = col;
    }
};

function setCharAt(str, index, chr) {
    if (index > str.length - 1) return str;
    return str.substring(0, index) + chr + str.substring(index + 1);
}

const buildBoard = (hash) => {
    const board = [];
    for (let i = 0; i < SIZE; i++) {
        const row = [];
        for (let j = 0; j < SIZE; j++) {
            const slot = hash[i * SIZE + j];
            row.push(slot);
        }
        board.push(row);
    }
    return board;
}

function boardToStr(board) {
    let str = '';
    for (let i = 0; i < board.length; i++) {
        const row = board[i];
        for (let j = 0; j < row.length; j++) {
            const slot = row[j];
            str += slot.toString();
        }
    }
    return str;
}

function getIncremets(direction) {
    switch (direction) {
        case MovementDirection.Up: return -SIZE;
        case MovementDirection.Right: return 1;
        case MovementDirection.Down: return SIZE;
        case MovementDirection.Left: return -1;
    }
    return 0;
}

function applyMove(hash, move) {
    const inc = getIncremets(move.direction);
    const r = move.row * SIZE + move.col;
    let carId = hash[r];
    let newHash = setCharAt(hash, r + inc, carId);
    const twoSlotsAway = r - inc * 2;
    if (twoSlotsAway < 0 || newHash[twoSlotsAway] !== carId) newHash = setCharAt(newHash, r - inc, '0');
    else newHash = setCharAt(newHash, r - inc * 2, '0');
    return newHash;
}

function findAvailableMovements(hash) {
    const moves = [];
    for (let i = 0; i < SIZE; i++) {
        let isLeftEmpty = false;
        let isTopEmpty = false;
        let previousHorSlot = 0;
        let previousVerSlot = 0;
        for (let j = 0; j < SIZE; j++) {
            // check horizontal
            const r = j + (i * SIZE);
            let slot = hash[r];
            if (slot !== '0' && previousHorSlot === slot) {
                if (isLeftEmpty) moves.push(new Step(slot, MovementDirection.Left, i, j - 1));
                if (j < SIZE - 1 && hash[r + 1] === '0') moves.push(new Step(slot, MovementDirection.Right, i, j));
            }
            isLeftEmpty = previousHorSlot === '0';
            previousHorSlot = slot;
            // check vertical
            const c = i + (j * SIZE);
            slot = hash[c];
            if (slot !== '0' && previousVerSlot === slot) {
                if (isTopEmpty) moves.push(new Step(slot, MovementDirection.Up, j - 1, i));
                if (j < SIZE - 1 && hash[c + SIZE] === '0') moves.push(new Step(slot, MovementDirection.Down, j, i));
            }
            isTopEmpty = previousVerSlot === '0';
            previousVerSlot = slot;
        }
    }
    return moves;
}

function findNextMoves(initialState, states) {
    const stack = [initialState];
    while (stack.length > 0) {
        const currentState = stack.pop();
        const nextMovements = findAvailableMovements(currentState.hash);
        for (let i = 0; i < nextMovements.length; i++) {
            const movement = nextMovements[i];
            const nextHash = applyMove(currentState.hash, movement);
            const won = nextHash[16] === '1' && nextHash[17] === '1';
            const nextState = {
                hash: nextHash,
                nextHashes: [],
                won,
                previousMovements: {}
            };
            if (nextHash in states) {
                currentState.nextHashes.push({ hash: nextHash, movement });
            } else {
                states[nextHash] = nextState;
                currentState.nextHashes.push({ hash: nextHash, movement });
                currentState.invalid = false;
                if (!nextState.won) stack.push(nextState);
            }
            states[nextHash].previousMovements[currentState.hash] = movement;
        }
    }
}

function calculateSteps(hash, states, visited) {
    const stack = [hash];
    while (stack.length > 0) {
        const hash = stack.pop();
        const state = states[hash];
        if (hash in visited && state.steps >= visited[hash]) {
            continue;
        } else {
            visited[hash] = state.steps;
        }
        for (let i = 0; i < state.nextHashes.length; i++) {
            const nextHash = state.nextHashes[i];
            const steps = state.steps + 1;
            const nextState = states[nextHash.hash];
            if ((!nextState.steps || nextState.steps > steps) && nextState.steps !== 0) {
                nextState.steps = steps;
                nextState.previousHash = hash;
            }
        }
        for (let i = 0; i < state.nextHashes.length; i++) {
            const nextHash = state.nextHashes[i];
            stack.push(nextHash.hash);
        }
    }
}

function findShortestPath(initialHash, states) {
    calculateSteps(initialHash, states, {});
    let bestHash = '';
    let bestHashSteps = 0;
    for (const hash of Object.keys(states)) {
        const step = states[hash];
        if (step.won) {
            if (step.steps < bestHashSteps || bestHashSteps === 0) {
                bestHash = step.hash;
                bestHashSteps = step.steps;
            }
        }
    }
    const bestPath = [];
    if (bestHash in states) {
        let currentState = states[bestHash];
        while (currentState) {
            if (currentState.previousHash) {
                bestPath.push(currentState.previousMovements[currentState.previousHash]);
            }
            currentState = states[currentState.previousHash];
        }
    }
    return bestPath;
}

function unblockCar(board) {
    const states = {};
    const initialHash = boardToStr(board);
    const initialState = {
        hash: initialHash,
        nextHashes: [],
        won: false,
        steps: 0,
        previousMovements: {},
    }
    states[initialHash] = initialState;
    findNextMoves(initialState, states);
    return findShortestPath(initialHash, states);
}

function log(steps) {
    let c = 1;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.invalid) continue;
        console.log(`[${i}] Car ${step.carId} ${step.direction}`);
    }
    console.log('-----------------------------');
}

function boardToInt(board) {
    let hash = 10000000000000000;
}

console.log("Solving Case 1 with 2 moves");
let steps = unblockCar([
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
]);
log(steps);

console.log("Solving Case 2 (unsolvable)");
let steps2 = unblockCar([
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 1, 1, 2, 2, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
]);
log(steps2);

console.log("Solving Case 3 with 6 moves");
let steps3 = unblockCar([
    [0, 0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0, 0],
    [1, 1, 2, 3, 0, 0],
    [0, 0, 0, 3, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
]);
log(steps3);

console.log("Solving Case 4 with 25 moves");
let steps4 = unblockCar([
    [2, 2, 2, 0, 0, 3],
    [0, 0, 4, 0, 0, 3],
    [1, 1, 4, 0, 0, 3],
    [5, 0, 4, 0, 6, 6],
    [5, 0, 0, 0, 7, 0],
    [8, 8, 8, 0, 7, 0],
]);
log(steps4);

console.log("Solving Case 5 with 42 moves");
let steps5 = unblockCar([
    [0, 0, 2, 3, 0, 0],
    [0, 0, 2, 3, 0, 'A'],
    [1, 1, 2, 3, 8, 'A'],
    [0, 5, 0, 0, 8, 9],
    [4, 5, 7, 7, 8, 9],
    [4, 6, 6, 0, 0, 0],
]);
log(steps5);

console.log("Solving Case 6 with 93 moves (hardest initial configuration)");
let steps6 = unblockCar([
    [7, 7, 7, 4, 5, 6],
    [8, 9, 9, 4, 5, 6],
    [8, 0, 1, 1, 5, 6],
    ['A', 'A', 3, 0, 0, 0],
    [0, 2, 3, 0, 'D', 'D'],
    [0, 2, 'B', 'B', 'C', 'C'],
]);
log(steps6);
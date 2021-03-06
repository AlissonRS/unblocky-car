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

function applyMove(board, move) {
    const inc = getIncremets(move.direction);
    const r = move.row * SIZE + move.col;
    let carId = board[r];
    let newHash = setCharAt(board, r + inc, carId);
    const twoSlotsAway = r - inc * 2;
    if (twoSlotsAway < 0 || newHash[twoSlotsAway] !== carId) newHash = setCharAt(newHash, r - inc, '0');
    else newHash = setCharAt(newHash, r - inc * 2, '0');
    return newHash;
}

function findAvailableMovements(board) {
    const moves = [];
    for (let i = 0; i < SIZE; i++) {
        let isLeftEmpty = false;
        let isTopEmpty = false;
        let previousHorSlot = 0;
        let previousVerSlot = 0;
        for (let j = 0; j < SIZE; j++) {
            // check horizontal
            const r = j + (i * SIZE);
            let slot = board[r];
            if (slot !== '0' && previousHorSlot === slot) {
                if (isLeftEmpty) moves.push(new Step(slot, MovementDirection.Left, i, j - 1));
                if (j < SIZE - 1 && board[r + 1] === '0') moves.push(new Step(slot, MovementDirection.Right, i, j));
            }
            isLeftEmpty = previousHorSlot === '0';
            previousHorSlot = slot;
            // check vertical
            const c = i + (j * SIZE);
            slot = board[c];
            if (slot !== '0' && previousVerSlot === slot) {
                if (isTopEmpty) moves.push(new Step(slot, MovementDirection.Up, j - 1, i));
                if (j < SIZE - 1 && board[c + SIZE] === '0') moves.push(new Step(slot, MovementDirection.Down, j, i));
            }
            isTopEmpty = previousVerSlot === '0';
            previousVerSlot = slot;
        }
    }
    return moves;
}

function findNextMoves(states, stack, stateIndexes) {
    let stackSize = 1;
    let stateCount = 1;
    while (stackSize > 0) {
        stackSize--;
        const currentBoard = stack[stackSize];
        let idx = stateIndexes[currentBoard];
        const currentState = states[idx];
        const nextMovements = findAvailableMovements(currentState.board);
        for (let i = 0; i < nextMovements.length; i++) {
            const movement = nextMovements[i];
            const nextBoard = applyMove(currentState.board, movement);
            const won = nextBoard[16] === '1' && nextBoard[17] === '1';
            idx = stateIndexes[nextBoard];
            if (!idx) {
                states.push({
                    board: nextBoard,
                    nextStates: [],
                    won,
                    previousMovements: {}
                });
                stateCount++;
                idx = stateCount;
                stateIndexes[nextBoard] = idx;
            }
            const nextState = states[idx];
            if (nextState.isValid) {
                currentState.nextStates.push({ board: nextBoard, movement });
            } else {
                currentState.nextStates.push({ board: nextBoard, movement });
                currentState.isValid = true;
                if (!nextState.won) {
                    stack[stackSize] = nextBoard;
                    stackSize++;
                }
            }
            nextState.previousMovements[currentState.board] = movement;
        }
    }
}

function calculateSteps(board, states, visited, stack, stateIndexes) {
    stack[0] = board;
    let stackSize = 1;
    while (stackSize > 0) {
        stackSize--;
        const board = stack[stackSize];
        let idx = stateIndexes[board];
        const state = states[idx];
        if (board in visited && state.steps >= visited[board]) {
            continue;
        } else {
            visited[board] = state.steps;
        }
        for (let i = 0; i < state.nextStates.length; i++) {
            const nextBoard = state.nextStates[i];
            const steps = state.steps + 1;
            idx = stateIndexes[nextBoard.board];
            const nextState = states[idx];
            if ((!nextState.steps || nextState.steps > steps) && nextState.steps !== 0) {
                nextState.steps = steps;
                nextState.previousBoard = board;
            }
        }
        for (let i = 0; i < state.nextStates.length; i++) {
            const nextBoard = state.nextStates[i];
            stack[stackSize] = nextBoard.board;
            stackSize++;
        }
    }
}

function findShortestPath(initialBoard, states, stack, stateIndexes) {
    calculateSteps(initialBoard, states, {}, stack, stateIndexes);
    let bestHash = '';
    let bestHashSteps = 0;
    for (let i = 1; i < states.length; i++) {
        const state = states[i];
        if (!state) break;
        if (state.won) {
            if (state.steps < bestHashSteps || bestHashSteps === 0) {
                bestHash = state.board;
                bestHashSteps = state.steps;
            }
        }
    }
    const bestPath = [];
    if (bestHash in stateIndexes) {
        let idx = stateIndexes[bestHash];
        let currentState = states[idx];
        while (currentState) {
            if (currentState.previousBoard) {
                bestPath.push(currentState.previousMovements[currentState.previousBoard]);
            }
            idx = stateIndexes[currentState.previousBoard];
            currentState = states[idx];
        }
    }
    return bestPath;
}

function unblockCar(board) {
    const stateIndexes = {};
    const states = [];
    const initialBoard = boardToStr(board);
    const initialState = {
        board: initialBoard,
        nextStates: [],
        won: false,
        steps: 0,
        previousMovements: {},
    }
    stateIndexes[initialBoard] = 1;
    states.push(null);
    states.push(initialState);
    const stack = [];
    for (let i = 0; i < 12000; i++) {
        stack.push(0);
    }
    stack[0] = initialBoard;
    findNextMoves(states, stack, stateIndexes);
    return findShortestPath(initialBoard, states, stack, stateIndexes);
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
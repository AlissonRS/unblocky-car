//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

contract UnblockyCar {
    uint8 constant SIZE = 6;

    enum Direction {
        Up,
        Down,
        Left,
        Right
    }

    struct Step {
        uint256 carId;
        Direction direction;
        uint256 row;
        uint256 col;
    }

    struct Vertex {
        uint256 board;
        Step movement;
    }

    struct State {
        uint256 board;
        Vertex[] nextStates;
        bool won;
        mapping(uint256 => Step) previousMovements;
        bool isValid;
        bool isRoot;
        uint256 steps;
        uint256 previousBoard;
    }

    struct StateVisit {
        bool hasVisited;
        uint256 steps;
    }

    uint256[] public stack;
    uint256[] public stateKeys;
    mapping(uint256 => State) public states;
    Step[] public bestPath;
    mapping(uint256 => StateVisit) public visited;

    function hashBoard(uint8[6][6] memory board) public pure returns (uint256) {
        uint256 base = 1000000000000000000000000000000000000;
        for (uint256 i = 0; i < SIZE; i++) {
            for (uint256 j = 0; j < SIZE; j++) {
                uint256 r = i * SIZE + j;
                uint256 exp = 36 - r - 1;
                uint8 slot = board[i][j];
                base += slot * (10**exp);
            }
        }
        return base;
    }

    function getIncrements(Direction direction) public pure returns (int8) {
        if (direction == Direction.Up) {
            return -int8(SIZE);
        } else if (direction == Direction.Down) {
            return int8(SIZE);
        } else if (direction == Direction.Left) {
            return -1;
        } else if (direction == Direction.Right) {
            return 1;
        }
        return 0;
    }

    function applyMove(uint256 key, Step memory move)
        public
        view
        returns (uint256)
    {
        int256 inc = getIncrements(move.direction);
        int256 r = int256(uint256(move.row * SIZE + move.col));
        uint256 carId = getPosition(key, uint256(r));
        uint256 newKey = replaceDigit(key, uint256(r + inc), carId);
        int256 twoSlotsAway = int256(r) - inc * 2;
        if (
            twoSlotsAway < 0 ||
            twoSlotsAway > 35 ||
            carId != getPosition(newKey, uint256(twoSlotsAway))
        ) newKey = replaceDigit(newKey, uint256(r - inc), 0);
        else {
            newKey = replaceDigit(newKey, uint256(r - inc * 2), 0);
        }
        return newKey;
    }

    function calculateSteps(uint256 initialKey) public {
        stack.push(initialKey);
        while (stack.length > 0) {
            uint256 key = stack[stack.length - 1];
            stack.pop();
            State storage state = states[key];
            StateVisit storage visit = visited[key];
            if (visit.hasVisited && state.steps >= visit.steps) {
                continue;
            } else {
                visit.steps = state.steps;
                visit.hasVisited = true;
            }
            for (uint256 i = 0; i < state.nextStates.length; i++) {
                Vertex storage vertex = state.nextStates[i];
                uint256 steps = state.steps + 1;
                State storage nextState = states[vertex.board];
                if (
                    (!nextState.isRoot && nextState.steps == 0) ||
                    nextState.steps > steps
                ) {
                    nextState.steps = steps;
                    nextState.previousBoard = key;
                }
            }
            for (uint256 i = 0; i < state.nextStates.length; i++) {
                Vertex storage vertex = state.nextStates[i];
                stack.push(vertex.board);
            }
        }
    }

    function findAvailableMovements(uint256 key)
        public
        view
        returns (Step[] memory)
    {
        Step[] memory nextMovements = new Step[](36);
        uint256 pos = 0;
        for (uint256 i = 0; i < SIZE; i++) {
            bool isLeftEmpty = false;
            bool isTopEmpty = false;
            uint256 previousHorSlot = 100;
            uint256 previousVerSlot = 100;
            for (uint256 j = 0; j < SIZE; j++) {
                // check horizontal
                uint256 r = j + (i * SIZE);
                uint256 slot = getPosition(key, r);
                if (slot != 0 && previousHorSlot == slot) {
                    if (isLeftEmpty) {
                        nextMovements[pos] = Step(
                            slot,
                            Direction.Left,
                            i,
                            j - 1
                        );
                        pos++;
                    }
                    if (j < SIZE - 1 && getPosition(key, r + 1) == 0) {
                        nextMovements[pos] = Step(slot, Direction.Right, i, j);
                        pos++;
                    }
                }
                isLeftEmpty = previousHorSlot == 0;
                previousHorSlot = slot;
                // check vertical
                uint256 c = i + (j * SIZE);
                slot = getPosition(key, c);
                if (slot != 0 && previousVerSlot == slot) {
                    if (isTopEmpty) {
                        nextMovements[pos] = Step(slot, Direction.Up, j - 1, i);
                        pos++;
                    }
                    if (j < SIZE - 1 && getPosition(key, c + SIZE) == 0) {
                        nextMovements[pos] = Step(slot, Direction.Down, j, i);
                        pos++;
                    }
                }
                isTopEmpty = previousVerSlot == 0;
                previousVerSlot = slot;
            }
        }
        return nextMovements;
    }

    function findNextMoves() public {
        uint256 targetCar = 1;
        while (stack.length > 0) {
            uint256 currentBoard = stack[stack.length - 1];
            stack.pop();
            State storage currentState = states[currentBoard];
            Step[] memory nextMovements = findAvailableMovements(
                currentState.board
            );
            for (uint256 i = 0; i < nextMovements.length; i++) {
                Step memory movement = nextMovements[i];
                if (movement.carId == 0) break;
                uint256 nextBoard = applyMove(currentState.board, movement);
                uint256 finalSlot1 = getPosition(nextBoard, 16);
                uint256 finalSlot2 = getPosition(nextBoard, 17);
                State storage nextState = states[nextBoard];
                nextState.board = nextBoard;
                nextState.won =
                    finalSlot1 == targetCar &&
                    finalSlot2 == targetCar;
                if (nextState.isValid) {
                    currentState.nextStates.push(Vertex(nextBoard, movement));
                } else {
                    nextState.isValid = true;
                    stateKeys.push(nextBoard);
                    currentState.nextStates.push(Vertex(nextBoard, movement));
                    if (!nextState.won) stack.push(nextBoard);
                }
                nextState.previousMovements[currentState.board] = movement;
            }
        }
    }

    function findShortestPath(uint256 initialKey) public {
        calculateSteps(initialKey);
        uint256 bestHash = 0;
        uint256 bestHashSteps = 0;
        for (uint256 i = 0; i < stateKeys.length; i++) {
            uint256 key = stateKeys[i];
            State storage state = states[key];
            if (state.won) {
                if (state.steps < bestHashSteps || bestHashSteps == 0) {
                    bestHash = state.board;
                    bestHashSteps = state.steps;
                }
            }
        }
        if (bestHash > 0) {
            State storage currentState = states[bestHash];
            while (currentState.previousBoard > 0) {
                bestPath.push(
                    currentState.previousMovements[currentState.previousBoard]
                );
                currentState = states[currentState.previousBoard];
            }
        }
    }

    function getBestPath() public view returns (Step[] memory) {
        return bestPath;
    }

    function getStack() public view returns (uint256[] memory) {
        return stack;
    }

    function getStateKeys() public view returns (uint256) {
        return stateKeys.length;
    }

    function replaceDigit(
        uint256 key,
        uint256 index,
        uint256 digit
    ) public pure returns (uint256) {
        uint256 currentDigit = getPosition(key, index);
        uint256 exp = 35 - index;
        uint256 sub = currentDigit * (10**exp);
        return key - sub + digit * (10**exp);
    }

    function getPosition(uint256 key, uint256 index)
        public
        pure
        returns (uint256)
    {
        uint256 p = 35 - index;
        uint256 pow = 10**p;
        return (key / pow) % 10;
    }

    function unblockCar(uint8[6][6] memory board)
        public
        returns (Step[] memory)
    {
        uint256 initialBoard = hashBoard(board);
        stack.push(initialBoard);
        stateKeys.push(initialBoard);
        State storage initialState = states[initialBoard];
        initialState.board = initialBoard;
        initialState.isRoot = true;
        findNextMoves();
        findShortestPath(initialBoard);
        console.log("keys: ", stateKeys.length);
        return bestPath;
    }
}

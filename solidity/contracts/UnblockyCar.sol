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
        uint8 carId;
        Direction direction;
        uint8 row;
        uint8 col;
    }

    struct StateConnection {
        uint128 board;
        Step movement;
    }

    struct State {
        uint128 board;
        StateConnection[] nextStates;
        bool won;
        mapping(uint128 => Step) previousMovements;
        bool isValid;
        bool isRoot;
        uint8 steps;
        uint128 previousBoard;
    }

    struct StateVisit {
        bool hasVisited;
        uint8 steps;
    }

    uint128[] public stateKeys;
    mapping(uint128 => State) public states;
    Step[] public bestPath;
    mapping(uint128 => StateVisit) public visited;

    function hashBoard(uint8[6][6] memory board) public pure returns (uint128) {
        uint128 base = 1000000000000000000000000000000000000;
        for (uint8 i = 0; i < SIZE; i++) {
            for (uint8 j = 0; j < SIZE; j++) {
                uint128 r = i * SIZE + j;
                uint128 exp = 36 - r - 1;
                uint8 slot = board[i][j];
                base += slot * uint128(10**exp);
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

    function applyMove(uint128 key, Step memory move)
        public
        view
        returns (uint128)
    {
        int128 inc = getIncrements(move.direction);
        int128 r = int128(uint128(move.row * SIZE + move.col));
        uint128 carId = getPosition(key, uint128(r));
        uint128 newKey = replaceDigit(key, uint128(r + inc), carId);
        int128 twoSlotsAway = int128(r) - inc * 2;
        if (
            twoSlotsAway < 0 ||
            twoSlotsAway > 35 ||
            carId != getPosition(newKey, uint128(twoSlotsAway))
        ) newKey = replaceDigit(newKey, uint128(r - inc), 0);
        else {
            newKey = replaceDigit(newKey, uint128(r - inc * 2), 0);
        }
        return newKey;
    }

    function calculateSteps(uint128 initialKey, uint128[] memory stack) public {
        stack[0] = initialKey;
        uint8 stackSize = 1;
        while (stackSize > 0) {
            stackSize--;
            uint128 key = stack[stackSize];
            State storage state = states[key];
            StateVisit storage visit = visited[key];
            if (visit.hasVisited && state.steps >= visit.steps) {
                continue;
            } else {
                visit.steps = state.steps;
                visit.hasVisited = true;
            }
            for (uint8 i = 0; i < state.nextStates.length; i++) {
                StateConnection storage connection = state.nextStates[i];
                uint8 steps = state.steps + 1;
                State storage nextState = states[connection.board];
                if (
                    (!nextState.isRoot && nextState.steps == 0) ||
                    nextState.steps > steps
                ) {
                    nextState.steps = steps;
                    nextState.previousBoard = key;
                }
            }
            for (uint8 i = 0; i < state.nextStates.length; i++) {
                StateConnection storage connection = state.nextStates[i];
                stack[stackSize] = connection.board;
                stackSize++;
            }
        }
    }

    function findAvailableMovements(uint128 key)
        public
        view
        returns (Step[] memory)
    {
        Step[] memory nextMovements = new Step[](36);
        uint128 pos = 0;
        for (uint8 i = 0; i < SIZE; i++) {
            bool isLeftEmpty = false;
            bool isTopEmpty = false;
            uint8 previousHorSlot = 100;
            uint8 previousVerSlot = 100;
            for (uint8 j = 0; j < SIZE; j++) {
                // check horizontal
                uint128 r = j + (i * SIZE);
                uint8 slot = getPosition(key, r);
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
                uint128 c = i + (j * SIZE);
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

    function findNextMoves(uint128[] memory stack) public {
        uint8 targetCar = 1;
        uint8 stackSize = 1;
        while (stackSize > 0) {
            stackSize--;
            uint128 currentBoard = stack[stackSize];
            State storage currentState = states[currentBoard];
            Step[] memory nextMovements = findAvailableMovements(
                currentState.board
            );
            for (uint8 i = 0; i < nextMovements.length; i++) {
                Step memory movement = nextMovements[i];
                if (movement.carId == 0) break;
                uint128 nextBoard = applyMove(currentState.board, movement);
                uint128 finalSlot1 = getPosition(nextBoard, 16);
                uint128 finalSlot2 = getPosition(nextBoard, 17);
                State storage nextState = states[nextBoard];
                nextState.board = nextBoard;
                nextState.won =
                    finalSlot1 == targetCar &&
                    finalSlot2 == targetCar;
                if (nextState.isValid) {
                    currentState.nextStates.push(
                        StateConnection(nextBoard, movement)
                    );
                } else {
                    nextState.isValid = true;
                    stateKeys.push(nextBoard);
                    currentState.nextStates.push(
                        StateConnection(nextBoard, movement)
                    );
                    if (!nextState.won) {
                        stack[stackSize] = nextBoard;
                        stackSize++;
                    }
                }
                nextState.previousMovements[currentState.board] = movement;
            }
        }
    }

    function findShortestPath(uint128 initialKey, uint128[] memory stack)
        public
    {
        calculateSteps(initialKey, stack);
        uint128 bestHash = 0;
        uint128 bestHashSteps = 0;
        for (uint8 i = 0; i < stateKeys.length; i++) {
            uint128 key = stateKeys[i];
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

    function getStateKeys() public view returns (uint128) {
        return uint128(stateKeys.length);
    }

    function replaceDigit(
        uint128 key,
        uint128 index,
        uint128 digit
    ) public pure returns (uint128) {
        uint128 currentDigit = getPosition(key, index);
        uint128 exp = 35 - index;
        uint128 sub = currentDigit * uint128(10**exp);
        return key - sub + digit * uint128(10**exp);
    }

    function getPosition(uint128 key, uint128 index)
        public
        pure
        returns (uint8)
    {
        uint128 p = 35 - index;
        uint128 pow = uint128(10**p);
        return uint8(uint128(key / pow) % 10);
    }

    function unblockCar(uint8[6][6] memory board)
        public
        returns (Step[] memory)
    {
        uint128 initialBoard = hashBoard(board);
        uint128[] memory stack = new uint128[](4000);
        stack[0] = initialBoard;
        stateKeys.push(initialBoard);
        State storage initialState = states[initialBoard];
        initialState.board = initialBoard;
        initialState.isRoot = true;
        findNextMoves(stack);
        findShortestPath(initialBoard, stack);
        return bestPath;
    }
}

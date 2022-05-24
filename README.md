# Unblocky Car - Rush Hour

Rush Hour puzzles are played on a six-by-six board that is filled with cars in various orientations. One of these cars is special: a red car of length 2 is placed in a horizontal orientation on the third row of the board. To solve the puzzle, it 
must travel all the way to the right of the board.

This project provides the minimum steps required for a given initial configuration. There is a solution available in Solidity as a smart contract, and one in javascript.

The solution can be described in the following steps:

1. Find all possible board state combinations based on what moves are possible.
2. All board states are linked to the next and previous states (a graph where each node is a state).
3. Use a variation of Dijkstra's algorithm to find the shortest path, where **weight** is the number of steps.

Because we don't know the **weight** (number of steps) ahead of time, we compute it as we apply Dijkstra's.

## Using uint256 to represent the board ##

The board is a 6x6 matrix represented as a multimensional array of integers, where each integer represents a car.

Consider the matrix below:
```json
[
    [2, 2, 2, 0, 0, 3],
    [0, 0, 4, 0, 0, 3],
    [1, 1, 4, 0, 0, 3],
    [5, 0, 4, 0, 6, 6],
    [5, 0, 0, 0, 7, 0],
    [8, 8, 8, 0, 7, 0],
]
```

In order to generate all possible board combinations, rather can creating multiple matrices, we represent them as a 36 digits integer (one digit per slot in the matrix). In this example, it would look as per below:

`222003 004003 114003 504066 500070 888070` or without whitespaces `222003004003114003504066500070888070`

So if we wanted to move the car number 2 to the right, the number after this movement would be:

`022203004003114003504066500070888070`

Moving cars vertically is a bit trickier, as it requires moving each digit 6 places to the left (if moving up) or right (if moving down). If we want to move car number 4 down, the number would change like this:

22200300**4**00311**4**00350**4**066500070888070
22200300000311**4**00350**4**06650**4**070888070

So moving cars around to generate a new board state is done by changing digits at specific positions in the integer representation. That is done with simple math (e.g. exp, mult, add, sub, modulo).

By using integers to represent every board state and math basic operations to move cars, we can save considerably on space complexity, if a board has 9000+ different states, instead of storing 9 thousand 6x6 matrices, we store 9 thousand integers.

### Use case 1: drive to the right ###
A simple scenario is laid out where only the red car (indicated by 1s) is on the board. In this case, the 
car simply needs to move two steps to the right. 
Input:
```json
[ 
    [0, 0, 0, 0, 0, 0], 
    [0, 0, 0, 0, 0, 0], 
    [0, 0, 1, 1, 0, 0], 
    [0, 0, 0, 0, 0, 0], 
    [0, 0, 0, 0, 0, 0], 
    [0, 0, 0, 0, 0, 0], 
] 
```
 
Output: 
```json
[ 
    Step(1, MovementDirection.Right), 
    Step(1, MovementDirection.Right) 
]
```
### Use case 2: hardest known initial configuration
The hardest known initial configuration is displayed below, and requires a minimum of 93 moves to solve it. Give it a try:
```json
[
    [7, 7, 7, 4, 5, 6],
    [8, 9, 9, 4, 5, 6],
    [8, 0, 1, 1, 5, 6],
    [10, 10, 3, 0, 0, 0],
    [0, 2, 3, 0, 11, 11],
    [0, 2, 12, 12, 13, 13]
]
```

This configuration is solved in 1~2 secs with the javascript solution, but because it requires cars with 2 digits (e.g. 10, 11...) we can't rely on our simplistic integer representation for it. In javascript, a string was used to represent the integer, and the double digit cars were replaced by letters. In order to avoid using a string (as in Solidity that's not very good) and still be able to handle more than 9 cars, we have two potential solutions:

1. Use hexadecimal to represent the board, which allows using 16 digits rather than 10.
2. Use a 72 digits integer, where every two digits represent one slot in the matrix.

Solution 2 is simpler to implement, and allows for more cars, which would be nice if we wanted to play with larger boards, but for a 6x6 board realistically we won't have more than 16 cars in most cases, as that would leave less than 4 empty slots for moving cars around.

## Reducing Gas Cost ##

Apart from using integers to represent the board state, we should avoid using `storage` whenever possible, as it requires far more gas than `memory`. There are some potential optimizations to short-circuit loops, and we might be able to represent some structs as a single integer too (unclear how much saving that would produce).

## Frontend ##

WIP

## Installation

Install the dependencies:

```sh
cd solidity
yarn
```

Then run the tests:

```sh
yarn test
```

## License

MIT

**Free Software, Hell Yeah!**

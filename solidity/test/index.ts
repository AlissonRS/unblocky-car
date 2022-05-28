import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("UnblockyCar", function () {
  it("Should find available moves", async function () {
    const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
    const unblockyCar = await UnblockyCar.deploy();
    await unblockyCar.deployed();

    let moves = await unblockyCar.findAvailableMovements(
      BigNumber.from("1004222004000114003506603500073888070")
    );
    moves = moves.filter((m) => m.carId > 0);
    expect(moves).to.lengthOf(6);

    expect(moves[0].carId).to.equal(6);
    expect(moves[0].direction).to.equal(2);
    expect(moves[0].col).to.equal(2);
    expect(moves[0].row).to.equal(3);

    expect(moves[1].carId).to.equal(6);
    expect(moves[1].direction).to.equal(3);
    expect(moves[1].col).to.equal(3);
    expect(moves[1].row).to.equal(3);

    expect(moves[5].carId).to.equal(3);
    expect(moves[5].direction).to.equal(1);
    expect(moves[5].col).to.equal(5);
    expect(moves[5].row).to.equal(4);
  });

  it("Should detect unsolvable challenge", async function () {
    const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
    const unblockyCar = await UnblockyCar.deploy();
    await unblockyCar.deployed();

    const board = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 2, 2, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];

    const transaction = await unblockyCar.unblockCar(board as any);
    const receipt = await transaction.wait();
    console.log("Gas used: ", receipt.gasUsed);
    const bestPath = await unblockyCar.getBestPath(board as any);
    expect(bestPath).to.lengthOf(0);
  });

  it("Should solve easy challenge", async function () {
    const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
    const unblockyCar = await UnblockyCar.deploy();
    await unblockyCar.deployed();

    const board = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 2, 0, 0, 0],
      [1, 1, 2, 3, 0, 0],
      [0, 0, 0, 3, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ];

    const transaction = await unblockyCar.unblockCar(board as any);
    const receipt = await transaction.wait();
    console.log("Gas used: ", receipt.gasUsed);
    const bestPath = await unblockyCar.getBestPath(board as any);
    expect(bestPath).to.lengthOf(6);
  });

  // it("Should solve hard challenge", async function () {
  //   const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
  //   const unblockyCar = await UnblockyCar.deploy();
  //   await unblockyCar.deployed();

  //   const board = [
  //     [2, 2, 2, 0, 0, 3],
  //     [0, 0, 4, 0, 0, 3],
  //     [1, 1, 4, 0, 0, 3],
  //     [5, 0, 4, 0, 6, 6],
  //     [5, 0, 0, 0, 7, 0],
  //     [8, 8, 8, 0, 7, 0],
  //   ];

  //   const transaction = await unblockyCar.unblockCar(board as any);
  //   const receipt = await transaction.wait();
  //   console.log("Gas used: ", receipt.gasUsed);
  //   const bestPath = await unblockyCar.getBestPath(board as any);
  //   expect(bestPath).to.lengthOf(25);
  // });

  it("Should hash the board", async function () {
    const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
    const unblockyCar = await UnblockyCar.deploy();
    await unblockyCar.deployed();

    const board = [
      [2, 2, 2, 0, 0, 3],
      [0, 0, 4, 0, 0, 3],
      [1, 1, 4, 0, 0, 3],
      [5, 0, 4, 0, 6, 6],
      [5, 0, 0, 0, 7, 0],
      [8, 8, 8, 0, 7, 0],
    ];

    const hash = await unblockyCar.hashBoard(board as any);
    expect(hash).to.equal(
      BigNumber.from("1222003004003114003504066500070888070")
    );
  });

  it("Should get digit at index", async function () {
    const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
    const unblockyCar = await UnblockyCar.deploy();
    await unblockyCar.deployed();

    const str = await unblockyCar.getPosition(
      BigNumber.from("1004222004000114003506603500073888070"),
      2
    );
    expect(str).to.equal(4);
  });

  it("Should replace digit at index", async function () {
    const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
    const unblockyCar = await UnblockyCar.deploy();
    await unblockyCar.deployed();

    let res = await unblockyCar.replaceDigit(
      BigNumber.from("1004222004000114003506603500073888070"),
      2,
      5
    );
    expect(res).to.equal(
      BigNumber.from("1005222004000114003506603500073888070")
    );

    res = await unblockyCar.replaceDigit(
      BigNumber.from("1004222004000114003506603500073888070"),
      35,
      5
    );
    expect(res).to.equal(
      BigNumber.from("1004222004000114003506603500073888075")
    );

    res = await unblockyCar.replaceDigit(
      BigNumber.from("1004222004000114003506603500073888070"),
      0,
      5
    );
    expect(res).to.equal(
      BigNumber.from("1504222004000114003506603500073888070")
    );
  });

  it("Should apply move", async function () {
    const UnblockyCar = await ethers.getContractFactory("UnblockyCar");
    const unblockyCar = await UnblockyCar.deploy();
    await unblockyCar.deployed();

    const key = BigNumber.from("1222003004003004003504066500070888070");
    const strRight = await unblockyCar.applyMove(key, {
      carId: 2,
      direction: 3,
      col: 2,
      row: 0,
    });
    const strDown = await unblockyCar.applyMove(key, {
      carId: 4,
      direction: 1,
      col: 2,
      row: 3,
    });
    const strLeft = await unblockyCar.applyMove(key, {
      carId: 6,
      direction: 2,
      col: 4,
      row: 3,
    });
    const strUp = await unblockyCar.applyMove(key, {
      carId: 5,
      direction: 0,
      col: 0,
      row: 3,
    });
    expect(strRight).to.equal(
      BigNumber.from("1022203004003004003504066500070888070")
    );
    expect(strDown).to.equal(
      BigNumber.from("1222003000003004003504066504070888070")
    );
    expect(strLeft).to.equal(
      BigNumber.from("1222003004003004003504660500070888070")
    );
    expect(strUp).to.equal(
      BigNumber.from("1222003004003504003504066000070888070")
    );
  });
});

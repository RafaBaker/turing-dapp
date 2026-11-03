const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TuringModule = buildModule("TuringModule", (m) => {
    const turing = m.contract("Turing");

    return { turing };
});

module.exports = TuringModule;
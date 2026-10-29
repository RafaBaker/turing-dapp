const { expect } = require("chai");

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Turing contract", function () {

    async function deployTuringFixture() {
        // Get the ContractFactory and Signers here.
        const Turing = await ethers.getContractFactory("Turing");
        const [owner, addr1, addr2] = await ethers.getSigners();

        // To deploy our contract, we just have to call Turing.deploy() and await
        // for it to be deployed(), which happens onces its transaction has been
        // mined.
        const hardhatToken = await Turing.deploy();

        await hardhatToken.waitForDeployment(); // sintaxe mudou

        // Fixtures can return anything you consider useful for your tests
        return { Turing, hardhatToken, owner, addr1, addr2 };
    }

    describe("Deployment", function () {
        it("Owner deve ser setado corretamente", async function () {
            const { hardhatToken, owner } = await loadFixture(deployTuringFixture);

            expect(await hardhatToken.owner()).to.equal(owner.address);
        });

        
    })

    describe("")

})
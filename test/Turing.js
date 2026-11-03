const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
    setBalance,
} = require("@nomicfoundation/hardhat-network-helpers");

const PROFESSORA = "0x502542668aF09fa7aea52174b9965A7799343Df7";

// As quantidades seguem a API atual: unidades inteiras passadas a issueToken/vote.
describe("Turing", function () {
    async function deployTuringFixture() {
        const [owner, aluno1, aluno2, aluno3, aluno4, aluno5, visitante] =
            await ethers.getSigners();
        const turing = await ethers.deployContract("Turing");
        await turing.waitForDeployment();

        // A professora tem um endereço fixo no construtor, fora dos signers padrão.
        await setBalance(PROFESSORA, ethers.parseEther("10"));
        const professora = await ethers.getImpersonatedSigner(PROFESSORA);
        const alunos = [aluno1, aluno2, aluno3, aluno4, aluno5];

        return { turing, owner, professora, aluno1, aluno2, aluno3, alunos, visitante };
    }

    async function deployTurmaFixture() {
        const fixture = await deployTuringFixture();
        const destinatarios = [];

        // Vinte destinatários distintos permitem testar dois ciclos de recompensa.
        // Eles só recebem votos; não precisam de saldo em ETH nem de chave privada.
        for (let i = 1; i <= 20; i++) {
            const codinome = `projeto${i}`;
            const endereco = ethers.getAddress(ethers.toBeHex(1000 + i, 20));
            await fixture.turing.updateUser(codinome, endereco);
            destinatarios.push({ codinome, endereco });
        }

        return { ...fixture, destinatarios };
    }

    describe("Inicialização", function () {
        it("define quem fez o deploy como owner", async function () {
            const { turing, owner } = await loadFixture(deployTuringFixture);
            expect(await turing.owner()).to.equal(owner.address);
        });

        it("identifica o token ERC-20 como Turing (TUR)", async function () {
            const { turing } = await loadFixture(deployTuringFixture);
            expect(await turing.name()).to.equal("Turing");
            expect(await turing.symbol()).to.equal("TUR");
        });

        it("inicia sem emissão de tokens ou oferta inicial", async function () {
            const { turing, owner, professora, alunos } =
                await loadFixture(deployTuringFixture);

            expect(await turing.totalSupply()).to.equal(0n);
            for (const usuario of [owner, professora, ...alunos]) {
                expect(await turing.balanceOf(usuario.address)).to.equal(0n);
            }
        });

        it("permite consultar os usuários pré-autorizados pelo codinome", async function () {
            const { turing, alunos } = await loadFixture(deployTuringFixture);

            expect(turing.interface.hasFunction("users(string)"),
                "O PDF exige que o mapping users seja público").to.equal(true);
            expect(await turing.users("roberta")).to.equal(PROFESSORA);
            for (const [i, aluno] of alunos.entries()) {
                expect(await turing.users(`nome${i + 1}`)).to.equal(aluno.address);
            }
            expect(await turing.users("inexistente")).to.equal(ethers.ZeroAddress);
        });

        it("inicia com a votação ativa e sem votos registrados", async function () {
            const { turing, aluno1 } = await loadFixture(deployTuringFixture);
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(false);
            await expect(turing.connect(aluno1).vote("nome2", 1)).not.to.be.reverted;
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(true);
        });
    });

    describe("Controle de acesso administrativo", function () {
        const operacoes = [
            ["updateUser", (turing, endereco) => turing.updateUser("novo", endereco)],
            ["votingOn", (turing) => turing.votingOn()],
            ["votingOff", (turing) => turing.votingOff()],
            ["issueToken", (turing) => turing.issueToken("nome2", 10)],
        ];

        for (const [nome, executar] of operacoes) {
            for (const papel of ["owner", "professora"]) {
                it(`permite que ${papel} execute ${nome}`, async function () {
                    const fixture = await loadFixture(deployTuringFixture);
                    await expect(executar(
                        fixture.turing.connect(fixture[papel]), fixture.visitante.address,
                    )).not.to.be.reverted;
                });
            }

            for (const papel of ["aluno1", "visitante"]) {
                it(`impede que ${papel} execute ${nome}`, async function () {
                    const fixture = await loadFixture(deployTuringFixture);
                    await expect(executar(
                        fixture.turing.connect(fixture[papel]), fixture.visitante.address,
                    )).to.be.reverted;
                });
            }
        }
    });

    describe("Cadastro e atualização de usuários", function () {
        it("rejeita um codinome vazio", async function () {
            const { turing, visitante } = await loadFixture(deployTuringFixture);
            await expect(turing.updateUser("", visitante.address))
                .to.be.revertedWith("Codename nao pode estar vazio");
        });

        it("cadastra um novo destinatário para a emissão de tokens", async function () {
            const { turing, visitante } = await loadFixture(deployTuringFixture);
            await turing.updateUser("novoAluno", visitante.address);
            await expect(turing.issueToken("novoAluno", 5))
                .to.changeTokenBalance(turing, visitante, 5);
        });

        it("direciona novas emissões à carteira atualizada e preserva o saldo anterior", async function () {
            const { turing, aluno1, visitante } = await loadFixture(deployTuringFixture);
            await turing.issueToken("nome1", 3);
            await turing.updateUser("nome1", visitante.address);
            await expect(turing.issueToken("nome1", 7))
                .to.changeTokenBalances(turing, [aluno1, visitante], [0, 7]);
            expect(await turing.balanceOf(aluno1.address)).to.equal(3n);
            expect(await turing.totalSupply()).to.equal(10n);
        });

        it("autoriza um novo usuário a votar e registra seu codinome", async function () {
            const { turing, visitante } = await loadFixture(deployTuringFixture);
            await turing.updateUser("novoAluno", visitante.address);
            await expect(turing.connect(visitante).vote("nome2", 1)).not.to.be.reverted;
            expect(await turing.hasVoted("novoAluno", "nome2")).to.equal(true);
            expect(await turing.hasVoted("", "nome2")).to.equal(false);
        });

        it("permite que a nova carteira de um aluno vote com seu codinome", async function () {
            const { turing, visitante } = await loadFixture(deployTuringFixture);
            await turing.updateUser("nome1", visitante.address);
            await expect(turing.connect(visitante).vote("nome2", 1)).not.to.be.reverted;
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(true);
        });

        it("retira da carteira antiga a autorização para votar após a atualização", async function () {
            const { turing, aluno1, aluno2, visitante } =
                await loadFixture(deployTuringFixture);
            await turing.updateUser("nome1", visitante.address);
            await expect(turing.connect(aluno1).vote("nome2", 1)).to.be.reverted;
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(false);
            expect(await turing.balanceOf(aluno2.address)).to.equal(0n);
        });

        it("preserva o voto já dado pelo codinome quando sua carteira muda", async function () {
            const { turing, aluno1, aluno2, visitante } =
                await loadFixture(deployTuringFixture);
            await turing.connect(aluno1).vote("nome2", 1);
            await turing.updateUser("nome1", visitante.address);
            await expect(turing.connect(visitante).vote("nome2", 1)).to.be.reverted;
            expect(await turing.balanceOf(aluno2.address)).to.equal(1n);
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(true);
        });
    });

    describe("Emissão sob demanda", function () {
        it("cria tokens para o aluno sem descontar saldo do administrador", async function () {
            const { turing, owner, aluno1 } = await loadFixture(deployTuringFixture);
            const emissao = turing.issueToken("nome1", 50);
            await expect(emissao)
                .to.changeTokenBalances(turing, [owner, aluno1], [0, 50]);
            await expect(emissao).to.emit(turing, "Transfer")
                .withArgs(ethers.ZeroAddress, aluno1.address, 50);
            expect(await turing.totalSupply()).to.equal(50n);
        });

        it("acumula emissões acima do limite de dois tokens aplicado aos votos", async function () {
            const { turing, aluno1, aluno2 } = await loadFixture(deployTuringFixture);
            await turing.issueToken("nome1", 1_000_000);
            await turing.issueToken("nome1", 2_000_000);
            await turing.issueToken("nome2", 4_000_000);
            expect(await turing.balanceOf(aluno1.address)).to.equal(3_000_000n);
            expect(await turing.balanceOf(aluno2.address)).to.equal(4_000_000n);
            expect(await turing.totalSupply()).to.equal(7_000_000n);
        });

        it("rejeita emissão para um codinome inexistente sem alterar a oferta", async function () {
            const { turing } = await loadFixture(deployTuringFixture);
            await expect(turing.issueToken("inexistente", 5)).to.be.reverted;
            expect(await turing.totalSupply()).to.equal(0n);
        });

        it("permite emissão administrativa durante a pausa da votação", async function () {
            const { turing, aluno1 } = await loadFixture(deployTuringFixture);
            await turing.votingOff();
            await expect(turing.issueToken("nome1", 5))
                .to.changeTokenBalance(turing, aluno1, 5);
        });
    });

    describe("Pausa e retomada da votação", function () {
        it("impede votos enquanto a votação estiver pausada", async function () {
            const { turing, aluno1 } = await loadFixture(deployTuringFixture);
            await turing.votingOff();
            await expect(turing.connect(aluno1).vote("nome2", 1))
                .to.be.revertedWith("A votacao precisa estar ativa");
            expect(await turing.totalSupply()).to.equal(0n);
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(false);
        });

        it("volta a aceitar votos após votingOn", async function () {
            const { turing, aluno1 } = await loadFixture(deployTuringFixture);
            await turing.votingOff();
            await turing.votingOn();
            await expect(turing.connect(aluno1).vote("nome2", 1)).not.to.be.reverted;
        });

        it("mantém a votação pausada ao atualizar um usuário", async function () {
            const { turing, aluno1, visitante } = await loadFixture(deployTuringFixture);
            await turing.votingOff();
            await turing.updateUser("novoAluno", visitante.address);
            await expect(turing.connect(aluno1).vote("nome2", 1))
                .to.be.revertedWith("A votacao precisa estar ativa");
        });

        it("preserva os votos anteriores após pausar e retomar", async function () {
            const { turing, aluno1, aluno2 } = await loadFixture(deployTuringFixture);
            await turing.connect(aluno1).vote("nome2", 1);
            await turing.votingOff();
            await turing.votingOn();
            await expect(turing.connect(aluno1).vote("nome2", 1)).to.be.reverted;
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(true);
            expect(await turing.balanceOf(aluno2.address)).to.equal(1n);
        });
    });

    describe("Votos nos projetos", function () {
        for (const quantidade of [1, 2]) {
            it(`emite ${quantidade} Turing(s) para o projeto votado sem cobrar do eleitor`, async function () {
                const { turing, aluno1, aluno2 } = await loadFixture(deployTuringFixture);
                const voto = turing.connect(aluno1).vote("nome2", quantidade);
                await expect(voto)
                    .to.changeTokenBalances(turing, [aluno1, aluno2], [0, quantidade]);
                await expect(voto).to.emit(turing, "Transfer")
                    .withArgs(ethers.ZeroAddress, aluno2.address, quantidade);
                expect(await turing.totalSupply()).to.equal(BigInt(quantidade));
                expect(await turing.hasVoted("nome1", "nome2")).to.equal(true);
            });
        }

        for (const quantidade of [0, 3]) {
            it(`rejeita a quantidade inválida de ${quantidade} tokens sem registrar voto`, async function () {
                const { turing, aluno1 } = await loadFixture(deployTuringFixture);
                await expect(turing.connect(aluno1).vote("nome2", quantidade))
                    .to.be.revertedWith("Quantidade de turings invalida");
                expect(await turing.hasVoted("nome1", "nome2")).to.equal(false);
                expect(await turing.totalSupply()).to.equal(0n);
            });
        }

        it("impede voto em si mesmo", async function () {
            const { turing, aluno1 } = await loadFixture(deployTuringFixture);
            await expect(turing.connect(aluno1).vote("nome1", 1))
                .to.be.revertedWith("Usuario nao pode votar em si mesmo");
            expect(await turing.hasVoted("nome1", "nome1")).to.equal(false);
            expect(await turing.totalSupply()).to.equal(0n);
        });

        it("impede voto de uma carteira não cadastrada", async function () {
            const { turing, visitante } = await loadFixture(deployTuringFixture);
            await expect(turing.connect(visitante).vote("nome1", 1)).to.be.reverted;
            expect(await turing.hasVoted("", "nome1")).to.equal(false);
            expect(await turing.totalSupply()).to.equal(0n);
        });

        it("não concede ao owner autorização de eleitor sem cadastro", async function () {
            const { turing, owner } = await loadFixture(deployTuringFixture);
            await expect(turing.connect(owner).vote("nome1", 1)).to.be.reverted;
            expect(await turing.totalSupply()).to.equal(0n);
        });

        it("permite que a professora vote como usuária cadastrada", async function () {
            const { turing, professora, aluno1 } = await loadFixture(deployTuringFixture);
            await expect(turing.connect(professora).vote("nome1", 1))
                .to.changeTokenBalance(turing, aluno1, 1);
            expect(await turing.hasVoted("roberta", "nome1")).to.equal(true);
        });

        for (const codinome of ["", "inexistente"]) {
            it(`rejeita o destinatário ${JSON.stringify(codinome)}`, async function () {
                const { turing, aluno1 } = await loadFixture(deployTuringFixture);
                await expect(turing.connect(aluno1).vote(codinome, 1)).to.be.reverted;
                expect(await turing.totalSupply()).to.equal(0n);
            });
        }

        it("impede um segundo voto para o mesmo projeto, mesmo mudando a quantidade", async function () {
            const { turing, aluno1, aluno2 } = await loadFixture(deployTuringFixture);
            await turing.connect(aluno1).vote("nome2", 1);
            await expect(turing.connect(aluno1).vote("nome2", 2))
                .to.be.revertedWith("Usuario nao pode votar mais de uma vez");
            expect(await turing.balanceOf(aluno2.address)).to.equal(1n);
            expect(await turing.totalSupply()).to.equal(1n);
        });

        it("permite que um aluno vote em projetos diferentes", async function () {
            const { turing, aluno1, aluno2, aluno3 } = await loadFixture(deployTuringFixture);
            await turing.connect(aluno1).vote("nome2", 1);
            await turing.connect(aluno1).vote("nome3", 2);
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(true);
            expect(await turing.hasVoted("nome1", "nome3")).to.equal(true);
            expect(await turing.balanceOf(aluno2.address)).to.equal(1n);
            expect(await turing.balanceOf(aluno3.address)).to.equal(2n);
            expect(await turing.totalSupply()).to.equal(3n);
        });

        it("permite que eleitores diferentes votem no mesmo projeto", async function () {
            const { turing, aluno1, aluno2, aluno3 } = await loadFixture(deployTuringFixture);
            await turing.connect(aluno1).vote("nome3", 1);
            await turing.connect(aluno2).vote("nome3", 2);
            expect(await turing.hasVoted("nome1", "nome3")).to.equal(true);
            expect(await turing.hasVoted("nome2", "nome3")).to.equal(true);
            expect(await turing.balanceOf(aluno3.address)).to.equal(3n);
        });
    });

    describe("Recompensa por participação", function () {
        it("recompensa no décimo e no vigésimo voto, contando votos e não tokens", async function () {
            const { turing, aluno1, aluno2, destinatarios } =
                await loadFixture(deployTurmaFixture);

            for (const [i, destinatario] of destinatarios.entries()) {
                const voto = turing.connect(aluno1).vote(destinatario.codinome, 2);
                if ((i + 1) % 10 === 0) {
                    await expect(voto).to.emit(turing, "Transfer")
                        .withArgs(ethers.ZeroAddress, aluno1.address, 1);
                } else {
                    await voto;
                }
                expect(await turing.balanceOf(destinatario.endereco)).to.equal(2n);
                expect(await turing.balanceOf(aluno1.address))
                    .to.equal(BigInt(Math.floor((i + 1) / 10)));
                expect(await turing.totalSupply())
                    .to.equal(BigInt(2 * (i + 1) + Math.floor((i + 1) / 10)));
            }
            expect(await turing.balanceOf(aluno2.address)).to.equal(0n);
        });

        it("conta a participação de cada eleitor separadamente", async function () {
            const { turing, aluno1, aluno2, destinatarios } =
                await loadFixture(deployTurmaFixture);
            for (const destinatario of destinatarios.slice(0, 9)) {
                await turing.connect(aluno1).vote(destinatario.codinome, 1);
            }
            await turing.connect(aluno2).vote(destinatarios[0].codinome, 1);
            expect(await turing.balanceOf(aluno1.address)).to.equal(0n);
            expect(await turing.balanceOf(aluno2.address)).to.equal(0n);
            expect(await turing.totalSupply()).to.equal(10n);

            await turing.connect(aluno1).vote(destinatarios[9].codinome, 1);
            expect(await turing.balanceOf(aluno1.address)).to.equal(1n);
            expect(await turing.balanceOf(aluno2.address)).to.equal(0n);
            expect(await turing.totalSupply()).to.equal(12n);
        });

        it("não contabiliza votos rejeitados para antecipar a recompensa", async function () {
            const { turing, aluno1, destinatarios } = await loadFixture(deployTurmaFixture);
            for (const destinatario of destinatarios.slice(0, 9)) {
                await turing.connect(aluno1).vote(destinatario.codinome, 1);
            }

            await expect(turing.connect(aluno1).vote(destinatarios[0].codinome, 1))
                .to.be.reverted;
            await expect(turing.connect(aluno1).vote(destinatarios[9].codinome, 0))
                .to.be.reverted;
            await turing.votingOff();
            await expect(turing.connect(aluno1).vote(destinatarios[9].codinome, 1))
                .to.be.reverted;
            expect(await turing.balanceOf(aluno1.address)).to.equal(0n);
            expect(await turing.totalSupply()).to.equal(9n);

            await turing.votingOn();
            await turing.connect(aluno1).vote(destinatarios[9].codinome, 1);
            expect(await turing.balanceOf(aluno1.address)).to.equal(1n);
            expect(await turing.totalSupply()).to.equal(11n);
        });
    });

    describe("Transferências ERC-20 dos tokens recebidos", function () {
        it("transfere tokens emitidos e mantém a oferta total", async function () {
            const { turing, aluno1, aluno2 } = await loadFixture(deployTuringFixture);
            await turing.issueToken("nome1", 5);
            const transferencia = turing.connect(aluno1).transfer(aluno2.address, 2);
            await expect(transferencia)
                .to.changeTokenBalances(turing, [aluno1, aluno2], [-2, 2]);
            await expect(transferencia).to.emit(turing, "Transfer")
                .withArgs(aluno1.address, aluno2.address, 2);
            expect(await turing.totalSupply()).to.equal(5n);
            expect(await turing.hasVoted("nome1", "nome2")).to.equal(false);
        });

        it("rejeita transferência acima do saldo sem alterar os saldos", async function () {
            const { turing, aluno1, aluno2 } = await loadFixture(deployTuringFixture);
            await turing.issueToken("nome1", 2);
            await expect(turing.connect(aluno1).transfer(aluno2.address, 3))
                .to.be.revertedWithCustomError(turing, "ERC20InsufficientBalance")
                .withArgs(aluno1.address, 2, 3);
            expect(await turing.balanceOf(aluno1.address)).to.equal(2n);
            expect(await turing.balanceOf(aluno2.address)).to.equal(0n);
            expect(await turing.totalSupply()).to.equal(2n);
        });
    });
});

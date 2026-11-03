// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";

contract Turing is ERC20 {
    address public owner;

    mapping(string => address) public users;
    mapping(address => string) private addresses;
    mapping(string => mapping(string => bool)) public hasVoted;
    mapping(address => uint256) private qtdVotes;

    bool private voting = true;

    modifier onlyOwner() {
        require(
            msg.sender == owner || msg.sender == users["roberta"],
            "Apenas owner ou professora"
        );
        _;
    }

    constructor() ERC20("Turing", "TUR") {
        owner = msg.sender;
        users["roberta"] = 0x502542668aF09fa7aea52174b9965A7799343Df7;
        users["nome1"] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        users["nome2"] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        users["nome3"] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        users["nome4"] = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
        users["nome5"] = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;

        addresses[0x502542668aF09fa7aea52174b9965A7799343Df7] = "roberta";
        addresses[0x70997970C51812dc3A010C7d01b50e0d17dc79C8] = "nome1";
        addresses[0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC] = "nome2";
        addresses[0x90F79bf6EB2c4f870365E785982E1f101E93b906] = "nome3";
        addresses[0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65] = "nome4";
        addresses[0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc] = "nome5";

        console.log("Contrato Turing criado. Owner:", owner);
    }

    function updateUser(string memory codename, address user_addr) public onlyOwner {
        require(bytes(codename).length > 0, "Codename nao pode estar vazio");

        delete addresses[users[codename]];
        users[codename] = user_addr;
        addresses[user_addr] = codename;

        console.log("Usuario atualizado:", codename, user_addr);
    }

    function votingOn() public onlyOwner {
        voting = true;
        console.log("Votacao ativada por:", msg.sender);
    }

    function votingOff() public onlyOwner {
        voting = false;
        console.log("Votacao pausada por:", msg.sender);
    }

    function issueToken(string memory codename, uint256 qtd_de_Turings) public onlyOwner {
        _mint(users[codename], qtd_de_Turings);
        console.log("Tokens emitidos:", qtd_de_Turings, "Destinatario:", codename);
    }

    function vote(string memory codename, uint256 qtd_de_Turings) public {
        string memory voter = addresses[msg.sender];

        require(voting, "A votacao precisa estar ativa");

        require(
            bytes(voter).length > 0 && users[voter] == msg.sender,
            "Pessoa nao autorizada"
        );

        require(users[codename] != address(0), "Pessoa nao autorizada");

        require(msg.sender != users[codename], "Usuario nao pode votar em si mesmo");

        require(qtd_de_Turings > 0 && qtd_de_Turings <= 2, "Quantidade de turings invalida");

        require(!hasVoted[voter][codename], "Usuario nao pode votar mais de uma vez");

        hasVoted[voter][codename] = true;
        qtdVotes[msg.sender]++;

        _mint(users[codename], qtd_de_Turings);
        console.log("Voto registrado:", voter, "Projeto:", codename);
        console.log("Turings gerados pelo voto:", qtd_de_Turings);

        if (qtdVotes[msg.sender] % 10 == 0) {
            _mint(msg.sender, 1);
            console.log("Recompensa de 1 Turing emitida para:", msg.sender);
        }
    }
}

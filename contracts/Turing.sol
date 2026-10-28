//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

// We import this library to be able to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


// This is the main building block for smart contracts.
contract Turing is ERC20{
    // Some string type variables to identify the token.
    // string public name = "Turing";
    // string public symbol = "TUR";

    // // The fixed amount of tokens stored in an unsigned integer type variable.
    // uint256 public totalSupply = 1000000;

    // An address type variable is used to store ethereum accounts.
    address public owner;

    mapping(string => address) private users; // Usuários autorizados

    mapping(address => string) private addresses; // Endereços que possuem usuários

    // Chave primária (string) => (Chave Secundária (string) => Valor Final (bool))    
    mapping(string => mapping(string => bool)) public hasVote


    // A mapping is a key/value map. Here we store each account balance.
    mapping(address => uint256) balances;

    bool private voting = true;

    // The Transfer event helps off-chain aplications understand
    // what happens within your contract.
    // event Transfer(address indexed _from, address indexed _to, uint256 _value);

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender==users["roberta"]);
        _;
    }

    /**
     * Contract initialization.
     */
    constructor() ERC20("Turing", "TUR") {
        // The totalSupply is assigned to the transaction sender, which is the
        // account that is deploying the contract.
        // balances[msg.sender] = totalSupply;
        owner = msg.sender;
        users["roberta"] = 0x502542668aF09fa7aea52174b9965A7799343Df7;
        users["nome1"] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        users["nome2"] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        users["nome3"] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        users["nome4"] = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
        users["nome5"] = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;
        users["nome6"] = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;
        users["nome7"] = 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955;
        users["nome8"] = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f;
        users["nome9"] = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720;
        users["nome10"] = 0xBcd4042DE499D14e55001CcbB24a551F3b954096;
        users["nome11"] = 0x71bE63f3384f5fb98995898A86B02Fb2426c5788;
        users["nome12"] = 0xFABB0ac9d68B0B445fB7357272Ff202C5651694a;
        users["nome13"] = 0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec;
        users["nome14"] = 0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097;
        users["nome15"] = 0xcd3B766CCDd6AE721141F452C550Ca635964ce71;
        users["nome16"] = 0x2546BcD3c84621e976D8185a91A922aE77ECEc30;
        users["nome17"] = 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E;
        users["nome18"] = 0xdD2FD4581271e230360230F9337D5c0430Bf44C0;
        users["nome19"] = 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199;

        addresses[0x502542668aF09fa7aea52174b9965A7799343Df7] = "roberta";
        addresses[0x70997970C51812dc3A010C7d01b50e0d17dc79C8] = "nome1";
        addresses[0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC] = "nome2";
        addresses[0x90F79bf6EB2c4f870365E785982E1f101E93b906] = "nome3";
        addresses[0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65] = "nome4";
        addresses[0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc] = "nome5";
        addresses[0x976EA74026E726554dB657fA54763abd0C3a0aa9] = "nome6";
        addresses[0x14dC79964da2C08b23698B3D3cc7Ca32193d9955] = "nome7";
        addresses[0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f] = "nome8";
        addresses[0xa0Ee7A142d267C1f36714E4a8F75612F20a79720] = "nome9";
        addresses[0xBcd4042DE499D14e55001CcbB24a551F3b954096] = "nome10";
        addresses[0x71bE63f3384f5fb98995898A86B02Fb2426c5788] = "nome11";
        addresses[0xFABB0ac9d68B0B445fB7357272Ff202C5651694a] = "nome12";
        addresses[0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec] = "nome13";
        addresses[0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097] = "nome14";
        addresses[0xcd3B766CCDd6AE721141F452C550Ca635964ce71] = "nome15";
        addresses[0x2546BcD3c84621e976D8185a91A922aE77ECEc30] = "nome16";
        addresses[0xbDA5747bFD65F08deb54cb465eB87D40e51B197E] = "nome17";
        addresses[0xdD2FD4581271e230360230F9337D5c0430Bf44C0] = "nome18";
        addresses[0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199] = "nome19";
    
        // _mint(owner, 1000000);
    }

    /**
     * A function to transfer tokens.
     *
     * The `external` modifier makes a function *only* callable from outside
     * the contract.
     */
    // function transfer(address to, uint256 amount) external {
    //     // Check if the transaction sender has enough tokens.
    //     // If `require`'s first argument evaluates to `false` then the
    //     // transaction will revert.
    //     require(balances[msg.sender] >= amount, "Not enough tokens");

    //     // We can print messages and values using console.log, a feature of
    //     // Hardhat Network:
    //     console.log(
    //         "Transferring from %s to %s %s tokens",
    //         msg.sender,
    //         to,
    //         amount
    //     );

    //     // Transfer the amount.
    //     balances[msg.sender] -= amount;
    //     balances[to] += amount;

    //     // Notify off-chain applications of the transfer.
    //     emit Transfer(msg.sender, to, amount);
    // }

    // /**
    //  * Read only function to retrieve the token balance of a given account.
    //  *
    //  * The `view` modifier indicates that it doesn't modify the contract's
    //  * state, which allows us to call it without executing a transaction.
    //  */
    // function balanceOf(address account) external view returns (uint256) {
    //     return balances[account];
    // }

    function updateUser(string memory codename, address user_addr) public onlyOwner{
        require(bytes(codename).length>0, "Codename nao pode estar vazio");

        users["codename"] = user_addr;

        votingOn();
    }

    function votingOn() public onlyOwner{
        voting = true;
    }

    function votingOff() public onlyOwner {
        voting = false;
    }

    function issueToken(string memory codename, uint256 qtd_de_Turings) public onlyOwner {
        _mint(users["codename"], qtd_de_Turings);
    }

    function vote(string memory codename, uint256 qtd_de_Turings) public {
        require(voting, "A votacao precisa estar ativa");

        require(users[codename] != address(0), "Pessoa nao autorizada");

        require(msg.sender != users[codename], "Usuario nao pode votar em si mesmo");

        require(qtd_de_Turings > 0 && qtd_de_Turings <= 2, "Quantidade de turings invalida");

        // Require dos votos do codename

        hasVote[]
    }
}

# Turing — votação dos projetos finais

Frontend React adaptado do Hardhat boilerplate para a especificação Turing. Usa a rede local do Hardhat, uma carteira Ethereum injetada no navegador e o contrato `contracts/Turing.sol`.

## Executar localmente

Na raiz do repositório, instale as dependências e mantenha o nó local aberto:

```bash
npm ci
npx hardhat node
```

Em outro terminal, ainda na raiz, implante Turing:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

O script implanta o contrato e exporta sua ABI e seu endereço para `frontend/src/contracts/`. Esses arquivos são gerados e estão no `.gitignore` do frontend. Execute o deploy antes de iniciar ou compilar o frontend; repita-o quando reiniciar a blockchain local. O módulo Ignition existente pode continuar sendo usado separadamente, mas este script é o fluxo que também exporta a configuração para a interface.

Em seguida:

```bash
cd frontend
npm ci
npm start
```

Abra `http://localhost:3000`. Na carteira, use a rede local `http://127.0.0.1:8545`, chain ID `31337`, moeda `ETH`. A aplicação oferece a troca de rede ao conectar. Use as contas de desenvolvimento apresentadas pelo Hardhat e correspondentes ao cadastro do construtor (`nome1` a `nome5`). Elas já recebem ETH para pagar as taxas locais. O owner é a conta que fez o deploy; a professora é o endereço associado ao codinome `roberta` no contrato.

## Funcionalidades do PDF

- **Usuários cadastrados:** votação em projetos, com seleção do codinome e quantidade de 1 ou 2 Turings. Não é necessário ter Turings para votar: o contrato cria os tokens para o destinatário.
- **Owner e professora:** além do formulário de voto, emissão de tokens para alunos e botões para ativar ou pausar a votação. A carteira do owner também precisa estar cadastrada para votar, conforme a regra de `vote` no contrato.
- **Destinatários:** a professora é excluída dos dois formulários. O próprio projeto e projetos que já receberam o voto daquele usuário ficam desabilitados na seleção de voto.
- **Ranking:** usuários cadastrados, incluindo a professora, ordenados pelo saldo decrescente. Atualiza por polling de `balanceOf()` a cada cinco segundos e após transações confirmadas.
- **Recompensa:** o contrato concede 1 Turing a cada dez votos válidos. O frontend informa a regra e consulta o saldo resultante; não calcula nem emite a recompensa por conta própria.

O frontend não oferece transferências nem edição de cadastro, pois essas interfaces não são solicitadas no PDF. As permissões são consultadas em `owner()` e `users()`, e o contrato continua validando todas as operações.

## Organização e decisões de integração

`src/components/Dapp.js` concentra conexão com a carteira, troca de conta/rede, carregamento dos dados e envio de transações. Os comentários explicam as regras de Turing e o ciclo das operações. `TuringForm.js` apresenta os campos de voto e emissão; `src/turing.js` consulta o contrato, ordena o ranking e valida as quantidades.

Um mapping Solidity não permite listar suas chaves. Por isso, `src/config.js` contém os codinomes iniciais da turma (`nome1` a `nome5`). Os endereços são sempre lidos do contrato, acompanhando alterações feitas por `updateUser`. Se forem cadastrados novos codinomes, adicione-os à lista `STUDENT_CODENAMES` nesse arquivo.

As quantidades seguem exatamente a API e os testes atuais: `vote("nome2", 2)` cria duas unidades do saldo. Não há conversão com `parseEther` ou `formatEther`; saldos e quantidades usam `BigNumber` do ethers v5 para preservar a precisão. O script Hardhat usa ethers v6, conforme as dependências da raiz.

O estado `voting` é privado no contrato atual. A interface não presume se a votação está ativa: oferece os comandos administrativos e apresenta a mensagem do contrato ao tentar votar durante uma pausa.

## Verificação

Depois do deploy/exportação dos arquivos:

```bash
cd frontend
npm run build
```

Na raiz, execute os testes do contrato com `npx hardhat test`.

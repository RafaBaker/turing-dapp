# Turing dApp

Aplicação para votar nos projetos da turma usando o token Turing (TUR), com contrato Solidity, blockchain local do Hardhat e frontend React com Vite.

## Deploy local — comandos em ordem

Execute todos os comandos abaixo na **raiz do repositório**, a pasta `turing-dapp`, onde está o `hardhat.config.js`.

É necessário ter Node.js, npm e uma carteira Ethereum no navegador, como MetaMask. O ambiente foi validado com Node.js `20.20.2`.

### 1. Instalar as dependências

Na primeira execução, ou quando os arquivos de dependências forem atualizados:

```bash
npm ci
npm ci --prefix frontend
```

### 2. Terminal 1: iniciar a blockchain local

```bash
npx hardhat node
```

**Mantenha esse terminal aberto.** A rede fica disponível em `http://127.0.0.1:8545`. O Hardhat mostra as contas de desenvolvimento e suas chaves privadas; essas contas já possuem ETH simulado para pagar as taxas locais.

### 3. Terminal 2: implantar o contrato Turing

Abra outro terminal na raiz do repositório e execute:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Aguarde a mensagem com o endereço do contrato e a confirmação da exportação. Esse comando compila e implanta Turing e gera os arquivos que conectam o frontend ao contrato:

```text
frontend/src/contracts/Turing.json
frontend/src/contracts/contract-address.json
```

Não é necessário copiar a ABI ou o endereço manualmente. Esses arquivos são gerados localmente e ignorados pelo Git.

### 4. Terminal 3: iniciar o frontend

Abra mais um terminal na raiz do repositório e execute:

```bash
npm start --prefix frontend
```

**Mantenha esse terminal aberto.** Acesse o endereço informado pelo Vite, normalmente `http://localhost:5173`. Se a porta estiver ocupada, use a URL que aparecer no terminal.

### 5. Conectar a carteira

Clique em **Conectar carteira** na aplicação. A interface pode solicitar a troca para a rede local do Hardhat. Para configurar a rede manualmente, use:

| Campo | Valor |
| --- | --- |
| Nome | Hardhat Local |
| RPC | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Moeda | `ETH` |

Importe na carteira uma conta de desenvolvimento exibida pelo Hardhat no terminal 1. As contas padrão correspondentes aos codinomes `nome1` a `nome5` podem votar; a conta que fez o deploy é o owner e pode administrar a votação.

A carteira do owner também precisa estar cadastrada como usuário para votar. A professora é identificada pelo endereço associado a `roberta` no contrato.

A confirmação do voto mostra uma taxa em ETH, mesmo que a operação gere TUR. Na rede local, esse ETH é simulado; não é necessário usar um faucet de Sepolia.

## Nas próximas execuções

- **Encerrou apenas o frontend:** repita o passo 4. A blockchain e o contrato continuam disponíveis enquanto o terminal 1 estiver aberto.
- **Encerrou a blockchain:** repita os passos 2, 3 e 4, encerrando o frontend anterior antes de iniciá-lo novamente. Ao reiniciar o nó, os votos, saldos e alterações de cadastro da execução anterior são perdidos.
- **Alterou somente arquivos do frontend:** salve os arquivos; o Vite normalmente atualiza a página automaticamente.
- **Alterou o contrato:** repita o passo 3 e reinicie o frontend para carregar a ABI e o endereço exportados. O novo deploy cria uma nova instância do contrato, sem os dados da anterior.

## Build do frontend — opcional

Depois do deploy do contrato, para gerar e visualizar a versão de produção localmente:

```bash
npm run build --prefix frontend
npm run serve --prefix frontend
```

A saída é gerada em `frontend/build`. Abra a URL mostrada pelo comando `serve`. A blockchain do terminal 1 também precisa permanecer ativa para a aplicação consultar o contrato e enviar transações.

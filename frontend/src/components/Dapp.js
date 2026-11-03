import { ethers } from "ethers";
import React from "react";
import { HARDHAT_CHAIN_ID, POLLING_INTERVAL, TEACHER_CODENAME } from "../config";
import TuringArtifact from "../contracts/Turing.json";
import contractAddress from "../contracts/contract-address.json";
import { getErrorMessage, readTuringState, sameAddress, validateQuantity } from "../turing";
import "./Dapp.css";
import { TuringForm } from "./TuringForm";

// O componente mantém a carteira, os dados do contrato e o ciclo das transações.
// Os formulários representam vote/issueToken; o ranking vem de balanceOf().
export class Dapp extends React.Component {
  constructor(props) {
    super(props);
    this.initialState = {
      selectedAddress: undefined,
      tokenData: undefined,
      snapshot: undefined,
      isConnecting: false,
      isLoading: false,
      networkError: undefined,
      readError: undefined,
      transactionError: undefined,
      pendingAction: undefined,
      txBeingSent: undefined,
      successMessage: undefined,
    };
    this.state = { ...this.initialState };
    this._session = 0;
    this._readId = 0;
  }

  componentDidMount() {
    this._mounted = true;
    this._wallet = window.ethereum;
    if (!this._wallet) return;

    // Os listeners são registrados uma vez e removidos ao desmontar o componente.
    // Trocar conta/rede invalida as leituras antigas antes de recalcular o perfil.
    this._wallet.on?.("accountsChanged", this._handleAccountsChanged);
    this._wallet.on?.("chainChanged", this._handleChainChanged);
    this._wallet.on?.("disconnect", this._handleDisconnect);
    this._restoreConnection();
  }

  componentWillUnmount() {
    this._mounted = false;
    this._session++;
    this._stopPollingData();
    this._wallet?.removeListener?.("accountsChanged", this._handleAccountsChanged);
    this._wallet?.removeListener?.("chainChanged", this._handleChainChanged);
    this._wallet?.removeListener?.("disconnect", this._handleDisconnect);
  }

  _isCurrentSession = (session) => this._mounted && session === this._session;

  _resetState = () => {
    this._session++;
    this._stopPollingData();
    this._contract = undefined;
    if (this._mounted) this.setState({ ...this.initialState });
  };

  _handleAccountsChanged = (accounts) => {
    if (accounts[0]) this._initialize(accounts[0]);
    else this._resetState();
  };

  _handleChainChanged = () => this._restoreConnection();
  _handleDisconnect = () => this._resetState();

  _restoreConnection = async () => {
    this._resetState();
    const session = this._session;
    try {
      // eth_accounts recupera uma autorização existente sem abrir a carteira.
      const accounts = await this._wallet.request({ method: "eth_accounts" });
      if (this._isCurrentSession(session) && accounts[0]) await this._initialize(accounts[0]);
    } catch (error) {
      if (this._isCurrentSession(session)) this.setState({ readError: getErrorMessage(error) });
    }
  };

  _connectWallet = async () => {
    if (this._connecting) return;
    this._connecting = true;
    this.setState({ isConnecting: true, networkError: undefined, readError: undefined });
    try {
      const accounts = await this._wallet.request({ method: "eth_requestAccounts" });
      await this._ensureNetwork();
      if (this._mounted && accounts[0]) await this._initialize(accounts[0]);
    } catch (error) {
      if (this._mounted) this.setState({ networkError: getErrorMessage(error) });
    } finally {
      this._connecting = false;
      if (this._mounted) this.setState({ isConnecting: false });
    }
  };

  _ensureNetwork = async () => {
    const chainId = await this._wallet.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) === parseInt(HARDHAT_CHAIN_ID, 16)) return;
    try {
      await this._wallet.request({
        method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_CHAIN_ID }],
      });
    } catch (error) {
      if (Number(error.code) !== 4902) throw error;
      await this._wallet.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN_ID, chainName: "Hardhat Local",
          rpcUrls: ["http://127.0.0.1:8545"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } }],
      });
      await this._wallet.request({
        method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_CHAIN_ID }],
      });
    }
  };

  _switchNetwork = async () => {
    try {
      await this._ensureNetwork();
      if (this._mounted) await this._restoreConnection();
    } catch (error) {
      if (this._mounted) this.setState({ networkError: getErrorMessage(error) });
    }
  };

  _initialize = async (selectedAddress) => {
    this._stopPollingData();
    const session = ++this._session;
    this._contract = undefined;
    this.setState({ ...this.initialState, selectedAddress, isLoading: true });

    try {
      const chainId = await this._wallet.request({ method: "eth_chainId" });
      if (!this._isCurrentSession(session)) return;
      if (parseInt(chainId, 16) !== parseInt(HARDHAT_CHAIN_ID, 16)) {
        this.setState({ isLoading: false, networkError: "Conecte sua carteira à rede local do Hardhat (31337)." });
        return;
      }
      if (!ethers.utils.isAddress(contractAddress.Turing) ||
          sameAddress(contractAddress.Turing, ethers.constants.AddressZero) ||
          contractAddress.chainId !== parseInt(chainId, 16)) {
        throw new Error("Implante o contrato Turing na rede local seguindo o README do frontend.");
      }

      // O frontend usa ethers v5, como o boilerplate. O script de deploy exporta
      // o endereço e a ABI de Turing, evitando conectar por engano ao antigo Token.
      const provider = new ethers.providers.Web3Provider(this._wallet, "any");
      const code = await provider.getCode(contractAddress.Turing);
      if (code === "0x") throw new Error("Contrato não encontrado. Implante Turing novamente após reiniciar a rede local.");
      const contract = new ethers.Contract(
        contractAddress.Turing, TuringArtifact.abi, provider.getSigner(selectedAddress),
      );
      const [name, symbol, snapshot] = await Promise.all([
        contract.name(), contract.symbol(), readTuringState(contract, selectedAddress),
      ]);
      if (!this._isCurrentSession(session)) return;
      this._contract = contract;
      this.setState({ tokenData: { name, symbol }, snapshot, isLoading: false });
      this._startPollingData(session);
    } catch (error) {
      if (this._isCurrentSession(session)) this.setState({ isLoading: false, readError: getErrorMessage(error) });
    }
  };

  // Polling é uma das opções previstas no PDF. Ele atualiza ranking, cadastro e
  // votos inclusive quando outra carteira interage com o contrato. O próximo ciclo
  // só começa após o anterior terminar; a sessão impede resultados de contas antigas.
  _startPollingData = (session) => {
    this._pollDataTimeout = setTimeout(async () => {
      await this._refreshData(session);
      if (this._isCurrentSession(session)) this._startPollingData(session);
    }, POLLING_INTERVAL);
  };

  _stopPollingData = () => clearTimeout(this._pollDataTimeout);

  _refreshData = async (session = this._session) => {
    if (!this._contract || !this._isCurrentSession(session)) return;
    const requestId = ++this._readId;
    const contract = this._contract;
    const address = this.state.selectedAddress;
    try {
      const snapshot = await readTuringState(contract, address);
      if (this._isCurrentSession(session) && requestId === this._readId) {
        this.setState({ snapshot, readError: undefined });
      }
    } catch (error) {
      if (this._isCurrentSession(session) && requestId === this._readId) {
        this.setState({ readError: getErrorMessage(error) });
      }
    }
  };

  _submitTokens = (isVote, codename, value) => {
    try {
      const { snapshot, selectedAddress } = this.state;
      const student = snapshot.students.find((user) => user.codename === codename);
      if (!student) throw new Error("Selecione um aluno cadastrado.");
      const amount = validateQuantity(value, isVote);
      if (isVote) {
        if (!snapshot.codename) throw new Error("Sua carteira precisa estar cadastrada para votar.");
        if (sameAddress(student.address, selectedAddress)) throw new Error("Você não pode votar no próprio projeto.");
        if (snapshot.votedCodenames.includes(codename)) throw new Error("Você já votou neste projeto.");
      } else if (!snapshot.isSuperuser) {
        throw new Error("Apenas o owner e a professora podem emitir Turings.");
      }
      this._sendTransaction(isVote ? "vote" : "issueToken", [codename, amount],
        isVote ? `Voto em ${codename} confirmado.` : `Emissão de ${amount.toString()} Turings para ${codename} confirmada.`);
    } catch (error) {
      this.setState({ transactionError: getErrorMessage(error), successMessage: undefined });
    }
  };

  _setVoting = (active) => {
    if (!this.state.snapshot?.isSuperuser) return;
    this._sendTransaction(active ? "votingOn" : "votingOff", [],
      active ? "Ativação da votação confirmada." : "Pausa da votação confirmada.");
  };

  _sendTransaction = async (method, args, successMessage) => {
    const session = this._session;
    if (!this._contract || this._pendingSession === session || this.state.readError) return;
    const contract = this._contract;
    this._pendingSession = session;
    this.setState({ pendingAction: method, transactionError: undefined, successMessage: undefined });
    try {
      // A simulação antecipa erros como votação pausada ou voto duplicado. A
      // transação real é validada novamente pelo contrato e exige confirmação na carteira.
      await contract.callStatic[method](...args);
      if (!this._isCurrentSession(session)) return;
      const tx = await contract[method](...args);
      if (this._isCurrentSession(session)) this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      if (receipt.status === 0) throw new Error("A transação falhou. Nenhuma alteração foi aplicada.");
      if (!this._isCurrentSession(session)) return;
      this.setState({ successMessage });
      await this._refreshData(session);
    } catch (error) {
      if (this._isCurrentSession(session)) this.setState({ transactionError: getErrorMessage(error) });
    } finally {
      if (this._pendingSession === session) this._pendingSession = undefined;
      if (this._isCurrentSession(session)) this.setState({ pendingAction: undefined, txBeingSent: undefined });
    }
  };

  render() {
    const { selectedAddress, tokenData, snapshot, isConnecting, isLoading,
      networkError, readError, transactionError, pendingAction, txBeingSent, successMessage } = this.state;
    const disabled = Boolean(pendingAction || readError || networkError);

    return (
      <main className="turing-app">
        <div className="turing-shell">
          <header className="turing-header">
            <div>
              <p className="turing-eyebrow">Projetos da disciplina</p>
              <h1>{tokenData?.name || "Turing"}<span className="turing-dot">.</span></h1>
              <p>Reconheça os projetos da turma com Turings.</p>
            </div>
            <span className="turing-network">Hardhat · rede local</span>
          </header>

          {!window.ethereum ? (
            <section className="turing-card turing-welcome">
              <h2>Conecte sua carteira para participar</h2>
              <p>Instale uma carteira compatível com Ethereum, como MetaMask, e abra esta página novamente.</p>
            </section>
          ) : (
            <>
              {networkError && <div className="alert alert-warning" role="alert">
                <p>{networkError}</p>
                <button className="btn btn-outline-dark" onClick={this._switchNetwork}>Usar rede Hardhat</button>
              </div>}
              {readError && <div className="alert alert-danger" role="alert">
                <p>{readError}</p>
                {selectedAddress && !networkError && <button className="btn btn-outline-dark"
                  onClick={() => this._initialize(selectedAddress)}>Tentar novamente</button>}
              </div>}
              {!selectedAddress && <section className="turing-card turing-welcome">
                <p className="turing-eyebrow">Votação de projetos</p>
                <h2>Cada voto valoriza uma ideia.</h2>
                <p>Conecte uma carteira cadastrada na rede local para votar e acompanhar o ranking da turma.</p>
                <button className="btn turing-primary" disabled={isConnecting} onClick={this._connectWallet}>
                  {isConnecting ? "Conectando…" : "Conectar carteira"}
                </button>
              </section>}
              {isLoading && <p className="turing-card" role="status">Consultando o contrato Turing…</p>}

              {snapshot && <>
                <section className="turing-account turing-card" aria-label="Sua conta">
                  <div>
                    <span className="turing-badge">{snapshot.isSuperuser ? "Superusuário" : snapshot.codename ? "Aluno" : "Não cadastrado"}</span>
                    <h2>{snapshot.codename || (snapshot.isSuperuser ? "Owner" : "Carteira não cadastrada")}</h2>
                    <p className="turing-address">{selectedAddress}</p>
                  </div>
                  <div className="turing-balance"><span>Seu saldo</span>
                    <strong>{snapshot.balance.toString()} <small>{tokenData.symbol}</small></strong>
                  </div>
                </section>

                <div aria-live="polite" className="turing-feedback">
                  {pendingAction && <div className="alert alert-info" role="status">
                    {txBeingSent ? <>Aguardando confirmação da transação <span className="turing-hash">{txBeingSent}</span></>
                      : "Preparando transação. Confirme a solicitação na sua carteira."}
                  </div>}
                  {transactionError && <div className="alert alert-danger" role="alert">{transactionError}</div>}
                  {successMessage && <div className="alert alert-success" role="status">{successMessage}</div>}
                </div>

                {!snapshot.codename && <p className="alert alert-warning">
                  {snapshot.isSuperuser ? "Você pode administrar a votação, mas sua carteira precisa estar cadastrada para votar."
                    : "Esta carteira não está cadastrada. Use uma carteira autorizada para participar da votação."}
                </p>}

                <div className="turing-grid">
                  <div className="turing-actions">
                    {(snapshot.codename || snapshot.isSuperuser) && <section className="turing-card">
                      <p className="turing-eyebrow">Participação</p>
                      <h2>Vote em um projeto</h2>
                      <p>Seu voto cria Turings para o aluno. Você pode votar mesmo com saldo zero.</p>
                      <TuringForm isVote students={snapshot.students} selectedAddress={selectedAddress}
                        votedCodenames={snapshot.votedCodenames} disabled={disabled || !snapshot.codename}
                        onSubmit={(codename, amount) => this._submitTokens(true, codename, amount)} />
                      <p className="turing-footnote">A cada 10 votos válidos, você recebe 1 Turing de recompensa.</p>
                    </section>}

                    {/* Somente owner/professora recebem os controles administrativos do PDF. */}
                    {snapshot.isSuperuser && <section className="turing-card">
                      <p className="turing-eyebrow">Administração</p>
                      <h2>Emitir Turings</h2>
                      <p>Crie tokens sob demanda para um aluno da turma.</p>
                      <TuringForm students={snapshot.students} selectedAddress={selectedAddress}
                        votedCodenames={snapshot.votedCodenames} disabled={disabled}
                        onSubmit={(codename, amount) => this._submitTokens(false, codename, amount)} />
                      <div className="turing-voting-controls">
                        <h3>Controle da votação</h3>
                        <p>Ative a votação para aceitar votos ou pause o recebimento de novos votos.</p>
                        <div className="turing-button-row">
                          <button className="btn btn-outline-dark" disabled={disabled} onClick={() => this._setVoting(true)}>Ativar votação</button>
                          <button className="btn btn-outline-dark" disabled={disabled} onClick={() => this._setVoting(false)}>Pausar votação</button>
                        </div>
                      </div>
                    </section>}
                  </div>

                  <section className="turing-card turing-ranking">
                    <p className="turing-eyebrow">Turma em destaque</p>
                    <h2>Ranking de Turings</h2>
                    <p>Usuários por saldo, do maior para o menor.</p>
                    <div className="table-responsive">
                      <table className="table">
                        <caption className="sr-only">Ranking de usuários por quantidade de Turings</caption>
                        <thead><tr><th scope="col">Posição</th><th scope="col">Codinome</th><th scope="col" className="text-right">TUR</th></tr></thead>
                        <tbody>{snapshot.ranking.map((user, index) => (
                          <tr key={user.codename} className={sameAddress(user.address, selectedAddress) ? "turing-current-user" : undefined}>
                            <td>{index + 1}</td>
                            <th scope="row">{user.codename}
                              {user.codename === TEACHER_CODENAME && <small className="turing-teacher">Professora</small>}
                            </th>
                            <td className="text-right">{user.balance.toString()}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div className="turing-supply"><span>Total emitido</span><strong>{snapshot.totalSupply.toString()} TUR</strong></div>
                    <p className="turing-footnote">Atualização automática a cada 5 segundos e após suas transações.</p>
                  </section>
                </div>
              </>}
            </>
          )}
          <footer className="turing-footer">Turing · Votação dos projetos finais</footer>
        </div>
      </main>
    );
  }
}

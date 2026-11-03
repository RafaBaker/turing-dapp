import { ethers } from "ethers";
import { STUDENT_CODENAMES, TEACHER_CODENAME } from "./config";

export function sameAddress(first, second) {
  return Boolean(first && second && first.toLowerCase() === second.toLowerCase());
}

// Lemos os endereços do contrato em cada atualização: updateUser pode trocar carteiras.
// O perfil vem do cadastro on-chain, e as permissões continuam sendo validadas em Solidity.
export async function readTuringState(contract, selectedAddress) {
  const [owner, users] = await Promise.all([
    contract.owner(),
    Promise.all([...STUDENT_CODENAMES, TEACHER_CODENAME].map(async (codename) => ({
      codename,
      address: await contract.users(codename),
    }))),
  ]);
  const registered = users.filter((user) => !sameAddress(user.address, ethers.constants.AddressZero));
  const currentUser = registered.find((user) => sameAddress(user.address, selectedAddress));
  const teacher = registered.find((user) => user.codename === TEACHER_CODENAME);

  const [ranking, balance, totalSupply, votedCodenames] = await Promise.all([
    Promise.all(registered.map(async (user) => ({
      ...user,
      balance: await contract.balanceOf(user.address),
    }))),
    contract.balanceOf(selectedAddress),
    contract.totalSupply(),
    currentUser ? Promise.all(STUDENT_CODENAMES.map(async (codename) => ({
      codename,
      hasVoted: await contract.hasVoted(currentUser.codename, codename),
    }))) : [],
  ]);

  // BigNumber evita perda de precisão. Não usamos Number nem formatEther nos saldos:
  // a API atual do contrato recebe quantidades inteiras, como os testes de Turing.
  ranking.sort((first, second) => {
    if (first.balance.eq(second.balance)) return first.codename.localeCompare(second.codename);
    return first.balance.gt(second.balance) ? -1 : 1;
  });

  return {
    codename: currentUser?.codename,
    isSuperuser: sameAddress(owner, selectedAddress) || sameAddress(teacher?.address, selectedAddress),
    students: registered.filter((user) => user.codename !== TEACHER_CODENAME),
    ranking,
    balance,
    totalSupply,
    votedCodenames: votedCodenames.filter((vote) => vote.hasVoted).map((vote) => vote.codename),
  };
}

export function validateQuantity(value, isVote) {
  if (!/^\d+$/.test(value)) throw new Error("Informe uma quantidade inteira de Turings.");
  const amount = ethers.BigNumber.from(value);
  if (amount.gt(ethers.constants.MaxUint256)) throw new Error("A quantidade informada é muito grande.");
  if (isVote && (amount.isZero() || amount.gt(2))) {
    throw new Error("Cada voto deve gerar 1 ou 2 Turings.");
  }
  return amount;
}

export function getErrorMessage(error) {
  if (Number(error?.code) === 4001 || error?.code === "ACTION_REJECTED" ||
      Number(error?.error?.code) === 4001) {
    return "Solicitação cancelada na carteira. Nenhuma alteração foi enviada.";
  }
  if (error?.code === "INSUFFICIENT_FUNDS") return "ETH insuficiente para pagar a taxa da transação na rede local.";
  if (error?.code === "TRANSACTION_REPLACED") return "A transação foi substituída ou cancelada na carteira. Confira seu histórico.";
  if (error?.error?.data?.message) return error.error.data.message;
  if (error?.data?.message) return error.data.message;
  if (error?.error?.message) return error.error.message;
  return error?.reason || error?.message || "Não foi possível concluir a operação.";
}

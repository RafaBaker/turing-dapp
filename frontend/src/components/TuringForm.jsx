import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { sameAddress } from "../turing";

export function TuringForm({ isVote, students, selectedAddress, votedCodenames, disabled, onSubmit }) {
  const [codename, setCodename] = useState("");
  const [amount, setAmount] = useState(isVote ? "1" : "10");
  const prefix = isVote ? "vote" : "issue";
  const selected = students.find((student) => student.codename === codename);
  const unavailable = !selected || (isVote && (
    sameAddress(selected.address, selectedAddress) || votedCodenames.includes(codename)
  ));

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onSubmit(codename, amount);
    }}>
      <fieldset disabled={disabled}>
        <div className="form-group">
          <label htmlFor={`${prefix}-student`}>Codinome do aluno</label>
          <select id={`${prefix}-student`} className="form-control" required value={codename}
            onChange={(event) => setCodename(event.target.value)}>
            <option value="">Selecione um aluno</option>
            {students.map((student) => {
              const self = isVote && sameAddress(student.address, selectedAddress);
              const alreadyVoted = isVote && votedCodenames.includes(student.codename);
              return (
                <option key={student.codename} value={student.codename} disabled={self || alreadyVoted}>
                  {student.codename}{self ? " — seu projeto" : alreadyVoted ? " — voto já registrado" : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor={`${prefix}-amount`}>Quantidade de Turings</label>
          <input id={`${prefix}-amount`} className="form-control" type="number" required
            min={isVote ? "1" : "0"} max={isVote ? "2" : undefined} step="1"
            value={amount} onChange={(event) => setAmount(event.target.value)}
            aria-describedby={`${prefix}-help`} />
          <small id={`${prefix}-help`} className="form-text text-muted">
            {isVote ? "Escolha 1 ou 2 Turings. Um voto por projeto, sem votar em si mesmo."
              : "A emissão cria tokens para o aluno, sem descontar do seu saldo."}
          </small>
        </div>
        <Button type="submit" size="lg" disabled={disabled || unavailable}>
          {isVote ? "Registrar voto" : "Emitir Turings"}
        </Button>
      </fieldset>
    </form>
  );
}

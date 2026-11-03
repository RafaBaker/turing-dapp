import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
      <FieldSet disabled={disabled}>
        <FieldLegend className="sr-only">{isVote ? "Votar em um projeto" : "Emitir Turings para um aluno"}</FieldLegend>
        <FieldGroup>
          <Field data-disabled={disabled}>
            <FieldLabel htmlFor={`${prefix}-student`}>Codinome do aluno</FieldLabel>
            <NativeSelect id={`${prefix}-student`} className="w-full" required disabled={disabled} value={codename}
              onChange={(event) => setCodename(event.target.value)}>
              <NativeSelectOption value="">Selecione um aluno</NativeSelectOption>
              {students.map((student) => {
                const self = isVote && sameAddress(student.address, selectedAddress);
                const alreadyVoted = isVote && votedCodenames.includes(student.codename);
                return (
                  <NativeSelectOption key={student.codename} value={student.codename} disabled={self || alreadyVoted}>
                    {student.codename}{self ? " — seu projeto" : alreadyVoted ? " — voto já registrado" : ""}
                  </NativeSelectOption>
                );
              })}
            </NativeSelect>
          </Field>
          <Field data-disabled={disabled}>
            <FieldLabel htmlFor={`${prefix}-amount`}>Quantidade de Turings</FieldLabel>
            <Input id={`${prefix}-amount`} type="number" required disabled={disabled}
              min={isVote ? "1" : "0"} max={isVote ? "2" : undefined} step="1"
              value={amount} onChange={(event) => setAmount(event.target.value)}
              aria-describedby={`${prefix}-help`} />
            <FieldDescription id={`${prefix}-help`}>
              {isVote ? "Escolha 1 ou 2 Turings. Um voto por projeto, sem votar em si mesmo."
                : "A emissão cria tokens para o aluno, sem descontar do seu saldo."}
            </FieldDescription>
          </Field>
          <Field>
            <Button type="submit" disabled={disabled || unavailable}>
              {isVote ? "Registrar voto" : "Emitir Turings"}
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

import assert from 'node:assert/strict';
import {actionErrorMessage} from '../src/utils/actionErrorMessage';

const fallback='Não foi possível salvar sua ficha. Confira a conexão e tente novamente.';
for(const error of [null,undefined,new Error('Erro HTTP 500'),new SyntaxError('Unexpected token <'),{message:'duplicate key violates unique constraint',status:409},{message:'Detalhes internos do armazenamento',status:503}])
  assert.equal(actionErrorMessage(error,fallback),fallback);
assert.equal(actionErrorMessage({code:'NETWORK_ERROR',message:'Failed to fetch'},fallback),fallback);
assert.equal(actionErrorMessage({code:'REQUEST_TIMEOUT'},fallback),fallback);
assert.equal(actionErrorMessage({code:'INVALID_RESPONSE',message:'O servidor retornou uma resposta incompleta. Tente novamente.'},fallback),fallback,'An unknown write result must keep the action-specific recovery instruction');
assert.match(actionErrorMessage({status:401,message:'JWT invalid'},fallback),/Entre novamente no FOCO/);
assert.match(actionErrorMessage({status:429,message:'Quota'},fallback),/limite de solicitações/);
for(const message of [
  'As restrições informadas precisam de avaliação individual. Use a montagem manual com orientação profissional.',
  'Não foi possível reservar Panturrilhas no tempo e equipamento disponíveis. Amplie a duração.',
  'Atualize o FOCO e monte uma nova prévia com pelo menos quatro exercícios distintos.',
  'A IA não encontrou exercícios legíveis. Envie uma foto mais nítida.',
]) assert.equal(actionErrorMessage({message,status:409},fallback),message,'Preserve actionable validation and safety instructions');
assert.equal(actionErrorMessage(new Error('O navegador não conseguiu ler o arquivo. Tente novamente.'),fallback),'O navegador não conseguiu ler o arquivo. Tente novamente.');
console.log('ACTION ERROR COPY: transport/storage internals are replaced; validation, safety and recovery instructions preserved.');

for(const failure of [new TypeError("Cannot read properties of undefined"),new SyntaxError("Unexpected end of input"),new ReferenceError("value is not defined")])assert.equal(actionErrorMessage(failure,fallback),fallback);

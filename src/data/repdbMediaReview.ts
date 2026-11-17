/** Editorial hold: no replacement is inferred from a similar movement.
 * Contact-sheet review is a screening, not professional biomechanical approval. */
const holds:Record<string,string>={
 'banded-fire-hydrant':'A imagem final mostra o joelho estendido, enquanto esta variação pede abdução com o joelho flexionado. A ilustração está em revisão.',
 'db-somersault-squat':'A imagem não representa a variação unilateral com passagem da carga à frente do corpo descrita na fonte. A ilustração está em revisão.',
 'dumbbell-wrist-curl':'A fonte descreve flexão de punho com um halter por vez, mas a imagem mostra os dois lados simultaneamente. A ilustração está em revisão.',
 'incline-dumbbell-fly':'O ângulo do banco e o apoio das costas precisam de conferência nesta ilustração. A imagem está em revisão.',
 'single-arm-dumbbell-bench-press':'A fonte pede um halter e a outra mão livre, mas a ilustração mostra carga nas duas mãos. A imagem está em revisão.',
 'single-arm-plate-loaded-lateral-raise':'A ilustração precisa representar apenas um braço trabalhando, como descrito nesta variação. A imagem está em revisão.',
 'single-leg-lying-leg-curl':'É necessário conferir o apoio e a posição da perna livre para esta variação unilateral. A imagem está em revisão.',
 'smith-machine-incline-bench-press':'O banco deve corresponder à inclinação de 30 a 45 graus descrita na fonte. O apoio representado precisa de conferência.',
 'toes-to-bar':'A posição mostrada não leva os pés até a barra, como pede esta variação. A ilustração está em revisão.',
 'weighted-wall-crunch':'O apoio dos pés na parede não está representado de forma clara nesta ilustração. A imagem está em revisão.',
};
export const repdbMediaReview=(id:string|undefined|null):string|null=>id?holds[id]||null:null;
